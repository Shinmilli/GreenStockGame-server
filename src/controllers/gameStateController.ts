// controllers/gameStateController.ts - 완전한 구현
import { Request, Response } from 'express';
import { prisma } from '../models';
import { handleControllerError } from '../utils/errorHandler';

interface GameState {
  currentRound: number;
  phase: 'news' | 'quiz' | 'trading' | 'results' | 'finished';
  timeRemaining: number;
  isActive: boolean;
  startTime?: Date;
  endTime?: Date;
  requiresManualAdvance: boolean;
}

// 메모리에 게임 상태 저장
let gameState: GameState = {
  currentRound: 1,
  phase: 'news',
  timeRemaining: 0,
  isActive: false,
  requiresManualAdvance: false
};

const PHASE_DURATIONS = {
  news: 90000,     // 1.5분 - 뉴스 발표
  quiz: 60000,    // 1분 - 퀴즈
  trading: 300000, // 5분 - 거래  
  results: 60000   // 1분 - 결과 발표
};

let gameTimer: NodeJS.Timeout | null = null;
let timeUpdateInterval: NodeJS.Timeout | null = null;

const getGameState = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      ...gameState,
      phaseDurations: PHASE_DURATIONS
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '게임 상태 조회');
    res.status(statusCode).json({ message });
  }
};

const startGame = async (req: Request, res: Response): Promise<void> => {
  try {
    if (gameState.isActive) {
      res.status(400).json({ message: '게임이 이미 진행 중입니다.' });
      return;
    }

    // 🔥 모든 게임 데이터 완전 초기화
    await prisma.$transaction(async (tx) => {
      // 퀴즈 제출 기록 삭제
      await tx.quizSubmission.deleteMany({});
      
      // 모든 보유 주식 삭제
      await tx.holding.deleteMany({});

      // 모든 거래 기록 삭제  
      await tx.transaction.deleteMany({});

      // 모든 팀 잔액 및 점수 초기화
      await tx.team.updateMany({
        data: {
          balance: 10000, // 초기 자금 1만원
          esgScore: 0,
          quizScore: 0
        }
      });

      // 주식 가격 초기화
      const stockResets = [
        { symbol: 'TESLA', price: 95.0 },
        { symbol: 'BEYOND', price: 42.0 },
        { symbol: 'VESTAS', price: 35.0 },
        { symbol: 'SOLAR', price: 20.0 },
        { symbol: 'RECYCLE', price: 25.0 },
        { symbol: 'AQUA', price: 18.0 },
        { symbol: 'ORGANIC', price: 38.0 },
        { symbol: 'CARBON', price: 45.0 }
      ];

      for (const reset of stockResets) {
        await tx.stock.updateMany({
          where: { symbol: reset.symbol },
          data: { currentPrice: reset.price }
        });
      }
    });

    // 게임 시작
    gameState = {
      currentRound: 1,
      phase: 'news',
      timeRemaining: PHASE_DURATIONS.news,
      isActive: true,
      startTime: new Date(),
      requiresManualAdvance: false
    };

    // 첫 번째 라운드 시작
    await startRound(1);

    res.json({ 
      message: '게임이 시작되었습니다! 라운드 1 뉴스 발표 중...',
      gameState: gameState
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '게임 시작');
    res.status(statusCode).json({ message });
  }
};

const resetGame = async (req: Request, res: Response): Promise<void> => {
  try {
    // 타이머 정리
    if (gameTimer) {
      clearTimeout(gameTimer);
      gameTimer = null;
    }
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
      timeUpdateInterval = null;
    }

    // 게임 상태 초기화
    gameState = {
      currentRound: 1,
      phase: 'news',
      timeRemaining: 0,
      isActive: false,
      requiresManualAdvance: false
    };

    // 🔥 모든 게임 데이터 완전 초기화
    await prisma.$transaction(async (tx) => {
      await tx.quizSubmission.deleteMany({});
      await tx.holding.deleteMany({});
      await tx.transaction.deleteMany({});

      await tx.team.updateMany({
        data: {
          balance: 10000,
          esgScore: 0,
          quizScore: 0
        }
      });

      // 주식 가격 완전 초기화
      const stockResets = [
        { symbol: 'TESLA', price: 95.0 },
        { symbol: 'BEYOND', price: 42.0 },
        { symbol: 'VESTAS', price: 35.0 },
        { symbol: 'SOLAR', price: 20.0 },
        { symbol: 'RECYCLE', price: 25.0 },
        { symbol: 'AQUA', price: 18.0 },
        { symbol: 'ORGANIC', price: 38.0 },
        { symbol: 'CARBON', price: 45.0 }
      ];

      for (const reset of stockResets) {
        await tx.stock.updateMany({
          where: { symbol: reset.symbol },
          data: { currentPrice: reset.price }
        });
      }
    });

    console.log('🔄 게임 완전 초기화 완료');

    res.json({ 
      message: '게임이 완전히 초기화되었습니다.',
      gameState: gameState
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '게임 초기화');
    res.status(statusCode).json({ message });
  }
};

// 🔥 수동 진행 함수 (관리자가 단계를 직접 넘김)
const forceNextPhase = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!gameState.isActive) {
      res.status(400).json({ message: '게임이 진행 중이 아닙니다.' });
      return;
    }

    // 현재 타이머 정리
    clearAllTimers();

    const previousPhase = gameState.phase;
    const previousRound = gameState.currentRound;

    // 다음 페이즈로 강제 이동
    await moveToNextPhase();

    res.json({ 
      message: `${getPhaseKorean(previousPhase)} → ${getPhaseKorean(gameState.phase)}로 수동 이동했습니다.`,
      previous: {
        round: previousRound,
        phase: previousPhase
      },
      current: {
        round: gameState.currentRound,
        phase: gameState.phase,
        timeRemaining: gameState.timeRemaining,
        requiresManualAdvance: gameState.requiresManualAdvance
      },
      gameState: gameState
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '페이즈 강제 이동');
    res.status(statusCode).json({ message });
  }
};

// 🔥 다음 라운드 시작 함수 (관리자가 라운드를 수동으로 넘김)
const startNextRound = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!gameState.isActive) {
      res.status(400).json({ message: '게임이 진행 중이 아닙니다.' });
      return;
    }

    if (gameState.phase !== 'results' || !gameState.requiresManualAdvance) {
      res.status(400).json({ 
        message: '다음 라운드를 시작할 수 있는 상태가 아닙니다.',
        currentPhase: gameState.phase,
        requiresManualAdvance: gameState.requiresManualAdvance,
        hint: 'results 단계에서 requiresManualAdvance가 true일 때만 가능합니다.'
      });
      return;
    }

    if (gameState.currentRound >= 8) {
      res.status(400).json({ message: '이미 마지막 라운드입니다.' });
      return;
    }

    // 다음 라운드 시작
    await startRound(gameState.currentRound + 1);

    res.json({
      message: `라운드 ${gameState.currentRound} 시작! 뉴스 발표 중...`,
      gameState: gameState
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '다음 라운드 시작');
    res.status(statusCode).json({ message });
  }
};

// 내부 함수들
async function startRound(roundNumber: number) {
  console.log(`🎮 라운드 ${roundNumber} 시작 - 뉴스 발표 단계`);
  
  gameState.currentRound = roundNumber;
  gameState.phase = 'news';
  gameState.timeRemaining = PHASE_DURATIONS.news;
  gameState.requiresManualAdvance = false;

  // 해당 라운드의 뉴스 이벤트 활성화
  await activateRoundEvents(roundNumber);

  // 🔥 뉴스 단계만 자동 진행, 나머지는 수동
  startPhaseTimer();
}

function startPhaseTimer() {
  clearAllTimers();
  
  const duration = gameState.timeRemaining;
  
  // 메인 타이머 (단계 종료)
  gameTimer = setTimeout(async () => {
    if (gameState.phase === 'news') {
      // 뉴스 단계만 자동으로 퀴즈로 넘어감
      console.log('📰 뉴스 시간 종료 - 자동으로 퀴즈 단계로 이동');
      await moveToNextPhase();
    } else {
      // 다른 단계는 수동 진행 대기
      console.log(`⏸️ ${gameState.phase} 시간 종료 - 관리자 수동 진행 대기`);
      gameState.timeRemaining = 0;
      gameState.requiresManualAdvance = true;
    }
  }, duration);

  // 시간 업데이트 타이머 (1초마다)
  timeUpdateInterval = setInterval(() => {
    if (gameState.timeRemaining > 0) {
      gameState.timeRemaining -= 1000;
    } else {
      clearInterval(timeUpdateInterval!);
      timeUpdateInterval = null;
    }
  }, 1000);
}

function clearAllTimers() {
  if (gameTimer) {
    clearTimeout(gameTimer);
    gameTimer = null;
  }
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  }
}

async function moveToNextPhase() {
  console.log(`📍 현재 페이즈: ${gameState.phase}, 라운드: ${gameState.currentRound}`);

  switch (gameState.phase) {
    case 'news':
      // 뉴스 → 퀴즈
      gameState.phase = 'quiz';
      gameState.timeRemaining = PHASE_DURATIONS.quiz;
      gameState.requiresManualAdvance = false;
      console.log(`📝 퀴즈 단계 시작 (${PHASE_DURATIONS.quiz / 1000}초)`);
      startPhaseTimer(); // 퀴즈도 타이머 시작하지만 수동 진행으로 대기
      break;

    case 'quiz':
      // 퀴즈 → 거래
      gameState.phase = 'trading';
      gameState.timeRemaining = PHASE_DURATIONS.trading;
      gameState.requiresManualAdvance = false;
      console.log(`💼 거래 단계 시작 (${PHASE_DURATIONS.trading / 1000}초)`);
      startPhaseTimer();
      break;

    case 'trading':
      // 거래 → 결과
      gameState.phase = 'results';
      gameState.timeRemaining = PHASE_DURATIONS.results;
      gameState.requiresManualAdvance = false;
      await calculateRoundResults();
      console.log(`📊 결과 발표 단계 (${PHASE_DURATIONS.results / 1000}초)`);
      startPhaseTimer();
      break;

    case 'results':
      // 🔥 결과 → 다음 라운드 or 게임 종료 (관리자 수동 진행 필요)
      if (gameState.currentRound >= 8) {
        // 게임 종료
        gameState.phase = 'finished';
        gameState.isActive = false;
        gameState.endTime = new Date();
        gameState.requiresManualAdvance = false;
        clearAllTimers();
        console.log('🏁 게임 종료!');
        return;
      } else {
        // 🔥 다음 라운드는 관리자가 수동으로 시작해야 함
        gameState.requiresManualAdvance = true;
        gameState.timeRemaining = 0;
        clearAllTimers();
        console.log(`⏸️ 라운드 ${gameState.currentRound} 완료 - 관리자가 라운드 ${gameState.currentRound + 1} 시작 대기`);
        return;
      }
  }
}

async function activateRoundEvents(roundNumber: number) {
  try {
    console.log(`🎬 라운드 ${roundNumber} 뉴스 이벤트 적용 시작...`);
    
    // 해당 라운드의 뉴스 이벤트들 조회
    const events = await prisma.newsEvent.findMany({
      where: { 
        roundNumber: roundNumber,
        isActive: true 
      }
    });

    if (events.length === 0) {
      console.warn(`⚠️ 라운드 ${roundNumber}에 적용할 이벤트가 없습니다.`);
      return;
    }

    console.log(`📰 라운드 ${roundNumber}에서 적용할 이벤트: ${events.length}개`);

    // 🔥 각 이벤트를 순차적으로 적용
    for (const event of events) {
      console.log(`📋 이벤트 적용: "${event.title}"`);
      
      const affectedStocks = event.affectedStocks as Record<string, number>;
      
      // 🔥 각 주식을 개별적으로 처리
      for (const [symbol, changePercent] of Object.entries(affectedStocks)) {
        try {
          // 현재 주식 정보 조회
          const currentStock = await prisma.stock.findFirst({
            where: { symbol: symbol }
          });
          
          if (!currentStock) {
            console.error(`❌ 주식을 찾을 수 없음: ${symbol}`);
            continue;
          }

          const currentPrice = Number(currentStock.currentPrice);
          const changeMultiplier = 1 + (changePercent / 100);
          const newPrice = currentPrice * changeMultiplier;
          const finalPrice = Math.max(1, Math.round(newPrice * 100) / 100);
          
          console.log(`📈 ${symbol} 가격 계산:`, {
            currentPrice,
            changePercent: `${changePercent}%`,
            changeMultiplier,
            newPrice,
            finalPrice
          });
          
          // 🔥 가격 업데이트
          const updateResult = await prisma.stock.updateMany({
            where: { symbol: symbol },
            data: { currentPrice: finalPrice }
          });
          
          console.log(`✅ ${symbol} 업데이트 완료:`, {
            이전가격: currentPrice,
            신규가격: finalPrice,
            변화율: `${changePercent}%`,
            업데이트된행수: updateResult.count
          });
          
          // 🔥 업데이트 확인
          const verifyStock = await prisma.stock.findFirst({
            where: { symbol: symbol }
          });
          
          if (verifyStock) {
            const verifiedPrice = Number(verifyStock.currentPrice);
            if (Math.abs(verifiedPrice - finalPrice) > 0.01) {
              console.error(`❌ ${symbol} 가격 업데이트 검증 실패:`, {
                예상가격: finalPrice,
                실제가격: verifiedPrice
              });
            } else {
              console.log(`✅ ${symbol} 가격 업데이트 검증 성공: ${verifiedPrice}`);
            }
          }
          
        } catch (stockError) {
          console.error(`❌ ${symbol} 처리 중 오류:`, stockError);
        }
      }
    }

    console.log(`🎉 라운드 ${roundNumber} 뉴스 이벤트 적용 완료`);
    
    // 🔥 최종 검증: 모든 주식 가격 조회
    const allStocks = await prisma.stock.findMany({
      select: { symbol: true, currentPrice: true }
    });
    
    console.log('📊 이벤트 적용 후 주식 가격:', 
      allStocks.map(s => `${s.symbol}: ${Number(s.currentPrice)}`).join(', ')
    );
    
  } catch (error) {
    console.error(`❌ 라운드 ${roundNumber} 뉴스 이벤트 활성화 오류:`, error);
    throw error;
  }
}

// 🔥 강제 이벤트 재적용 함수 추가
export const reapplyCurrentRoundEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`🔄 현재 라운드 ${gameState.currentRound} 이벤트 재적용 시작`);
    
    await activateRoundEvents(gameState.currentRound);
    
    // 업데이트된 주식 정보 조회
    const updatedStocks = await prisma.stock.findMany({
      orderBy: { symbol: 'asc' },
      select: {
        symbol: true,
        currentPrice: true,
        companyName: true
      }
    });
    
    res.json({
      message: `라운드 ${gameState.currentRound} 이벤트가 재적용되었습니다.`,
      currentRound: gameState.currentRound,
      updatedStocks: updatedStocks.map(stock => ({
        ...stock,
        currentPrice: Number(stock.currentPrice)
      }))
    });
    
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '이벤트 재적용');
    res.status(statusCode).json({ message });
  }
};

async function calculateRoundResults() {
  try {
    // ESG 투자 점수 계산 및 업데이트
    const teams = await prisma.team.findMany({
      include: {
        holdings: {
          include: {
            stock: {
              select: {
                esgCategory: true,
                currentPrice: true,
                symbol: true
              }
            }
          }
        }
      }
    });

    for (const team of teams) {
      // ESG 투자 비중 계산
      const totalInvestment = team.holdings.reduce((sum, holding) => {
        return sum + (Number(holding.stock.currentPrice) * holding.quantity);
      }, 0);

      // ESG 점수 계산 (투자 비중에 따라)
      const esgBonus = Math.floor(totalInvestment / 10000) * 5; // 1만원당 5점

      await prisma.team.update({
        where: { id: team.id },
        data: {
          esgScore: team.esgScore + esgBonus
        }
      });

      console.log(`🌱 ${team.name}: ESG 보너스 +${esgBonus}점 (투자액: ${totalInvestment.toLocaleString()}원)`);
    }
  } catch (error) {
    console.error('라운드 결과 계산 오류:', error);
  }
}

function getPhaseKorean(phase: string): string {
  const phaseMap: Record<string, string> = {
    'news': '뉴스 발표',
    'quiz': '퀴즈 단계',
    'trading': '거래 단계',
    'results': '결과 발표',
    'finished': '게임 종료'
  };
  return phaseMap[phase] || phase;
}

export { 
  gameState,
  getGameState,
  startGame,
  resetGame,
  forceNextPhase,
  startNextRound
};
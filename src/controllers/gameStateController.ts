// controllers/gameStateController.ts
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
}

// 메모리에 게임 상태 저장 (실제로는 Redis나 DB 사용 권장)
let gameState: GameState = {
  currentRound: 1,
  phase: 'news',
  timeRemaining: 0,
  isActive: false
};

const PHASE_DURATIONS = {
  news: 30000,     // 30초 - 뉴스 발표
  quiz: 120000,    // 2분 - 퀴즈
  trading: 300000, // 5분 - 거래
  results: 30000   // 30초 - 결과 발표
};

let gameTimer: NodeJS.Timeout | null = null;

export const getGameState = async (req: Request, res: Response): Promise<void> => {
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

export const startGame = async (req: Request, res: Response): Promise<void> => {
  try {
    if (gameState.isActive) {
      res.status(400).json({ message: '게임이 이미 진행 중입니다.' });
      return;
    }

    // 게임 시작
    gameState = {
      currentRound: 1,
      phase: 'news',
      timeRemaining: PHASE_DURATIONS.news,
      isActive: true,
      startTime: new Date()
    };

    // 첫 번째 라운드 시작
    startRound(1);

    res.json({ 
      message: '게임이 시작되었습니다!',
      gameState: gameState
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '게임 시작');
    res.status(statusCode).json({ message });
  }
};

export const resetGame = async (req: Request, res: Response): Promise<void> => {
  try {
    // 타이머 정리
    if (gameTimer) {
      clearTimeout(gameTimer);
      gameTimer = null;
    }

    // 게임 상태 초기화
    gameState = {
      currentRound: 1,
      phase: 'news',
      timeRemaining: 0,
      isActive: false
    };

    // 모든 팀 잔액 및 점수 초기화
    await prisma.team.updateMany({
      data: {
        balance: 100000, // 초기 자금 10만원
        esgScore: 0,
        quizScore: 0
      }
    });

    // 모든 보유 주식 삭제
    await prisma.holding.deleteMany({});

    // 모든 거래 기록 삭제
    await prisma.transaction.deleteMany({});

    res.json({ 
      message: '게임이 초기화되었습니다.',
      gameState: gameState
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '게임 초기화');
    res.status(statusCode).json({ message });
  }
};

export const forceNextPhase = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!gameState.isActive) {
      res.status(400).json({ message: '게임이 진행 중이 아닙니다.' });
      return;
    }

    // 현재 타이머 정리
    if (gameTimer) {
      clearTimeout(gameTimer);
    }

    // 다음 페이즈로 강제 이동
    await moveToNextPhase();

    res.json({ 
      message: '다음 페이즈로 이동했습니다.',
      gameState: gameState
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '페이즈 강제 이동');
    res.status(statusCode).json({ message });
  }
};

// 내부 함수들
async function startRound(roundNumber: number) {
  console.log(`🎮 라운드 ${roundNumber} 시작 - 뉴스 발표 단계`);
  
  gameState.currentRound = roundNumber;
  gameState.phase = 'news';
  gameState.timeRemaining = PHASE_DURATIONS.news;

  // 해당 라운드의 뉴스 이벤트 활성화
  await activateRoundEvents(roundNumber);

  // 타이머 시작
  startPhaseTimer();
}

async function startPhaseTimer() {
  const duration = gameState.timeRemaining;
  
  gameTimer = setTimeout(async () => {
    await moveToNextPhase();
  }, duration);

  // 1초마다 시간 업데이트
  const updateTimer = setInterval(() => {
    if (gameState.timeRemaining > 0) {
      gameState.timeRemaining -= 1000;
    } else {
      clearInterval(updateTimer);
    }
  }, 1000);
}

async function moveToNextPhase() {
  console.log(`📍 현재 페이즈: ${gameState.phase}, 라운드: ${gameState.currentRound}`);

  switch (gameState.phase) {
    case 'news':
      // 뉴스 → 퀴즈
      gameState.phase = 'quiz';
      gameState.timeRemaining = PHASE_DURATIONS.quiz;
      console.log(`📝 퀴즈 단계 시작 (${PHASE_DURATIONS.quiz / 1000}초)`);
      break;

    case 'quiz':
      // 퀴즈 → 거래
      gameState.phase = 'trading';
      gameState.timeRemaining = PHASE_DURATIONS.trading;
      console.log(`💼 거래 단계 시작 (${PHASE_DURATIONS.trading / 1000}초)`);
      break;

    case 'trading':
      // 거래 → 결과
      gameState.phase = 'results';
      gameState.timeRemaining = PHASE_DURATIONS.results;
      await calculateRoundResults();
      console.log(`📊 결과 발표 단계 (${PHASE_DURATIONS.results / 1000}초)`);
      break;

    case 'results':
      // 결과 → 다음 라운드 or 게임 종료
      if (gameState.currentRound >= 8) {
        // 게임 종료
        gameState.phase = 'finished';
        gameState.isActive = false;
        gameState.endTime = new Date();
        console.log('🏁 게임 종료!');
        return;
      } else {
        // 다음 라운드 시작
        await startRound(gameState.currentRound + 1);
        return;
      }
  }

  // 타이머 재시작 (finished가 아닌 경우)
  if (gameState.phase !== 'finished') {
    startPhaseTimer();
  }
}

async function activateRoundEvents(roundNumber: number) {
  try {
    // 해당 라운드의 뉴스 이벤트들 조회
    const events = await prisma.newsEvent.findMany({
      where: { 
        roundNumber: roundNumber,
        isActive: true 
      }
    });

    // 각 이벤트의 주가 영향 적용
    for (const event of events) {
      const affectedStocks = event.affectedStocks as Record<string, number>;
      
      for (const [symbol, changePercent] of Object.entries(affectedStocks)) {
        await prisma.stock.updateMany({
          where: { symbol: symbol },
          data: {
            currentPrice: {
              multiply: 1 + changePercent / 100
            }
          }
        });
        
        console.log(`📈 ${symbol} 주가 ${changePercent > 0 ? '↗️' : '↘️'} ${changePercent}% 변동`);
      }
    }

    console.log(`📰 라운드 ${roundNumber} 뉴스 이벤트 ${events.length}개 적용`);
  } catch (error) {
    console.error('뉴스 이벤트 활성화 오류:', error);
  }
}

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
                currentPrice: true
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

      console.log(`🌱 ${team.name}: ESG 보너스 +${esgBonus}점`);
    }
  } catch (error) {
    console.error('라운드 결과 계산 오류:', error);
  }
}

// WebSocket이나 실시간 업데이트용 (선택사항)
export function broadcastGameState() {
  // 여기서 WebSocket으로 모든 클라이언트에게 게임 상태 전송
  // io.emit('gameStateUpdate', gameState);
}

export { gameState };
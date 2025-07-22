// controllers/tradeController.ts (업데이트됨)
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { GameLogic } from '../models/gameLogic';
import { handleControllerError, validateRequired, validatePositiveNumber } from '../utils/errorHandler';
import { gameState } from './gameStateController';

const prisma = new PrismaClient();

export const executeTrade = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId, stockId, quantity, action } = req.body;

    // 입력 값 검증
    validateRequired(teamId, '팀 ID');
    validateRequired(stockId, '주식 ID');
    validateRequired(quantity, '수량');
    validateRequired(action, '거래 유형');
    
    const validatedQuantity = validatePositiveNumber(quantity, '수량');

    if (action !== 'buy' && action !== 'sell') {
      res.status(400).json({ message: '잘못된 거래 유형입니다. (buy 또는 sell만 허용)' });
      return;
    }

    // 게임 상태 확인
    if (!gameState.isActive) {
      res.status(400).json({ 
        message: '게임이 진행 중이 아닙니다.',
        gameState: {
          isActive: gameState.isActive,
          phase: gameState.phase
        }
      });
      return;
    }

    // 거래 단계인지 확인
    if (gameState.phase !== 'trading') {
      res.status(400).json({ 
        message: `거래 시간이 아닙니다. 현재 단계: ${getPhaseKorean(gameState.phase)}`,
        gameState: {
          phase: gameState.phase,
          timeRemaining: gameState.timeRemaining,
          currentRound: gameState.currentRound
        }
      });
      return;
    }

    // 시간 초과 확인
    if (gameState.timeRemaining <= 0) {
      res.status(400).json({ 
        message: '거래 시간이 초과되었습니다.',
        gameState: {
          phase: gameState.phase,
          timeRemaining: gameState.timeRemaining
        }
      });
      return;
    }

    // 실제 거래 실행
    if (action === 'buy') {
      const result = await GameLogic.buyStock(teamId, stockId, validatedQuantity);
      res.json({ 
        message: '매수 완료',
        action: 'buy',
        teamId: teamId,
        stockId: stockId,
        quantity: validatedQuantity,
        gameState: {
          phase: gameState.phase,
          timeRemaining: gameState.timeRemaining,
          currentRound: gameState.currentRound
        },
        transactionResult: result
      });
    } else {
      const result = await GameLogic.sellStock(teamId, stockId, validatedQuantity);
      res.json({ 
        message: '매도 완료',
        action: 'sell',
        teamId: teamId,
        stockId: stockId,
        quantity: validatedQuantity,
        gameState: {
          phase: gameState.phase,
          timeRemaining: gameState.timeRemaining,
          currentRound: gameState.currentRound
        },
        transactionResult: result
      });
    }
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '거래');
    res.status(statusCode).json({ 
      message,
      gameState: {
        phase: gameState.phase,
        timeRemaining: gameState.timeRemaining,
        currentRound: gameState.currentRound
      }
    });
  }
};

export const getTradeStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const canTrade = gameState.isActive && gameState.phase === 'trading' && gameState.timeRemaining > 0;
    
    res.json({
      canTrade: canTrade,
      gameState: {
        isActive: gameState.isActive,
        phase: gameState.phase,
        phaseKorean: getPhaseKorean(gameState.phase),
        timeRemaining: gameState.timeRemaining,
        currentRound: gameState.currentRound
      },
      restrictions: {
        gameNotActive: !gameState.isActive,
        wrongPhase: gameState.phase !== 'trading',
        timeExpired: gameState.timeRemaining <= 0
      }
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '거래 상태 조회');
    res.status(statusCode).json({ message });
  }
};

interface TradeHistoryItem {
  id: number;
  type: string;
  quantity: number;
  price: Decimal;
  fee: Decimal;
  createdAt: Date;
  team: {
    code: string;
    name: string | null;
  };
  stock: {
    symbol: string;
    companyName: string;
    esgCategory: string;
  };
}

export const getRoundTradeHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { round } = req.params;
    const roundNumber = parseInt(round);

    // 해당 라운드의 거래 기록 조회
    const trades: TradeHistoryItem[] = await prisma.transaction.findMany({
      where: {
        createdAt: {
          // 라운드별 시간 필터링 (실제로는 더 정교한 로직 필요)
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 임시로 24시간 전부터
        }
      },
      include: {
        team: {
          select: {
            code: true,
            name: true
          }
        },
        stock: {
          select: {
            symbol: true,
            companyName: true,
            esgCategory: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // 거래 통계
    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum: number, trade: TradeHistoryItem) => sum + (trade.price.toNumber() * trade.quantity), 0);
    const buyTrades = trades.filter((t: TradeHistoryItem) => t.type === 'BUY').length;
    const sellTrades = trades.filter((t: TradeHistoryItem) => t.type === 'SELL').length;

    res.json({
      roundNumber,
      trades: trades.map(trade => ({
        ...trade,
        price: trade.price.toNumber(),
        fee: trade.fee.toNumber()
      })),
      statistics: {
        totalTrades,
        totalVolume,
        buyTrades,
        sellTrades,
        averageTradeSize: totalTrades > 0 ? totalVolume / totalTrades : 0
      }
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '라운드 거래 기록 조회');
    res.status(statusCode).json({ message });
  }
};

// 헬퍼 함수
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
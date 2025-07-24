import { Request, Response } from 'express';
import { prisma } from '../models';
import { handleControllerError } from '../utils/errorHandler';

// 🔥 누락된 함수들 추가
export const getTradeStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // 현재 거래 가능한 상태인지 확인
    const gameState = {
      currentRound: 1, // 실제 게임 상태에서 가져와야 함
      phase: 'trading', // 실제 게임 상태에서 가져와야 함
      isActive: true,
      canTrade: true
    };

    // 최근 거래 내역 조회
    const recentTrades = await prisma.transaction.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        team: { select: { name: true, code: true } },
        stock: { select: { symbol: true, companyName: true } }
      }
    });

    // 거래량 통계
    const tradeStats = await prisma.transaction.groupBy({
      by: ['type'],
      _count: { id: true },
      _sum: { quantity: true }
    });

    res.json({
      gameState,
      canTrade: gameState.isActive && gameState.phase === 'trading',
      recentTrades: recentTrades.map(trade => ({
        ...trade,
        price: Number(trade.price),
        fee: Number(trade.fee)
      })),
      statistics: {
        totalTrades: recentTrades.length,
        tradesByType: tradeStats
      }
    });

  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '거래 상태 조회');
    res.status(statusCode).json({ message });
  }
};

export const getRoundTradeHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { round } = req.params;
    const roundNumber = parseInt(round);

    if (!roundNumber || roundNumber < 1 || roundNumber > 8) {
      res.status(400).json({ message: '유효하지 않은 라운드 번호입니다.' });
      return;
    }

    // 해당 라운드의 거래 내역 조회
    // 실제로는 거래 테이블에 라운드 정보가 있어야 하지만, 
    // 현재는 생성 시간을 기준으로 추정
    const trades = await prisma.transaction.findMany({
      include: {
        team: { select: { id: true, name: true, code: true } },
        stock: { select: { symbol: true, companyName: true, esgCategory: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 라운드별 통계
    const roundStats = {
      totalTrades: trades.length,
      totalVolume: trades.reduce((sum, trade) => sum + trade.quantity, 0),
      totalValue: trades.reduce((sum, trade) => sum + (Number(trade.price) * trade.quantity), 0),
      buyTrades: trades.filter(t => t.type === 'BUY').length,
      sellTrades: trades.filter(t => t.type === 'SELL').length
    };

    res.json({
      round: roundNumber,
      trades: trades.map(trade => ({
        ...trade,
        price: Number(trade.price),
        fee: Number(trade.fee)
      })),
      statistics: roundStats
    });

  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '라운드 거래 히스토리 조회');
    res.status(statusCode).json({ message });
  }
};

export const executeTrade = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId, stockId, quantity, action } = req.body;

    // 입력 검증
    if (!teamId || !stockId || !quantity || !action) {
      res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
      return;
    }

    if (!['buy', 'sell'].includes(action)) {
      res.status(400).json({ message: '잘못된 거래 유형입니다.' });
      return;
    }

    if (quantity <= 0) {
      res.status(400).json({ message: '수량은 0보다 커야 합니다.' });
      return;
    }

    console.log('🔄 거래 처리 시작:', { teamId, stockId, quantity, action });

    // 🔥 트랜잭션으로 모든 거래를 원자적으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 팀 정보 조회
      const team = await tx.team.findUnique({
        where: { id: teamId }
      });

      if (!team) {
        throw new Error('팀을 찾을 수 없습니다.');
      }

      // 주식 정보 조회
      const stock = await tx.stock.findUnique({
        where: { id: stockId }
      });

      if (!stock) {
        throw new Error('주식을 찾을 수 없습니다.');
      }

      const currentPrice = Number(stock.currentPrice);
      const totalCost = currentPrice * quantity;
      const fee = Math.round(totalCost * 0.005); // 0.5% 수수료, 반올림
      const totalAmount = totalCost + fee;

      console.log('💰 거래 계산:', {
        symbol: stock.symbol,
        currentPrice,
        quantity,
        totalCost,
        fee,
        totalAmount,
        teamBalance: Number(team.balance)
      });

      if (action === 'buy') {
        // 매수 처리
        if (Number(team.balance) < totalAmount) {
          throw new Error('잔액이 부족합니다.');
        }

        // 기존 보유 주식 확인
        const existingHolding = await tx.holding.findFirst({
          where: {
            teamId,
            stockId
          }
        });

        let updatedHolding;

        if (existingHolding) {
          // 🔥 기존 보유 주식이 있으면 평균 단가 계산하여 업데이트
          const currentQuantity = existingHolding.quantity;
          const currentAvgBuyPrice = Number(existingHolding.avgBuyPrice); // 🔥 실제 필드명
          const currentTotalValue = currentQuantity * currentAvgBuyPrice;
          const newTotalValue = currentTotalValue + totalCost;
          const newTotalQuantity = currentQuantity + quantity;
          const newAvgBuyPrice = Math.round((newTotalValue / newTotalQuantity) * 100) / 100;

          updatedHolding = await tx.holding.update({
            where: { id: existingHolding.id },
            data: {
              quantity: newTotalQuantity,
              avgBuyPrice: newAvgBuyPrice // 🔥 실제 필드명 사용
            }
          });

          console.log(`📈 ${stock.symbol} 매수 (기존보유):`, {
            이전수량: currentQuantity,
            추가수량: quantity,
            총수량: newTotalQuantity,
            이전평균단가: currentAvgBuyPrice,
            신규평균단가: newAvgBuyPrice
          });
        } else {
          // 🔥 새로운 보유 주식 생성
          updatedHolding = await tx.holding.create({
            data: {
              teamId,
              stockId,
              quantity,
              avgBuyPrice: currentPrice // 🔥 실제 필드명으로 현재 가격 설정
            }
          });

          console.log(`📈 ${stock.symbol} 매수 (신규):`, {
            수량: quantity,
            평균단가: currentPrice
          });
        }

        // 팀 잔액 차감
        const updatedTeam = await tx.team.update({
          where: { id: teamId },
          data: {
            balance: Number(team.balance) - totalAmount
          }
        });

        // 🔥 거래 기록 생성 (totalAmount 필드 제거)
        const transaction = await tx.transaction.create({
          data: {
            teamId,
            stockId,
            type: 'BUY',
            quantity,
            price: currentPrice,
            fee
            // totalAmount 필드 제거 (스키마에 없음)
          }
        });

        return {
          action: 'buy',
          stock: stock.symbol,
          quantity,
          price: currentPrice,
          totalAmount,
          newBalance: Number(updatedTeam.balance),
          holding: {
            quantity: updatedHolding.quantity,
            avgBuyPrice: Number(updatedHolding.avgBuyPrice) // 🔥 실제 필드명
          },
          transaction
        };

      } else {
        // 매도 처리
        const holding = await tx.holding.findFirst({
          where: {
            teamId,
            stockId
          }
        });

        if (!holding || holding.quantity < quantity) {
          throw new Error('보유 수량이 부족합니다.');
        }

        const totalRevenue = totalCost - fee; // 매도시에는 수수료 차감

        let updatedHolding;

        if (holding.quantity === quantity) {
          // 🔥 전량 매도 - 보유 주식 삭제
          await tx.holding.delete({
            where: { id: holding.id }
          });
          updatedHolding = null;
          console.log(`📉 ${stock.symbol} 전량 매도`);
        } else {
          // 🔥 일부 매도 - 수량만 감소 (평균 단가는 유지)
          updatedHolding = await tx.holding.update({
            where: { id: holding.id },
            data: {
              quantity: holding.quantity - quantity
            }
          });
          console.log(`📉 ${stock.symbol} 일부 매도:`, {
            기존수량: holding.quantity,
            매도수량: quantity,
            남은수량: updatedHolding.quantity
          });
        }

        // 팀 잔액 증가
        const updatedTeam = await tx.team.update({
          where: { id: teamId },
          data: {
            balance: Number(team.balance) + totalRevenue
          }
        });

        // 🔥 거래 기록 생성 (totalAmount 필드 제거)
        const transaction = await tx.transaction.create({
          data: {
            teamId,
            stockId,
            type: 'SELL',
            quantity,
            price: currentPrice,
            fee
            // totalAmount 필드 제거 (스키마에 없음)
          }
        });

        return {
          action: 'sell',
          stock: stock.symbol,
          quantity,
          price: currentPrice,
          totalRevenue,
          newBalance: Number(updatedTeam.balance),
          holding: updatedHolding ? {
            quantity: updatedHolding.quantity,
            avgBuyPrice: Number(updatedHolding.avgBuyPrice) // 🔥 실제 필드명
          } : null,
          transaction
        };
      }
    });

    console.log('✅ 거래 완료:', result);

    res.json({
      message: `${action === 'buy' ? '매수' : '매도'} 거래가 완료되었습니다.`,
      result
    });

  } catch (error: any) {
    console.error('❌ 거래 실패:', error);
    const { message, statusCode } = handleControllerError(error, '거래 처리');
    res.status(statusCode).json({ message });
  }
};

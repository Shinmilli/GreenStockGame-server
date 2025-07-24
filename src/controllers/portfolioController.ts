
import { Request, Response } from 'express';
import { prisma } from '../models';
import { handleControllerError } from '../utils/errorHandler';

export const getPortfolioByTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const id = parseInt(teamId);

    if (!id || id <= 0) {
      res.status(400).json({ message: '유효하지 않은 팀 ID입니다.' });
      return;
    }

    console.log(`🔍 포트폴리오 조회 시작 - 팀 ID: ${id}`);

    // 팀 정보 조회
    const team = await prisma.team.findUnique({
      where: { id }
    });
    
    if (!team) {
      res.status(404).json({ message: '팀을 찾을 수 없습니다.' });
      return;
    }

    // 🔥 보유 주식 조회 - avgBuyPrice 필드 사용 (실제 스키마)
    const holdings = await prisma.holding.findMany({
      where: { 
        teamId: id,
        quantity: { gt: 0 } // 수량이 0보다 큰 것만
      },
      include: {
        stock: {
          select: {
            symbol: true,
            companyName: true,
            currentPrice: true,
            esgCategory: true
          }
        }
      },
      orderBy: {
        stock: {
          symbol: 'asc'
        }
      }
    });

    console.log(`📊 조회된 holdings:`, holdings.map(h => ({
      symbol: h.stock.symbol,
      quantity: h.quantity,
      avgBuyPrice: Number(h.avgBuyPrice), // 🔥 실제 필드명 사용
      currentPrice: Number(h.stock.currentPrice)
    })));

    // 포트폴리오 가치 계산
    let totalValue = 0;
    let totalCost = 0;
    
    const enrichedHoldings = holdings.map(holding => {
      const currentPrice = Number(holding.stock.currentPrice);
      const avgBuyPrice = Number(holding.avgBuyPrice); // 🔥 실제 필드명 사용
      const quantity = holding.quantity;
      
      const currentValue = currentPrice * quantity;
      const totalCostForHolding = avgBuyPrice * quantity;
      const profitLoss = currentValue - totalCostForHolding;
      const profitLossPercent = totalCostForHolding > 0 ? (profitLoss / totalCostForHolding) * 100 : 0;
      
      totalValue += currentValue;
      totalCost += totalCostForHolding;
      
      console.log(`📈 ${holding.stock.symbol} 계산:`, {
        quantity,
        avgBuyPrice,
        currentPrice,
        currentValue,
        totalCostForHolding,
        profitLoss,
        profitLossPercent
      });
      
      return {
        id: holding.id,
        stockId: holding.stockId,
        quantity: quantity,
        avgBuyPrice: avgBuyPrice, // 🔥 실제 필드명 사용
        averagePrice: avgBuyPrice, // 🔥 클라이언트 호환성을 위해 추가
        currentValue: currentValue,
        totalCost: totalCostForHolding,
        profitLoss: profitLoss,
        profitLossPercent: profitLossPercent,
        profit: profitLoss, // 🔥 클라이언트 호환성
        stock: {
          ...holding.stock,
          currentPrice: currentPrice
        }
      };
    });

    // 거래 히스토리 조회 (최근 10건)
    const transactions = await prisma.transaction.findMany({
      where: { teamId: id },
      include: {
        stock: {
          select: {
            symbol: true,
            companyName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const portfolioData = {
      team: {
        id: team.id,
        code: team.code,
        name: team.name,
        balance: Number(team.balance),
        esgScore: team.esgScore,
        quizScore: team.quizScore
      },
      holdings: enrichedHoldings,
      portfolioValue: totalValue,
      totalCost: totalCost,
      totalValue: totalValue + Number(team.balance),
      totalInvestment: totalCost, // 🔥 클라이언트 호환성
      profitLoss: totalValue - totalCost,
      totalProfit: totalValue - totalCost, // 🔥 클라이언트 호환성
      profitLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      profitPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0, // 🔥 클라이언트 호환성
      balance: Number(team.balance),
      recentTransactions: transactions.map(tx => ({
        ...tx,
        price: Number(tx.price),
        fee: Number(tx.fee)
      }))
    };

    console.log('✅ 포트폴리오 조회 완료:', {
      teamId: id,
      teamName: team.name,
      balance: Number(team.balance),
      holdingsCount: enrichedHoldings.length,
      totalValue: totalValue,
      totalProfit: totalValue - totalCost
    });

    res.json(portfolioData);
    
  } catch (error) {
    console.error('❌ 포트폴리오 조회 실패:', error);
    const { message, statusCode } = handleControllerError(error, '포트폴리오 조회');
    res.status(statusCode).json({ message });
  }
};
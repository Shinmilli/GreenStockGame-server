import { Request, Response } from 'express';
import { prisma } from '../models';
import { handleControllerError } from '../utils/errorHandler';

export const getPortfolioByTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;

    // 팀 정보 조회
    const team = await prisma.team.findUnique({
      where: { id: parseInt(teamId) }
    });
    
    if (!team) {
      res.status(404).json({ message: '팀을 찾을 수 없습니다.' });
      return;
    }

    // 보유 주식 조회
    const holdings = await prisma.holding.findMany({
      where: { teamId: parseInt(teamId) },
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

    // 포트폴리오 가치 계산
    let totalValue = 0;
    let totalCost = 0;
    
    const enrichedHoldings = holdings.map(holding => {
      const currentValue = Number(holding.stock.currentPrice) * holding.quantity;
      const totalCostForHolding = Number(holding.avgBuyPrice) * holding.quantity;
      const profitLoss = currentValue - totalCostForHolding;
      const profitLossPercent = totalCostForHolding > 0 ? (profitLoss / totalCostForHolding) * 100 : 0;
      
      totalValue += currentValue;
      totalCost += totalCostForHolding;
      
      return {
        id: holding.id,
        stockId: holding.stockId,
        quantity: holding.quantity,
        avgBuyPrice: Number(holding.avgBuyPrice),
        currentValue: currentValue,
        totalCost: totalCostForHolding,
        profitLoss: profitLoss,
        profitLossPercent: profitLossPercent,
        stock: holding.stock
      };
    });

    // 거래 히스토리 조회 (최근 10건)
    const transactions = await prisma.transaction.findMany({
      where: { teamId: parseInt(teamId) },
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
      profitLoss: totalValue - totalCost,
      profitLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      balance: Number(team.balance),
      recentTransactions: transactions
    };

    res.json(portfolioData);
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '포트폴리오 조회');
    res.status(statusCode).json({ message });
  }
};
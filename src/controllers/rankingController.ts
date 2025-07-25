import { Request, Response } from 'express';
import { prisma } from '../models';
import { handleControllerError } from '../utils/errorHandler';

export const getRanking = async (req: Request, res: Response): Promise<void> => {
  try {
    // 모든 팀의 포트폴리오 가치 계산
    const teams = await prisma.team.findMany({
      include: {
        holdings: {
          include: {
            stock: {
              select: {
                currentPrice: true
              }
            }
          }
        }
      }
    });

    const rankings = teams.map(team => {
      // 포트폴리오 가치 계산
      const portfolioValue = team.holdings.reduce((total, holding) => {
        return total + (Number(holding.stock.currentPrice) * holding.quantity);
      }, 0);

      // 투자 비용 계산
      const totalCost = team.holdings.reduce((total, holding) => {
        return total + (Number(holding.avgBuyPrice) * holding.quantity);
      }, 0);

      const balance = Number(team.balance);
      const totalValue = portfolioValue + balance;
      const profitLoss = portfolioValue - totalCost;
      
      // ESG 점수 계산 (투자 비중에 따른 가중치)
      const esgWeight = portfolioValue > 0 ? (portfolioValue / 10000) * 50 : 0;
      const totalScore = team.esgScore + team.quizScore + esgWeight;

      return {
        id: team.id,
        code: team.code,
        name: team.name,
        balance: balance,
        portfolioValue: portfolioValue,
        totalValue: totalValue,
        profitLoss: profitLoss,
        profitLossPercent: totalCost > 0 ? (profitLoss / totalCost) * 100 : 0,
        esgScore: team.esgScore,
        quizScore: team.quizScore,
        totalScore: Math.round(totalScore),
        rank: 0 // 아래에서 계산
      };
    });

    // 총 점수 기준으로 정렬 및 순위 부여
    rankings.sort((a, b) => b.totalScore - a.totalScore);
    rankings.forEach((team, index) => {
      team.rank = index + 1;
    });

    res.json(rankings);
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '랭킹 조회');
    res.status(statusCode).json({ message });
  }
};
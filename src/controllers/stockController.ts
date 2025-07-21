import { Request, Response } from 'express';
import { prisma } from '../models';
import { handleControllerError } from '../utils/errorHandler';

export const getAllStocks = async (req: Request, res: Response): Promise<void> => {
  try {
    const stocks = await prisma.stock.findMany({
      orderBy: { symbol: 'asc' },
      select: {
        id: true,
        symbol: true,
        companyName: true,
        currentPrice: true,
        esgCategory: true,
        description: true,
        createdAt: true
      }
    });

    // Decimal을 number로 변환
    const formattedStocks = stocks.map(stock => ({
      ...stock,
      currentPrice: Number(stock.currentPrice)
    }));

    res.json(formattedStocks);
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '주식 조회');
    res.status(statusCode).json({ message });
  }
};

export const getStockHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stockId } = req.params;

    const transactions = await prisma.transaction.findMany({
      where: { stockId: parseInt(stockId) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        stock: {
          select: {
            symbol: true,
            companyName: true
          }
        },
        team: {
          select: {
            code: true,
            name: true
          }
        }
      }
    });

    // Decimal을 number로 변환
    const formattedTransactions = transactions.map(transaction => ({
      ...transaction,
      price: Number(transaction.price),
      fee: Number(transaction.fee)
    }));

    res.json(formattedTransactions);
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '주식 히스토리 조회');
    res.status(statusCode).json({ message });
  }
};
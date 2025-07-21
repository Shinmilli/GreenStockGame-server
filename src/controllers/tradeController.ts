import { Request, Response } from 'express';
import { GameLogic } from '../models/gameLogic';
import { handleControllerError, validateRequired, validatePositiveNumber } from '../utils/errorHandler';

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

    if (action === 'buy') {
      await GameLogic.buyStock(teamId, stockId, validatedQuantity);
      res.json({ 
        message: '매수 완료',
        action: 'buy',
        teamId: teamId,
        stockId: stockId,
        quantity: validatedQuantity
      });
    } else {
      await GameLogic.sellStock(teamId, stockId, validatedQuantity);
      res.json({ 
        message: '매도 완료',
        action: 'sell',
        teamId: teamId,
        stockId: stockId,
        quantity: validatedQuantity
      });
    }
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '거래');
    res.status(statusCode).json({ message });
  }
};
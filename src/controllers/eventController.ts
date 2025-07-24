import { Request, Response } from 'express';
import { prisma } from '../models';
import { handleControllerError } from '../utils/errorHandler';

export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { round } = req.query;
    
    let whereClause: any = { isActive: true };
    
    if (round) {
      whereClause.roundNumber = parseInt(round as string);
    }
    
    const events = await prisma.newsEvent.findMany({
      where: whereClause,
      orderBy: [
        { roundNumber: 'asc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        content: true,
        affectedStocks: true,
        roundNumber: true,
        createdAt: true
      }
    });
    
    res.json(events);
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '뉴스 이벤트 조회');
    res.status(statusCode).json({ message });
  }
};

export const triggerEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, action } = req.body;
    
    if (action === 'trigger') {
      // 뉴스 이벤트를 실제로 적용
      const event = await prisma.newsEvent.findUnique({
        where: { id: eventId }
      });

      if (!event || !event.isActive) {
        res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
        return;
      }

      const affectedStocks = event.affectedStocks as Record<string, number>;
      const updateResults: any[] = [];

      // 🔥 수정: 각 주식을 개별적으로 처리하여 정확한 가격 계산
      for (const [symbol, changePercent] of Object.entries(affectedStocks)) {
        // 현재 주식 정보 조회
        const currentStock = await prisma.stock.findFirst({
          where: { symbol: symbol }
        });
        
        if (currentStock) {
          const currentPrice = Number(currentStock.currentPrice);
          const newPrice = currentPrice * (1 + changePercent / 100);
          const finalPrice = Math.max(1, Math.round(newPrice * 100) / 100); // 최소 1원, 소수점 2자리
          
          // 🔥 수정: multiply 대신 직접 계산된 값 사용
          await prisma.stock.updateMany({
            where: { symbol: symbol },
            data: {
              currentPrice: finalPrice
            }
          });
          
          updateResults.push({
            symbol,
            previousPrice: currentPrice,
            newPrice: finalPrice,
            changePercent,
            changeAmount: finalPrice - currentPrice
          });
          
          console.log(`📈 ${symbol} 주가 업데이트: ${currentPrice} → ${finalPrice} (${changePercent > 0 ? '↗️' : '↘️'} ${changePercent}%)`);
        } else {
          console.warn(`⚠️ 주식을 찾을 수 없음: ${symbol}`);
        }
      }
      
      res.json({
        message: '뉴스 이벤트가 적용되었습니다.',
        affectedStocks: affectedStocks,
        updateResults: updateResults,
        totalUpdated: updateResults.length
      });
      return;
    }
    
    if (action === 'activate') {
      // 뉴스 이벤트 활성화
      await prisma.newsEvent.update({
        where: { id: eventId },
        data: { isActive: true }
      });
      
      res.json({
        message: '뉴스 이벤트가 활성화되었습니다.'
      });
      return;
    }
    
    if (action === 'deactivate') {
      // 뉴스 이벤트 비활성화
      await prisma.newsEvent.update({
        where: { id: eventId },
        data: { isActive: false }
      });
      
      res.json({
        message: '뉴스 이벤트가 비활성화되었습니다.'
      });
      return;
    }
    
    // 잘못된 액션인 경우
    res.status(400).json({ message: '잘못된 액션입니다.' });
    
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '뉴스 이벤트 처리');
    res.status(statusCode).json({ message });
  }
};

// 🔥 새로 추가: 라운드별 이벤트 일괄 적용 함수
export const applyRoundEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roundNumber } = req.params;
    const round = parseInt(roundNumber);
    
    if (!round || round < 1 || round > 8) {
      res.status(400).json({ message: '유효하지 않은 라운드 번호입니다.' });
      return;
    }
    
    // 해당 라운드의 모든 활성 이벤트 조회
    const events = await prisma.newsEvent.findMany({
      where: { 
        roundNumber: round,
        isActive: true 
      }
    });
    
    if (events.length === 0) {
      res.status(404).json({ 
        message: `라운드 ${round}에 적용할 이벤트가 없습니다.` 
      });
      return;
    }
    
    const allUpdateResults: any[] = [];
    
    // 모든 이벤트 순차적으로 적용
    for (const event of events) {
      const affectedStocks = event.affectedStocks as Record<string, number>;
      
      for (const [symbol, changePercent] of Object.entries(affectedStocks)) {
        const currentStock = await prisma.stock.findFirst({
          where: { symbol: symbol }
        });
        
        if (currentStock) {
          const currentPrice = Number(currentStock.currentPrice);
          const newPrice = currentPrice * (1 + changePercent / 100);
          const finalPrice = Math.max(1, Math.round(newPrice * 100) / 100);
          
          await prisma.stock.updateMany({
            where: { symbol: symbol },
            data: {
              currentPrice: finalPrice
            }
          });
          
          allUpdateResults.push({
            eventTitle: event.title,
            symbol,
            previousPrice: currentPrice,
            newPrice: finalPrice,
            changePercent,
            changeAmount: finalPrice - currentPrice
          });
          
          console.log(`📈 [${event.title}] ${symbol}: ${currentPrice} → ${finalPrice} (${changePercent}%)`);
        }
      }
    }
    
    res.json({
      message: `라운드 ${round} 이벤트 ${events.length}개가 모두 적용되었습니다.`,
      eventsApplied: events.length,
      stocksUpdated: allUpdateResults.length,
      updateResults: allUpdateResults
    });
    
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '라운드 이벤트 적용');
    res.status(statusCode).json({ message });
  }
};
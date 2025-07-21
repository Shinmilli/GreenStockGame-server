import express from 'express';
import { getAllStocks, getStockHistory } from '../controllers/stockController';

const router = express.Router();

// 모든 주식 조회
router.get('/', getAllStocks);

// 특정 주식의 거래 히스토리 조회
router.get('/:stockId/history', getStockHistory);

export default router;
import express from 'express';
import { getRanking } from '../controllers/rankingController';

const router = express.Router();

// 실시간 랭킹 조회
router.get('/', getRanking);

export default router;
import express from 'express';
import { getPortfolioByTeam } from '../controllers/portfolioController';

const router = express.Router();

// 팀별 포트폴리오 조회
router.get('/:teamId', getPortfolioByTeam);

export default router;
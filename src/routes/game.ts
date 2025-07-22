// routes/game.ts
import express from 'express';
import { 
  getGameState, 
  startGame, 
  resetGame, 
  forceNextPhase 
} from '../controllers/gameStateController';
import { getQuizResults } from '../controllers/quizController';
import { getTradeStatus, getRoundTradeHistory } from '../controllers/tradeController';

const router = express.Router();

// 게임 상태 관리
router.get('/state', getGameState);
router.post('/start', startGame);
router.post('/reset', resetGame);
router.post('/next-phase', forceNextPhase);

// 거래 상태
router.get('/trade/status', getTradeStatus);
router.get('/trade/history/:round', getRoundTradeHistory);

// 퀴즈 결과
router.get('/quiz/results/:round', getQuizResults);

export default router;
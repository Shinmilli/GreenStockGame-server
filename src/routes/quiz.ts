import express from 'express';
import { getQuizByRound, submitQuizAnswer } from '../controllers/quizController';

const router = express.Router();

// 라운드별 퀴즈 조회
router.get('/:round', getQuizByRound);

// 퀴즈 답안 제출
router.post('/submit', submitQuizAnswer);

export default router;
// routes/quiz.ts (수정됨)
import express from 'express';
import { 
  getQuizByRound, 
  submitQuizAnswer, 
  getQuizResults,
  clearAllQuizSubmissions,     // 🔥 새로 추가
  clearTeamQuizSubmission      // 🔥 새로 추가
} from '../controllers/quizController';

const router = express.Router();

// 라운드별 퀴즈 조회
router.get('/:round', getQuizByRound);

// 퀴즈 답안 제출 (🔥 강제 제출 지원)
router.post('/submit', submitQuizAnswer);

// 퀴즈 결과 조회
router.get('/results/:round', getQuizResults);

// 🔥 새로 추가: 관리자용 엔드포인트들
router.delete('/admin/clear-all', clearAllQuizSubmissions);
router.delete('/admin/teams/:teamId/quiz/:round', clearTeamQuizSubmission);

export default router;
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/quiz.ts (수정됨)
const express_1 = __importDefault(require("express"));
const quizController_1 = require("../controllers/quizController");
const router = express_1.default.Router();
// 라운드별 퀴즈 조회
router.get('/:round', quizController_1.getQuizByRound);
// 퀴즈 답안 제출 (🔥 강제 제출 지원)
router.post('/submit', quizController_1.submitQuizAnswer);
// 퀴즈 결과 조회
router.get('/results/:round', quizController_1.getQuizResults);
// 🔥 새로 추가: 관리자용 엔드포인트들
router.delete('/admin/clear-all', quizController_1.clearAllQuizSubmissions);
router.delete('/admin/teams/:teamId/quiz/:round', quizController_1.clearTeamQuizSubmission);
exports.default = router;
//# sourceMappingURL=quiz.js.map
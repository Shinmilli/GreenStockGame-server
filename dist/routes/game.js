"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/game.ts
const express_1 = __importDefault(require("express"));
const gameStateController_1 = require("../controllers/gameStateController");
const quizController_1 = require("../controllers/quizController");
const tradeController_1 = require("../controllers/tradeController");
const router = express_1.default.Router();
// 게임 상태 관리
router.get('/state', gameStateController_1.getGameState);
router.post('/start', gameStateController_1.startGame);
router.post('/reset', gameStateController_1.resetGame);
router.post('/next-phase', gameStateController_1.forceNextPhase);
// 거래 상태
router.get('/trade/status', tradeController_1.getTradeStatus);
router.get('/trade/history/:round', tradeController_1.getRoundTradeHistory);
// 퀴즈 결과
router.get('/quiz/results/:round', quizController_1.getQuizResults);
exports.default = router;
//# sourceMappingURL=game.js.map
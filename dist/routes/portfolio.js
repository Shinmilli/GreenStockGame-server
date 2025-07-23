"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const portfolioController_1 = require("../controllers/portfolioController");
const router = express_1.default.Router();
// 팀별 포트폴리오 조회
router.get('/:teamId', portfolioController_1.getPortfolioByTeam);
exports.default = router;
//# sourceMappingURL=portfolio.js.map
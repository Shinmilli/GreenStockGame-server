"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stockController_1 = require("../controllers/stockController");
const router = express_1.default.Router();
// 모든 주식 조회
router.get('/', stockController_1.getAllStocks);
// 특정 주식의 거래 히스토리 조회
router.get('/:stockId/history', stockController_1.getStockHistory);
exports.default = router;
//# sourceMappingURL=stocks.js.map
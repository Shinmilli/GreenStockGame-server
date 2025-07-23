"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tradeController_1 = require("../controllers/tradeController");
const router = express_1.default.Router();
router.post('/', tradeController_1.executeTrade);
exports.default = router;
//# sourceMappingURL=trade.js.map
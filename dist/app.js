"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// app.ts (업데이트됨)
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// 라우트 임포트
const auth_1 = __importDefault(require("./routes/auth"));
const stocks_1 = __importDefault(require("./routes/stocks"));
const trade_1 = __importDefault(require("./routes/trade"));
const quiz_1 = __importDefault(require("./routes/quiz"));
const ranking_1 = __importDefault(require("./routes/ranking"));
const events_1 = __importDefault(require("./routes/events"));
const portfolio_1 = __importDefault(require("./routes/portfolio"));
const game_1 = __importDefault(require("./routes/game")); // 새로 추가
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// 미들웨어
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
// 요청 로깅 미들웨어
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// 라우트 설정
app.use('/api/auth', auth_1.default);
app.use('/api/stocks', stocks_1.default);
app.use('/api/trade', trade_1.default);
app.use('/api/quiz', quiz_1.default);
app.use('/api/ranking', ranking_1.default);
app.use('/api/events', events_1.default);
app.use('/api/portfolio', portfolio_1.default);
app.use('/api/game', game_1.default); // 새로 추가
// 헬스 체크
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// 게임 관리 페이지 (관리자용)
app.get('/admin', (req, res) => {
    res.json({
        message: 'ESG 투자 게임 관리자 페이지',
        endpoints: {
            gameState: 'GET /api/game/state',
            startGame: 'POST /api/game/start',
            resetGame: 'POST /api/game/reset',
            forceNextPhase: 'POST /api/game/next-phase',
            tradeStatus: 'GET /api/game/trade/status'
        },
        usage: {
            startGame: '게임을 시작합니다 (라운드 1 뉴스 단계부터)',
            resetGame: '게임을 초기화합니다 (모든 팀 데이터 리셋)',
            forceNextPhase: '현재 단계를 건너뛰고 다음 단계로 이동',
            gameState: '현재 게임 상태를 확인합니다'
        }
    });
});
// 404 핸들러
app.use((req, res) => {
    res.status(404).json({
        message: '존재하지 않는 엔드포인트입니다.',
        path: req.originalUrl
    });
});
// 에러 핸들러
app.use((error, req, res, next) => {
    console.error('서버 오류:', error);
    res.status(500).json({
        message: '서버 내부 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});
app.listen(PORT, () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`📋 헬스 체크: http://localhost:${PORT}/health`);
    console.log(`🎮 관리자 페이지: http://localhost:${PORT}/admin`);
    console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n🎯 게임 관리 명령어:`);
    console.log(`   게임 시작: POST http://localhost:${PORT}/api/game/start`);
    console.log(`   게임 리셋: POST http://localhost:${PORT}/api/game/reset`);
    console.log(`   게임 상태: GET http://localhost:${PORT}/api/game/state`);
});
exports.default = app;
//# sourceMappingURL=app.js.map
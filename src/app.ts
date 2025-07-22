// app.ts (업데이트됨)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 라우트 임포트
import authRoutes from './routes/auth';
import stockRoutes from './routes/stocks';
import tradeRoutes from './routes/trade';
import quizRoutes from './routes/quiz';
import rankingRoutes from './routes/ranking';
import eventRoutes from './routes/events';
import portfolioRoutes from './routes/portfolio';
import gameRoutes from './routes/game'; // 새로 추가

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/game', gameRoutes); // 새로 추가

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
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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

export default app;
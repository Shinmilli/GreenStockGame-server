// app.ts (Render 배포를 위한 수정)
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

// 라우트 임포트
import authRoutes from './routes/auth';
import stockRoutes from './routes/stocks';
import tradeRoutes from './routes/trade';
import quizRoutes from './routes/quiz';
import rankingRoutes from './routes/ranking';
import eventRoutes from './routes/events';
import portfolioRoutes from './routes/portfolio';
import gameRoutes from './routes/game';

dotenv.config();

const app = express();
const PORT: number = parseInt(process.env.PORT || '3001', 10);


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

// 🔥 Render Health Check를 위한 루트 엔드포인트 (가장 중요!)
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🌱 ESG Green Stock Game Server',
    status: 'Online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server: 'Render Cloud Service',
    game: {
      name: 'ESG Investment Game',
      description: 'Educational stock trading game focused on ESG companies'
    },
    endpoints: {
      health: '/health',
      admin: '/admin',
      api: '/api/*'
    }
  });
});

// 헬스 체크 (추가 모니터링용)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// API 상태 체크
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'ESG Game API is running',
    version: '1.0.0',
    availableRoutes: [
      'GET /api/game/state - 게임 상태 확인',
      'POST /api/game/start - 게임 시작',
      'POST /api/game/reset - 게임 리셋',
      'POST /api/auth/login - 팀 로그인',
      'GET /api/stocks - 주식 목록',
      'GET /api/ranking - 순위',
      'GET /api/events - 뉴스 이벤트'
    ]
  });
});

// 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/game', gameRoutes);

// 게임 관리 페이지 (관리자용)
app.get('/admin', (req, res) => {
  res.status(200).json({
    message: '🎮 ESG 투자 게임 관리자 페이지',
    timestamp: new Date().toISOString(),
    endpoints: {
      gameState: 'GET /api/game/state',
      startGame: 'POST /api/game/start',
      resetGame: 'POST /api/game/reset',
      forceNextPhase: 'POST /api/game/next-phase',
      startNextRound: 'POST /api/game/start-next-round',
      tradeStatus: 'GET /api/game/trade/status'
    },
    usage: {
      startGame: '게임을 시작합니다 (라운드 1 뉴스 단계부터)',
      resetGame: '게임을 초기화합니다 (모든 팀 데이터 리셋)',
      forceNextPhase: '현재 단계를 건너뛰고 다음 단계로 이동',
      startNextRound: '다음 라운드를 수동으로 시작',
      gameState: '현재 게임 상태를 확인합니다'
    },
    quickActions: [
      '1. POST /api/game/start - 게임 시작',
      '2. GET /api/game/state - 상태 확인',
      '3. POST /api/game/next-phase - 다음 단계',
      '4. POST /api/game/start-next-round - 다음 라운드'
    ]
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    message: '❌ 존재하지 않는 엔드포인트입니다.',
    path: req.originalUrl,
    availableEndpoints: [
      'GET / - 서버 상태',
      'GET /health - 헬스 체크',
      'GET /admin - 관리자 페이지',
      'GET /api - API 정보',
      'POST /api/auth/login - 로그인'
    ],
    timestamp: new Date().toISOString()
  });
});

// 에러 핸들러
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ 서버 오류:', error);
  res.status(500).json({ 
    message: '서버 내부 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? error.message : '내부 서버 오류',
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substr(2, 9)
  });
});

// 🔥 Render에서 요구하는 정확한 서버 시작 방식
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ESG Green Stock Game Server 시작됨`);
  console.log(`📡 포트: ${PORT}`);
  console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 서버 주소: http://0.0.0.0:${PORT}`);
  console.log(`\n📋 주요 엔드포인트:`);
  console.log(`   🏠 홈페이지: GET /`);
  console.log(`   ❤️ 헬스체크: GET /health`);
  console.log(`   👨‍💻 관리자: GET /admin`);
  console.log(`   🎮 게임 상태: GET /api/game/state`);
  console.log(`\n🎯 게임 관리 명령어:`);
  console.log(`   🎬 게임 시작: POST /api/game/start`);
  console.log(`   🔄 게임 리셋: POST /api/game/reset`);
  console.log(`   ⏭️ 다음 단계: POST /api/game/next-phase`);
  console.log(`   🔢 다음 라운드: POST /api/game/start-next-round`);
  console.log(`\n✅ 서버 준비 완료! Render 배포 가능 상태입니다.`);
});

export default app;
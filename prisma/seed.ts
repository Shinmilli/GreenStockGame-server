import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 시드 데이터 생성 시작...');

  // 기존 데이터 삭제 (개발 환경에서만)
  if (process.env.NODE_ENV !== 'production') {
    await prisma.newsEvent.deleteMany();
    await prisma.quizQuestion.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.holding.deleteMany();
    await prisma.stock.deleteMany();
    await prisma.team.deleteMany();
    console.log('🗑️ 기존 데이터 삭제 완료');
  }

  // 팀 데이터 생성 (Prisma 스키마의 필드명 사용)
  const teams = await prisma.team.createMany({
    data: [
      { code: 'TEAM-001', name: '그린 인베스터', balance: 100000 },
      { code: 'TEAM-002', name: '에코 트레이더', balance: 100000 },
      { code: 'TEAM-003', name: '서스테인 캐피탈', balance: 100000 },
      { code: 'TEAM-004', name: '클린 파이낸스', balance: 100000 },
      { code: 'TEAM-005', name: '임팩트 펀드', balance: 100000 },
      { code: 'TEAM-006', name: '에너지 이노베이터', balance: 100000 },
      { code: 'TEAM-007', name: '블루 오션', balance: 100000 },
      { code: 'TEAM-008', name: '퓨처 그린', balance: 100000 },
    ],
  });
  console.log(`✅ 팀 ${teams.count}개 생성 완료`);

  // 주식 데이터 생성 (Prisma 스키마의 필드명 사용)
  const stocks = await prisma.stock.createMany({
    data: [
      { 
        symbol: 'TESLA', 
        companyName: '테슬라', 
        currentPrice: 250.0, 
        esgCategory: 'Clean Energy', 
        description: '전기차 및 청정에너지 솔루션' 
      },
      { 
        symbol: 'BEYOND', 
        companyName: '비욘드미트', 
        currentPrice: 45.0, 
        esgCategory: 'Sustainable Food', 
        description: '식물성 고기 대체식품' 
      },
      { 
        symbol: 'VESTAS', 
        companyName: '베스타스', 
        currentPrice: 32.0, 
        esgCategory: 'Wind Energy', 
        description: '풍력 발전 장비 제조' 
      },
      { 
        symbol: 'SOLAR', 
        companyName: '솔라파워', 
        currentPrice: 18.5, 
        esgCategory: 'Solar Energy', 
        description: '태양광 발전 시스템' 
      },
      { 
        symbol: 'RECYCLE', 
        companyName: '리사이클테크', 
        currentPrice: 28.0, 
        esgCategory: 'Waste Management', 
        description: '폐기물 재활용 기술' 
      },
      { 
        symbol: 'AQUA', 
        companyName: '아쿠아클린', 
        currentPrice: 22.0, 
        esgCategory: 'Water Treatment', 
        description: '수자원 정화 기술' 
      },
      { 
        symbol: 'ORGANIC', 
        companyName: '오가닉팜', 
        currentPrice: 35.0, 
        esgCategory: 'Organic Agriculture', 
        description: '유기농 농업 기술' 
      },
      { 
        symbol: 'CARBON', 
        companyName: '카본캡처', 
        currentPrice: 41.0, 
        esgCategory: 'Carbon Capture', 
        description: '탄소 포집 및 저장 기술' 
      },
    ],
  });
  console.log(`✅ 주식 ${stocks.count}개 생성 완료`);

  // 퀴즈 문제 생성 (8라운드 전체)
  const quizQuestions = await prisma.quizQuestion.createMany({
    data: [
      {
        question: '다음 중 재생에너지가 아닌 것은?',
        options: ['태양광', '풍력', '천연가스', '지열'],
        correctAnswer: 2,
        roundNumber: 1,
      },
      {
        question: 'ESG에서 E는 무엇을 의미하나요?',
        options: ['Economy', 'Environment', 'Energy', 'Equity'],
        correctAnswer: 1,
        roundNumber: 2,
      },
      {
        question: '파리기후협약의 목표 온도는?',
        options: ['1.5℃', '2℃', '2.5℃', '3℃'],
        correctAnswer: 0,
        roundNumber: 3,
      },
      {
        question: '다음 중 온실가스가 아닌 것은?',
        options: ['이산화탄소', '메탄', '질소', '아산화질소'],
        correctAnswer: 2,
        roundNumber: 4,
      },
      {
        question: '순환경제의 핵심 원칙은?',
        options: ['대량생산', '재사용과 재활용', '일회용품 사용', '원료 수입'],
        correctAnswer: 1,
        roundNumber: 5,
      },
      {
        question: '탄소중립이란?',
        options: ['탄소 배출량 증가', '탄소 배출량과 흡수량이 같은 상태', '탄소 사용 금지', '탄소세 부과'],
        correctAnswer: 1,
        roundNumber: 6,
      },
      {
        question: '다음 중 지속가능한 에너지원은?',
        options: ['석탄', '석유', '태양광', '천연가스'],
        correctAnswer: 2,
        roundNumber: 7,
      },
      {
        question: 'ESG 투자의 장점은?',
        options: ['단기 수익 극대화', '장기적 지속가능성', '높은 위험도', '투기적 성격'],
        correctAnswer: 1,
        roundNumber: 8,
      },
    ],
  });
  console.log(`✅ 퀴즈 ${quizQuestions.count}개 생성 완료`);

  // 뉴스 이벤트 생성
  const newsEvents = await prisma.newsEvent.createMany({
    data: [
      {
        title: '라운드 1 - 전기차 붐',
        content: '글로벌 전기차 시장이 빠르게 성장하며, 배터리 및 리튬 수요 증가',
        affectedStocks: { Tesla: 10, BYD: 7, LG: 5 },
        roundNumber: 1,
      },
      {
        title: '테슬라, 혁신적인 배터리 기술 발표',
        content: '새로운 4680 배터리 셀 기술로 주행거리 2배 향상, 충전 시간 50% 단축',
        affectedStocks: { TESLA: 8 },
        roundNumber: 2,
      },
      {
        title: '정부, 탄소세 도입 발표',
        content: '2025년부터 탄소 배출량에 따른 세금 부과, 청정에너지 기업에 세제 혜택',
        affectedStocks: { SOLAR: 7, VESTAS: 6, CARBON: 8 },
        roundNumber: 3,
      },
      {
        title: '글로벌 플라스틱 규제 강화',
        content: 'EU, 일회용 플라스틱 사용 전면 금지 결정, 재활용 기업 주목',
        affectedStocks: { RECYCLE: 12, ORGANIC: 5 },
        roundNumber: 4,
      },
      {
        title: '대체육 시장 급성장',
        content: '식물성 고기 시장이 전년 대비 200% 성장, 글로벌 확산',
        affectedStocks: { BEYOND: 15 },
        roundNumber: 5,
      },
      {
        title: '물 부족 위기 심화',
        content: '전 세계 물 부족 지역 확산, 수처리 기술 수요 급증',
        affectedStocks: { AQUA: 10 },
        roundNumber: 6,
      },
      {
        title: '유기농 식품 인증 강화',
        content: '소비자 건강 의식 증가로 유기농 식품 시장 확대',
        affectedStocks: { ORGANIC: 8 },
        roundNumber: 7,
      },
      {
        title: '탄소 포집 기술 상용화',
        content: '대기 중 CO2 직접 포집 기술 상용화 단계 진입',
        affectedStocks: { CARBON: 20 },
        roundNumber: 8,
      },
    ],
  });
  console.log(`✅ 뉴스 이벤트 ${newsEvents.count}개 생성 완료`);

  console.log('🎉 시드 데이터 생성 완료!');
}

main()
  .then(() => {
    console.log('✅ Seed operation completed successfully');
  })
  .catch((e) => {
    console.error('❌ Seed operation failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
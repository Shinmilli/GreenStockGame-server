import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 개선된 시드 데이터 생성 시작...');
  

  // 기존 데이터 삭제 (개발 환경에서만)
  const isProduction = (globalThis as any).process?.env?.NODE_ENV === 'production';

  if (!isProduction) {
    await prisma.newsEvent.deleteMany();
    await prisma.quizQuestion.deleteMany();
    await prisma.quizSubmission.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.holding.deleteMany();
    await prisma.stock.deleteMany();
    await prisma.team.deleteMany();
    console.log('🗑️ 기존 데이터 삭제 완료');
  }

  // 팀 데이터 생성 - 더 많은 팀으로 확장
  const teams = await prisma.team.createMany({
    data: [
      { code: 'GREEN-01', name: '그린 투자단', balance: 10000 },
      { code: 'ECO-02', name: '에코 파이터스', balance: 10000 },
      { code: 'CLEAN-03', name: '클린 에너지', balance: 10000 },
      { code: 'EARTH-04', name: '지구 지키미', balance: 10000 },
      { code: 'FUTURE-05', name: '미래 세대', balance: 10000 },
      { code: 'SOLAR-06', name: '태양광 투자자', balance: 10000 },
      { code: 'WIND-07', name: '바람의 아이들', balance: 10000 },
      { code: 'OCEAN-08', name: '바다 사랑단', balance: 10000 },
      { code: 'FOREST-09', name: '숲 보호대', balance: 10000 },
      { code: 'CARBON-10', name: '탄소 제로', balance: 10000 },
    ],
  });
  console.log(`✅ 팀 ${teams.count}개 생성 완료`);

  // 🔥 더 다양하고 현실적인 주식 데이터
  const stocks = await prisma.stock.createMany({
    data: [
      { 
        symbol: 'TESLA', 
        companyName: '테슬라', 
        currentPrice: 85.0, 
        esgCategory: 'Clean Energy', 
        description: '전기차 및 에너지 저장 솔루션의 글로벌 리더. 지속가능한 교통수단의 미래를 선도합니다.' 
      },
      { 
        symbol: 'BEYOND', 
        companyName: '비욘드미트', 
        currentPrice: 28.0, 
        esgCategory: 'Sustainable Food', 
        description: '식물성 고기 대체식품의 혁신 기업. 축산업의 환경 영향을 획기적으로 줄입니다.' 
      },
      { 
        symbol: 'VESTAS', 
        companyName: '베스타스', 
        currentPrice: 45.0, 
        esgCategory: 'Wind Energy', 
        description: '세계 최대 풍력 터빈 제조업체. 청정 풍력 에너지의 글로벌 확산을 주도합니다.' 
      },
      { 
        symbol: 'SOLAR', 
        companyName: '솔라파워', 
        currentPrice: 22.5, 
        esgCategory: 'Solar Energy', 
        description: '차세대 태양광 패널 기술 개발. 태양 에너지 효율성을 지속적으로 향상시킵니다.' 
      },
      { 
        symbol: 'RECYCLE', 
        companyName: '리사이클테크', 
        currentPrice: 38.0, 
        esgCategory: 'Waste Management', 
        description: 'AI 기반 폐기물 분류 및 재활용 기술. 순환경제 구현의 핵심 파트너입니다.' 
      },
      { 
        symbol: 'AQUA', 
        companyName: '아쿠아클린', 
        currentPrice: 31.0, 
        esgCategory: 'Water Treatment', 
        description: '혁신적인 수질 정화 기술로 깨끗한 물 공급. 물 부족 문제 해결에 앞장섭니다.' 
      },
      { 
        symbol: 'ORGANIC', 
        companyName: '오가닉팜', 
        currentPrice: 26.5, 
        esgCategory: 'Organic Agriculture', 
        description: '스마트팜 기술과 유기농업의 결합. 지속가능한 농업 혁신을 이끕니다.' 
      },
      { 
        symbol: 'CARBON', 
        companyName: '카본캡처', 
        currentPrice: 52.0, 
        esgCategory: 'Carbon Capture', 
        description: '대기 중 CO2 직접 포집 및 활용 기술. 탄소중립 달성의 게임체인저입니다.' 
      },
    ],
  });
  console.log(`✅ 주식 ${stocks.count}개 생성 완료`);


  // 🔥 8라운드 전체 퀴즈 문제 (더 교육적이고 흥미로운 내용)
  const quizQuestions = await prisma.quizQuestion.createMany({
    data: [
      {
        question: 'ESG 투자에서 "E"는 무엇을 의미하나요?',
        options: ['Economy(경제)', 'Environment(환경)', 'Energy(에너지)', 'Equity(형평성)'],
        correctAnswer: 1,
        roundNumber: 1,
      },
      {
        question: '전기차 1대가 연간 절약하는 CO2 배출량은 약 얼마인가요?',
        options: ['1톤', '3톤', '5톤', '10톤'],
        correctAnswer: 2,
        roundNumber: 2,
      },
      {
        question: '다음 중 재생에너지가 아닌 것은?',
        options: ['태양광', '풍력', '천연가스', '수력'],
        correctAnswer: 2,
        roundNumber: 3,
      },
      {
        question: '플라스틱이 자연 분해되는데 걸리는 시간은?',
        options: ['10년', '50년', '100년', '500년'],
        correctAnswer: 3,
        roundNumber: 4,
      },
      {
        question: '식물성 고기가 기존 육류 대비 절약하는 물의 양은?',
        options: ['30%', '50%', '70%', '90%'],
        correctAnswer: 3,
        roundNumber: 5,
      },
      {
        question: '전 세계 깨끗한 물에 접근할 수 없는 사람은 몇 명인가요?',
        options: ['5억명', '10억명', '20억명', '30억명'],
        correctAnswer: 2,
        roundNumber: 6,
      },
      {
        question: '유기농업이 기존 농업 대비 생물다양성을 얼마나 증가시키나요?',
        options: ['10%', '30%', '50%', '70%'],
        correctAnswer: 2,
        roundNumber: 7,
      },
      {
        question: '탄소 포집 기술로 연간 처리할 수 있는 CO2량은?',
        options: ['100만톤', '1,000만톤', '1억톤', '10억톤'],
        correctAnswer: 2,
        roundNumber: 8,
      },
    ],
  });
  console.log(`✅ 퀴즈 ${quizQuestions.count}개 생성 완료`);

  // 🔥 더 드라마틱하고 다양한 뉴스 이벤트 (대폭적인 주가 변동)
  const newsEvents = await prisma.newsEvent.createMany({
    data: [
      {
        title: '테슬라, 혁신적인 배터리 기술 공개',
        content: '테슬라가 차세대 4680 배터리로 충전시간 70% 단축, 주행거리 3배 향상을 달성했습니다. 전기차 시장에 게임체인저가 될 전망입니다.',
        affectedStocks: { 
          TESLA: 30,    // 혁신적 기술로 급등
          BEYOND: -8,   // 자동차 관련주에 밀려 하락
          ORGANIC: -3   // 관심도 분산으로 소폭 하락
        },
        roundNumber: 2,
      },
      {
        title: '정부, 탄소세 전격 도입 발표!',
        content: '환경부가 2025년부터 탄소 배출량 1톤당 5만원의 탄소세 부과를 발표했습니다. 청정에너지 기업들은 세제 혜택을 받게 됩니다.',
        affectedStocks: { 
          SOLAR: 20,    // 세제 혜택으로 급등
          VESTAS: 18,   // 풍력도 급등
          CARBON: 35,   // 탄소포집 기술 수요 폭증
          RECYCLE: -12  // 규제 부담으로 하락
        },
        roundNumber: 3,
      },
      {
        title: 'EU, 플라스틱 대재앙 선언!',
        content: 'EU가 모든 일회용 플라스틱 사용을 전면 금지하고, 재활용 의무 비율을 90%로 상향했습니다. 재활용 기업들이 특수를 누리고 있습니다.',
        affectedStocks: { 
          RECYCLE: 40,   // 규제로 인한 수혜 급등
          ORGANIC: 12,   // 친환경 포장재 수요 증가
          AQUA: -15,     // 플라스틱 정화 수요 감소
          BEYOND: -6     // 포장재 비용 증가 우려
        },
        roundNumber: 4,
      },
      {
        title: '글로벌 대체육 열풍!',
        content: '맥도날드, KFC 등 글로벌 프랜차이즈가 식물성 고기를 전면 도입했습니다. 대체육 시장이 연 300% 성장하며 축산업을 위협하고 있습니다.',
        affectedStocks: { 
          BEYOND: 45,    // 대체육 시장 주도로 폭등
          ORGANIC: 25,   // 유기농 원료 수요 급증
          CARBON: 8,     // 축산업 감소로 탄소 저감 효과
          TESLA: -10     // 관심도 분산으로 하락
        },
        roundNumber: 5,
      },
      {
        title: '물 부족 대재앙, 전 세계 비상!',
        content: '기후변화로 인한 극심한 가뭄이 전 세계를 강타했습니다. 각국 정부가 수처리 기술에 대규모 투자를 발표하며 관련주가 급등하고 있습니다.',
        affectedStocks: { 
          AQUA: 50,      // 물 위기로 최대 수혜
          ORGANIC: 15,   // 물 절약 농법 주목
          SOLAR: -18,    // 가뭄으로 태양광 설치 지연
          VESTAS: -12    // 물 부족 지역 풍력 설치 어려움
        },
        roundNumber: 6,
      },
      {
        title: '유기농 식품, 건강 혁명 주도!',
        content: 'WHO가 유기농 식품의 암 예방 효과를 공식 인정했습니다. 전 세계적으로 유기농 식품 수요가 폭증하며 관련 기업들이 호황을 누리고 있습니다.',
        affectedStocks: { 
          ORGANIC: 35,   // WHO 인정으로 신뢰도 급상승
          AQUA: 20,      // 유기농 재배용 깨끗한 물 수요 증가
          BEYOND: 10,    // 건강식품 트렌드 수혜
          RECYCLE: -20   // 유기농 포장재로 플라스틱 사용 급감
        },
        roundNumber: 7,
      },
      {
        title: '탄소포집 기술, 마침내 상용화!',
        content: '세계 최초로 대기 중 CO2 직접 포집 기술이 상용화에 성공했습니다. 각국 정부가 탄소중립 달성을 위해 관련 기업에 천문학적 투자를 약속했습니다.',
        affectedStocks: { 
          CARBON: 60,    // 상용화 성공으로 역사적 급등
          TESLA: 25,     // 탄소중립 시너지 효과
          SOLAR: 30,     // 청정에너지 전체 상승세
          VESTAS: 28,    // 재생에너지 생태계 호황
        },
        roundNumber: 8,
      },
    ],
  });
  console.log(`✅ 뉴스 이벤트 ${newsEvents.count}개 생성 완료`);

  console.log('🎉 개선된 시드 데이터 생성 완료!');
  console.log(`
📊 생성된 데이터 요약:
- 👥 팀: ${teams.count}개
- 📈 주식: ${stocks.count}개  
- 🧠 퀴즈: ${quizQuestions.count}개
- 📰 뉴스: ${newsEvents.count}개

🎮 게임 특징:
- 더 다양하고 드라마틱한 주가 변동 (-20% ~ +60%)
- 현실적이고 교육적인 ESG 뉴스 이벤트
- 흥미로운 환경 퀴즈 문제
- 10개 팀으로 확장된 경쟁 구조
  `);
}

main()
  .then(() => {
    console.log('✅ 개선된 Seed operation completed successfully');
  })
  .catch((e) => {
    console.error('❌ Seed operation failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
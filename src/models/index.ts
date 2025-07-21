import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 애플리케이션 종료 시 연결 해제
process.on('beforeExit', async () => {
  console.log('🔌 데이터베이스 연결 해제 중...');
  await prisma.$disconnect();
});

export default prisma;
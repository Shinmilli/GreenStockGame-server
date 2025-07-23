"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
// 애플리케이션 종료 시 연결 해제
process.on('beforeExit', async () => {
    console.log('🔌 데이터베이스 연결 해제 중...');
    await exports.prisma.$disconnect();
});
exports.default = exports.prisma;
//# sourceMappingURL=index.js.map
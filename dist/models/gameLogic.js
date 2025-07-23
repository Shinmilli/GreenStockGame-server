"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameLogic = void 0;
const index_1 = require("./index");
class GameLogic {
    // 거래 수수료 계산
    static calculateFee(amount) {
        return amount * 0.005; // 0.5%
    }
    // 주식 매수
    static async buyStock(teamId, stockId, quantity) {
        try {
            return await index_1.prisma.$transaction(async (tx) => {
                // 팀 정보 조회
                const team = await tx.team.findUnique({
                    where: { id: teamId }
                });
                if (!team) {
                    throw new Error('팀을 찾을 수 없습니다.');
                }
                // 주식 정보 조회
                const stock = await tx.stock.findUnique({
                    where: { id: stockId }
                });
                if (!stock) {
                    throw new Error('주식을 찾을 수 없습니다.');
                }
                const totalCost = Number(stock.currentPrice) * quantity;
                const fee = this.calculateFee(totalCost);
                const totalAmount = totalCost + fee;
                if (Number(team.balance) < totalAmount) {
                    throw new Error('잔액이 부족합니다.');
                }
                // 기존 보유 주식 확인
                const existingHolding = await tx.holding.findFirst({
                    where: {
                        teamId: teamId,
                        stockId: stockId
                    }
                });
                if (existingHolding) {
                    // 기존 보유 주식 업데이트
                    const newQuantity = existingHolding.quantity + quantity;
                    const newAvgPrice = ((Number(existingHolding.avgBuyPrice) * existingHolding.quantity) + totalCost) / newQuantity;
                    await tx.holding.update({
                        where: { id: existingHolding.id },
                        data: {
                            quantity: newQuantity,
                            avgBuyPrice: newAvgPrice
                        }
                    });
                }
                else {
                    // 새 보유 주식 생성
                    await tx.holding.create({
                        data: {
                            teamId: teamId,
                            stockId: stockId,
                            quantity: quantity,
                            avgBuyPrice: Number(stock.currentPrice)
                        }
                    });
                }
                // 팀 잔액 업데이트
                await tx.team.update({
                    where: { id: teamId },
                    data: {
                        balance: Number(team.balance) - totalAmount
                    }
                });
                // 거래 기록 생성
                await tx.transaction.create({
                    data: {
                        teamId: teamId,
                        stockId: stockId,
                        type: 'BUY',
                        quantity: quantity,
                        price: Number(stock.currentPrice),
                        fee: fee
                    }
                });
                return true;
            });
        }
        catch (error) {
            console.error('매수 오류:', error);
            throw error;
        }
    }
    // 퀴즈 보상 지급
    static async giveQuizReward(teamId) {
        try {
            const team = await index_1.prisma.team.findUnique({
                where: { id: teamId }
            });
            if (!team) {
                throw new Error('팀을 찾을 수 없습니다.');
            }
            const currentBalance = Number(team.balance);
            const bonus = currentBalance * 0.02; // 2% 보너스
            await index_1.prisma.team.update({
                where: { id: teamId },
                data: {
                    balance: currentBalance + bonus,
                    quizScore: team.quizScore + 10
                }
            });
            return bonus;
        }
        catch (error) {
            console.error('퀴즈 보상 지급 오류:', error);
            throw error;
        }
    }
    // 주식 매도
    static async sellStock(teamId, stockId, quantity) {
        try {
            return await index_1.prisma.$transaction(async (tx) => {
                // 보유 주식 확인
                const holding = await tx.holding.findFirst({
                    where: {
                        teamId: teamId,
                        stockId: stockId
                    }
                });
                if (!holding || holding.quantity < quantity) {
                    throw new Error('보유 주식이 부족합니다.');
                }
                // 주식 현재가 조회
                const stock = await tx.stock.findUnique({
                    where: { id: stockId }
                });
                if (!stock) {
                    throw new Error('주식을 찾을 수 없습니다.');
                }
                const totalRevenue = Number(stock.currentPrice) * quantity;
                const fee = this.calculateFee(totalRevenue);
                const netRevenue = totalRevenue - fee;
                // 보유 주식 업데이트
                if (holding.quantity === quantity) {
                    // 전량 매도
                    await tx.holding.delete({
                        where: { id: holding.id }
                    });
                }
                else {
                    // 일부 매도
                    await tx.holding.update({
                        where: { id: holding.id },
                        data: {
                            quantity: holding.quantity - quantity
                        }
                    });
                }
                // 팀 잔액 업데이트
                const team = await tx.team.findUnique({ where: { id: teamId } });
                if (team) {
                    await tx.team.update({
                        where: { id: teamId },
                        data: {
                            balance: Number(team.balance) + netRevenue
                        }
                    });
                }
                // 거래 기록 생성
                await tx.transaction.create({
                    data: {
                        teamId: teamId,
                        stockId: stockId,
                        type: 'SELL',
                        quantity: quantity,
                        price: Number(stock.currentPrice),
                        fee: fee
                    }
                });
                return true;
            });
        }
        catch (error) {
            console.error('매도 오류:', error);
            throw error;
        }
    }
}
exports.GameLogic = GameLogic;
//# sourceMappingURL=gameLogic.js.map
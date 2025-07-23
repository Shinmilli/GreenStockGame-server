"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoundTradeHistory = exports.getTradeStatus = exports.executeTrade = void 0;
const client_1 = require("@prisma/client");
const gameLogic_1 = require("../models/gameLogic");
const errorHandler_1 = require("../utils/errorHandler");
const gameStateController_1 = require("./gameStateController");
const prisma = new client_1.PrismaClient();
const executeTrade = async (req, res) => {
    try {
        const { teamId, stockId, quantity, action } = req.body;
        // 입력 값 검증
        (0, errorHandler_1.validateRequired)(teamId, '팀 ID');
        (0, errorHandler_1.validateRequired)(stockId, '주식 ID');
        (0, errorHandler_1.validateRequired)(quantity, '수량');
        (0, errorHandler_1.validateRequired)(action, '거래 유형');
        const validatedQuantity = (0, errorHandler_1.validatePositiveNumber)(quantity, '수량');
        if (action !== 'buy' && action !== 'sell') {
            res.status(400).json({ message: '잘못된 거래 유형입니다. (buy 또는 sell만 허용)' });
            return;
        }
        // 게임 상태 확인
        if (!gameStateController_1.gameState.isActive) {
            res.status(400).json({
                message: '게임이 진행 중이 아닙니다.',
                gameState: {
                    isActive: gameStateController_1.gameState.isActive,
                    phase: gameStateController_1.gameState.phase
                }
            });
            return;
        }
        // 거래 단계인지 확인
        if (gameStateController_1.gameState.phase !== 'trading') {
            res.status(400).json({
                message: `거래 시간이 아닙니다. 현재 단계: ${getPhaseKorean(gameStateController_1.gameState.phase)}`,
                gameState: {
                    phase: gameStateController_1.gameState.phase,
                    timeRemaining: gameStateController_1.gameState.timeRemaining,
                    currentRound: gameStateController_1.gameState.currentRound
                }
            });
            return;
        }
        // 시간 초과 확인
        if (gameStateController_1.gameState.timeRemaining <= 0) {
            res.status(400).json({
                message: '거래 시간이 초과되었습니다.',
                gameState: {
                    phase: gameStateController_1.gameState.phase,
                    timeRemaining: gameStateController_1.gameState.timeRemaining
                }
            });
            return;
        }
        // 실제 거래 실행
        if (action === 'buy') {
            const result = await gameLogic_1.GameLogic.buyStock(teamId, stockId, validatedQuantity);
            res.json({
                message: '매수 완료',
                action: 'buy',
                teamId: teamId,
                stockId: stockId,
                quantity: validatedQuantity,
                gameState: {
                    phase: gameStateController_1.gameState.phase,
                    timeRemaining: gameStateController_1.gameState.timeRemaining,
                    currentRound: gameStateController_1.gameState.currentRound
                },
                transactionResult: result
            });
        }
        else {
            const result = await gameLogic_1.GameLogic.sellStock(teamId, stockId, validatedQuantity);
            res.json({
                message: '매도 완료',
                action: 'sell',
                teamId: teamId,
                stockId: stockId,
                quantity: validatedQuantity,
                gameState: {
                    phase: gameStateController_1.gameState.phase,
                    timeRemaining: gameStateController_1.gameState.timeRemaining,
                    currentRound: gameStateController_1.gameState.currentRound
                },
                transactionResult: result
            });
        }
    }
    catch (error) {
        const { message, statusCode } = (0, errorHandler_1.handleControllerError)(error, '거래');
        res.status(statusCode).json({
            message,
            gameState: {
                phase: gameStateController_1.gameState.phase,
                timeRemaining: gameStateController_1.gameState.timeRemaining,
                currentRound: gameStateController_1.gameState.currentRound
            }
        });
    }
};
exports.executeTrade = executeTrade;
const getTradeStatus = async (req, res) => {
    try {
        const canTrade = gameStateController_1.gameState.isActive && gameStateController_1.gameState.phase === 'trading' && gameStateController_1.gameState.timeRemaining > 0;
        res.json({
            canTrade: canTrade,
            gameState: {
                isActive: gameStateController_1.gameState.isActive,
                phase: gameStateController_1.gameState.phase,
                phaseKorean: getPhaseKorean(gameStateController_1.gameState.phase),
                timeRemaining: gameStateController_1.gameState.timeRemaining,
                currentRound: gameStateController_1.gameState.currentRound
            },
            restrictions: {
                gameNotActive: !gameStateController_1.gameState.isActive,
                wrongPhase: gameStateController_1.gameState.phase !== 'trading',
                timeExpired: gameStateController_1.gameState.timeRemaining <= 0
            }
        });
    }
    catch (error) {
        const { message, statusCode } = (0, errorHandler_1.handleControllerError)(error, '거래 상태 조회');
        res.status(statusCode).json({ message });
    }
};
exports.getTradeStatus = getTradeStatus;
const getRoundTradeHistory = async (req, res) => {
    try {
        const { round } = req.params;
        const roundNumber = parseInt(round);
        // 해당 라운드의 거래 기록 조회
        const trades = await prisma.transaction.findMany({
            where: {
                createdAt: {
                    // 라운드별 시간 필터링 (실제로는 더 정교한 로직 필요)
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 임시로 24시간 전부터
                }
            },
            include: {
                team: {
                    select: {
                        code: true,
                        name: true
                    }
                },
                stock: {
                    select: {
                        symbol: true,
                        companyName: true,
                        esgCategory: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        // 거래 통계
        const totalTrades = trades.length;
        const totalVolume = trades.reduce((sum, trade) => sum + (trade.price.toNumber() * trade.quantity), 0);
        const buyTrades = trades.filter((t) => t.type === 'BUY').length;
        const sellTrades = trades.filter((t) => t.type === 'SELL').length;
        res.json({
            roundNumber,
            trades: trades.map(trade => ({
                ...trade,
                price: trade.price.toNumber(),
                fee: trade.fee.toNumber()
            })),
            statistics: {
                totalTrades,
                totalVolume,
                buyTrades,
                sellTrades,
                averageTradeSize: totalTrades > 0 ? totalVolume / totalTrades : 0
            }
        });
    }
    catch (error) {
        const { message, statusCode } = (0, errorHandler_1.handleControllerError)(error, '라운드 거래 기록 조회');
        res.status(statusCode).json({ message });
    }
};
exports.getRoundTradeHistory = getRoundTradeHistory;
// 헬퍼 함수
function getPhaseKorean(phase) {
    const phaseMap = {
        'news': '뉴스 발표',
        'quiz': '퀴즈 단계',
        'trading': '거래 단계',
        'results': '결과 발표',
        'finished': '게임 종료'
    };
    return phaseMap[phase] || phase;
}
//# sourceMappingURL=tradeController.js.map
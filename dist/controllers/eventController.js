"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerEvent = exports.getEvents = void 0;
const models_1 = require("../models");
const errorHandler_1 = require("../utils/errorHandler");
const getEvents = async (req, res) => {
    try {
        const { round } = req.query;
        let whereClause = { isActive: true };
        if (round) {
            whereClause.roundNumber = parseInt(round);
        }
        const events = await models_1.prisma.newsEvent.findMany({
            where: whereClause,
            orderBy: [
                { roundNumber: 'asc' },
                { createdAt: 'desc' }
            ],
            select: {
                id: true,
                title: true,
                content: true,
                affectedStocks: true,
                roundNumber: true,
                createdAt: true
            }
        });
        res.json(events);
    }
    catch (error) {
        const { message, statusCode } = (0, errorHandler_1.handleControllerError)(error, '뉴스 이벤트 조회');
        res.status(statusCode).json({ message });
    }
};
exports.getEvents = getEvents;
const triggerEvent = async (req, res) => {
    try {
        const { eventId, action } = req.body;
        if (action === 'trigger') {
            // 뉴스 이벤트를 실제로 적용
            const event = await models_1.prisma.newsEvent.findUnique({
                where: { id: eventId }
            });
            if (!event || !event.isActive) {
                res.status(404).json({ message: '이벤트를 찾을 수 없습니다.' });
                return;
            }
            const affectedStocks = event.affectedStocks;
            // 각 주식에 이벤트 적용
            for (const [symbol, changePercent] of Object.entries(affectedStocks)) {
                await models_1.prisma.stock.updateMany({
                    where: { symbol: symbol },
                    data: {
                        currentPrice: {
                            multiply: 1 + changePercent / 100
                        }
                    }
                });
            }
            res.json({
                message: '뉴스 이벤트가 적용되었습니다.',
                affectedStocks: affectedStocks
            });
            return;
        }
        if (action === 'activate') {
            // 뉴스 이벤트 활성화
            await models_1.prisma.newsEvent.update({
                where: { id: eventId },
                data: { isActive: true }
            });
            res.json({
                message: '뉴스 이벤트가 활성화되었습니다.'
            });
            return;
        }
        if (action === 'deactivate') {
            // 뉴스 이벤트 비활성화
            await models_1.prisma.newsEvent.update({
                where: { id: eventId },
                data: { isActive: false }
            });
            res.json({
                message: '뉴스 이벤트가 비활성화되었습니다.'
            });
            return;
        }
        // 잘못된 액션인 경우
        res.status(400).json({ message: '잘못된 액션입니다.' });
    }
    catch (error) {
        const { message, statusCode } = (0, errorHandler_1.handleControllerError)(error, '뉴스 이벤트 처리');
        res.status(statusCode).json({ message });
    }
};
exports.triggerEvent = triggerEvent;
//# sourceMappingURL=eventController.js.map
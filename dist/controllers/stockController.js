"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockHistory = exports.getAllStocks = void 0;
const models_1 = require("../models");
const errorHandler_1 = require("../utils/errorHandler");
const getAllStocks = async (req, res) => {
    try {
        const stocks = await models_1.prisma.stock.findMany({
            orderBy: { symbol: 'asc' },
            select: {
                id: true,
                symbol: true,
                companyName: true,
                currentPrice: true,
                esgCategory: true,
                description: true,
                createdAt: true
            }
        });
        // Decimal을 number로 변환
        const formattedStocks = stocks.map(stock => ({
            ...stock,
            currentPrice: Number(stock.currentPrice)
        }));
        res.json(formattedStocks);
    }
    catch (error) {
        const { message, statusCode } = (0, errorHandler_1.handleControllerError)(error, '주식 조회');
        res.status(statusCode).json({ message });
    }
};
exports.getAllStocks = getAllStocks;
const getStockHistory = async (req, res) => {
    try {
        const { stockId } = req.params;
        const transactions = await models_1.prisma.transaction.findMany({
            where: { stockId: parseInt(stockId) },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                stock: {
                    select: {
                        symbol: true,
                        companyName: true
                    }
                },
                team: {
                    select: {
                        code: true,
                        name: true
                    }
                }
            }
        });
        // Decimal을 number로 변환
        const formattedTransactions = transactions.map(transaction => ({
            ...transaction,
            price: Number(transaction.price),
            fee: Number(transaction.fee)
        }));
        res.json(formattedTransactions);
    }
    catch (error) {
        const { message, statusCode } = (0, errorHandler_1.handleControllerError)(error, '주식 히스토리 조회');
        res.status(statusCode).json({ message });
    }
};
exports.getStockHistory = getStockHistory;
//# sourceMappingURL=stockController.js.map
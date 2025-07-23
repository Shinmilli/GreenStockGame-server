"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginTeam = void 0;
const models_1 = require("../models");
const errorHandler_1 = require("../utils/errorHandler");
const loginTeam = async (req, res) => {
    try {
        const { teamCode } = req.body;
        if (!teamCode) {
            res.status(400).json({ message: '팀 코드를 입력해주세요.' });
            return;
        }
        const team = await models_1.prisma.team.findUnique({
            where: { code: teamCode }
        });
        if (!team) {
            res.status(404).json({ message: '존재하지 않는 팀 코드입니다.' });
            return;
        }
        // 팀 정보를 응답에 포함 (민감한 정보 제외)
        const teamData = {
            id: team.id,
            code: team.code,
            name: team.name,
            balance: Number(team.balance),
            esgScore: team.esgScore,
            quizScore: team.quizScore
        };
        res.json({
            message: '로그인 성공',
            team: teamData
        });
    }
    catch (error) {
        const { message, statusCode } = (0, errorHandler_1.handleControllerError)(error, '로그인');
        res.status(statusCode).json({ message });
    }
};
exports.loginTeam = loginTeam;
console.log('📝 authController 로딩됨 - loginTeam:', typeof exports.loginTeam);
//# sourceMappingURL=authController.js.map
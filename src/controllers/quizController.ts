// controllers/quizController.ts (수정됨 - 강제 제출 지원)
import { Request, Response } from 'express';
import { prisma } from '../models';
import { GameLogic } from '../models/gameLogic';
import { handleControllerError } from '../utils/errorHandler';
import { gameState } from './gameStateController';

export const getQuizByRound = async (req: Request, res: Response): Promise<void> => {
  try {
    const { round } = req.params;
    const roundNumber = parseInt(round);

    // 게임 상태 확인
    if (!gameState.isActive) {
      res.status(400).json({ message: '게임이 진행 중이 아닙니다.' });
      return;
    }

    if (gameState.currentRound !== roundNumber) {
      res.status(400).json({ 
        message: `현재 라운드(${gameState.currentRound})와 일치하지 않습니다.`,
        currentRound: gameState.currentRound,
        requestedRound: roundNumber
      });
      return;
    }

    if (gameState.phase !== 'quiz') {
      res.status(400).json({ 
        message: `퀴즈 단계가 아닙니다. 현재 단계: ${gameState.phase}`,
        currentPhase: gameState.phase,
        timeRemaining: gameState.timeRemaining
      });
      return;
    }

    const question = await prisma.quizQuestion.findFirst({
      where: { roundNumber: roundNumber },
      select: {
        id: true,
        question: true,
        options: true,
        roundNumber: true
        // correctAnswer는 제외
      }
    });

    if (!question) {
      res.status(404).json({ message: '해당 라운드의 퀴즈를 찾을 수 없습니다.' });
      return;
    }

    res.json({
      ...question,
      gameState: {
        phase: gameState.phase,
        timeRemaining: gameState.timeRemaining,
        currentRound: gameState.currentRound
      }
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '퀴즈 조회');
    res.status(statusCode).json({ message });
  }
};

// 🔥 수정된 submitQuizAnswer - 강제 제출 지원
export const submitQuizAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId, questionId, selectedAnswer, force } = req.body;
    const isForceMode = force === true || req.query.force === 'true';

    console.log('🧠 퀴즈 제출 요청:', { teamId, questionId, selectedAnswer, force: isForceMode });

    if (!teamId || !questionId || selectedAnswer === undefined) {
      res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
      return;
    }

    // 게임 상태 확인
    if (!gameState.isActive) {
      res.status(400).json({ message: '게임이 진행 중이 아닙니다.' });
      return;
    }

    if (gameState.phase !== 'quiz') {
      res.status(400).json({ 
        message: `퀴즈 제출 시간이 아닙니다. 현재 단계: ${gameState.phase}` 
      });
      return;
    }

    // 시간 초과 확인
    if (gameState.timeRemaining <= 0) {
      res.status(400).json({ message: '퀴즈 제출 시간이 초과되었습니다.' });
      return;
    }

    // 🔥 이미 제출했는지 확인 - 강제 모드가 아닐 때만
    const existingSubmission = await prisma.quizSubmission.findFirst({
      where: {
        teamId: teamId,
        questionId: questionId
      }
    });

    if (existingSubmission && !isForceMode) {
      console.log('⚠️ 이미 제출된 퀴즈 - 일반 모드에서 차단');
      res.status(400).json({ message: '이미 퀴즈를 제출했습니다.' });
      return;
    }

    // 🔥 강제 모드에서는 기존 제출 삭제
    if (existingSubmission && isForceMode) {
      console.log('🔓 강제 모드 - 기존 제출 기록 삭제:', existingSubmission.id);
      await prisma.quizSubmission.delete({
        where: { id: existingSubmission.id }
      });
      
      // 기존 보상도 회수 (정답이었던 경우)
      if (existingSubmission.isCorrect) {
        console.log('💰 기존 보상 회수 처리');
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (team) {
          const rewardToRevoke = Number(team.balance) * 0.02; // 2% 회수
          await prisma.team.update({
            where: { id: teamId },
            data: {
              balance: Math.max(0, Number(team.balance) - rewardToRevoke), // 음수 방지
              quizScore: Math.max(0, team.quizScore - 10) // 점수도 차감
            }
          });
          console.log('💰 보상 회수 완료:', rewardToRevoke);
        }
      }
    }

    // 퀴즈 문제 조회
    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      res.status(404).json({ message: '퀴즈 문제를 찾을 수 없습니다.' });
      return;
    }

    // 현재 라운드 문제인지 확인
    if (question.roundNumber !== gameState.currentRound) {
      res.status(400).json({ message: '현재 라운드의 문제가 아닙니다.' });
      return;
    }

    const isCorrect = question.correctAnswer === selectedAnswer;

    let bonus = 0;
    let newBalance: number | null = null;

    // 새로운 퀴즈 제출 기록 저장
    const newSubmission = await prisma.quizSubmission.create({
      data: {
        teamId: teamId,
        questionId: questionId,
        selectedAnswer: selectedAnswer,
        isCorrect: isCorrect,
        submittedAt: new Date(),
        roundNumber: gameState.currentRound
      }
    });

    console.log('✅ 새 퀴즈 제출 기록 생성:', newSubmission.id);

    if (isCorrect) {
      // 정답인 경우 보너스 지급
      bonus = await GameLogic.giveQuizReward(teamId);
      
      // 업데이트된 팀 잔액 조회
      const team = await prisma.team.findUnique({
        where: { id: teamId }
      });
      
      if (team) {
        newBalance = Number(team.balance);
      }

      console.log('🎉 정답! 보너스 지급:', bonus);
    }

    const response = {
      correct: isCorrect,
      correctAnswer: question.correctAnswer,
      bonus: bonus,
      newBalance: newBalance,
      forceMode: isForceMode, // 🔥 강제 모드 여부 반환
      gameState: {
        phase: gameState.phase,
        timeRemaining: gameState.timeRemaining,
        currentRound: gameState.currentRound
      }
    };

    console.log('📤 퀴즈 제출 응답:', response);
    res.json(response);

  } catch (error) {
    console.error('❌ 퀴즈 제출 처리 오류:', error);
    const { message, statusCode } = handleControllerError(error, '퀴즈 제출');
    res.status(statusCode).json({ message });
  }
};

// 🔥 새로 추가: 관리자용 퀴즈 데이터 정리 함수들
export const clearAllQuizSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🗑️ 관리자 요청: 모든 퀴즈 제출 기록 삭제');
    
    const deletedCount = await prisma.quizSubmission.deleteMany({});
    
    console.log('✅ 퀴즈 제출 기록 삭제 완료:', deletedCount.count);
    
    res.json({ 
      message: `${deletedCount.count}개의 퀴즈 제출 기록이 삭제되었습니다.`,
      deletedCount: deletedCount.count
    });
  } catch (error) {
    console.error('❌ 퀴즈 기록 삭제 실패:', error);
    const { message, statusCode } = handleControllerError(error, '퀴즈 기록 삭제');
    res.status(statusCode).json({ message });
  }
};

export const clearTeamQuizSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId, round } = req.params;
    const teamIdNum = parseInt(teamId);
    const roundNum = parseInt(round);
    
    console.log('🗑️ 관리자 요청: 특정 팀 퀴즈 기록 삭제:', { teamId: teamIdNum, round: roundNum });
    
    const deletedSubmissions = await prisma.quizSubmission.deleteMany({
      where: {
        teamId: teamIdNum,
        roundNumber: roundNum
      }
    });
    
    console.log('✅ 팀 퀴즈 기록 삭제 완료:', deletedSubmissions.count);
    
    res.json({ 
      message: `팀 ${teamIdNum}의 라운드 ${roundNum} 퀴즈 기록 ${deletedSubmissions.count}개가 삭제되었습니다.`,
      deletedCount: deletedSubmissions.count
    });
  } catch (error) {
    console.error('❌ 팀 퀴즈 기록 삭제 실패:', error);
    const { message, statusCode } = handleControllerError(error, '팀 퀴즈 기록 삭제');
    res.status(statusCode).json({ message });
  }
};

export const getQuizResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { round } = req.params;
    const roundNumber = parseInt(round);

    // 해당 라운드의 퀴즈 결과 조회
    const submissions = await prisma.quizSubmission.findMany({
      where: { roundNumber: roundNumber },
      include: {
        team: {
          select: {
            code: true,
            name: true
          }
        },
        question: {
          select: {
            question: true,
            correctAnswer: true
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    });

    // 통계 계산
    const totalSubmissions = submissions.length;
    const correctSubmissions = submissions.filter(s => s.isCorrect).length;
    const accuracy = totalSubmissions > 0 ? (correctSubmissions / totalSubmissions) * 100 : 0;

    res.json({
      roundNumber: roundNumber,
      question: submissions[0]?.question || null,
      submissions: submissions,
      statistics: {
        totalSubmissions,
        correctSubmissions,
        accuracy: Math.round(accuracy * 100) / 100
      }
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '퀴즈 결과 조회');
    res.status(statusCode).json({ message });
  }
};
// controllers/quizController.ts (업데이트됨)
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

export const submitQuizAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId, questionId, selectedAnswer } = req.body;

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

    // 이미 제출했는지 확인
    const existingSubmission = await prisma.quizSubmission.findFirst({
      where: {
        teamId: teamId,
        questionId: questionId
      }
    });

    if (existingSubmission) {
      res.status(400).json({ message: '이미 퀴즈를 제출했습니다.' });
      return;
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

    // 퀴즈 제출 기록 저장
    await prisma.quizSubmission.create({
      data: {
        teamId: teamId,
        questionId: questionId,
        selectedAnswer: selectedAnswer,
        isCorrect: isCorrect,
        submittedAt: new Date(),
        roundNumber: gameState.currentRound
      }
    });

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
    }

    res.json({
      correct: isCorrect,
      correctAnswer: question.correctAnswer,
      bonus: bonus,
      newBalance: newBalance,
      gameState: {
        phase: gameState.phase,
        timeRemaining: gameState.timeRemaining,
        currentRound: gameState.currentRound
      }
    });

  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '퀴즈 제출');
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
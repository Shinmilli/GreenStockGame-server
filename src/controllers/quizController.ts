import { Request, Response } from 'express';
import { prisma } from '../models';
import { GameLogic } from '../models/gameLogic';
import { handleControllerError } from '../utils/errorHandler';

export const getQuizByRound = async (req: Request, res: Response): Promise<void> => {
  try {
    const { round } = req.params;

    const question = await prisma.quizQuestion.findFirst({
      where: { roundNumber: parseInt(round) },
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

    res.json(question);
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

    // 퀴즈 문제 조회
    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      res.status(404).json({ message: '퀴즈 문제를 찾을 수 없습니다.' });
      return;
    }

    const isCorrect = question.correctAnswer === selectedAnswer;

    let bonus = 0;
    let newBalance: number | null = null;

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
      newBalance: newBalance
    });

  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '퀴즈 제출');
    res.status(statusCode).json({ message });
  }
};
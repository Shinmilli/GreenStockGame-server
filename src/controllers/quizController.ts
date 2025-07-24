// controllers/quizController.ts - 완전한 구현
import { Request, Response } from 'express';
import { prisma } from '../models';
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
    const { teamId, questionId, selectedAnswer, force } = req.body;

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

    // 🔥 트랜잭션을 사용하여 중복 제출 완전 방지
    const result = await prisma.$transaction(async (tx) => {
      // 1. 퀴즈 문제 조회
      const question = await tx.quizQuestion.findUnique({
        where: { id: questionId }
      });

      if (!question) {
        throw new Error('퀴즈 문제를 찾을 수 없습니다.');
      }

      // 2. 현재 라운드 문제인지 확인
      if (question.roundNumber !== gameState.currentRound) {
        throw new Error('현재 라운드의 문제가 아닙니다.');
      }

      // 3. 이미 제출했는지 확인 (트랜잭션 내에서)
      const existingSubmission = await tx.quizSubmission.findFirst({
        where: {
          teamId: teamId,
          questionId: questionId
        }
      });

      // 🔥 중복 제출 체크 - force 모드가 아니면 차단
      if (existingSubmission && !force) {
        throw new Error('이미 퀴즈를 제출했습니다. 라운드당 한 번만 제출할 수 있습니다.');
      }

      // 4. force 모드인 경우 기존 제출 기록 삭제
      if (existingSubmission && force) {
        await tx.quizSubmission.delete({
          where: {
            id: existingSubmission.id
          }
        });
        console.log(`🔄 강제 제출 모드: 팀 ${teamId}의 기존 제출 기록 삭제`);
      }

      const isCorrect = question.correctAnswer === selectedAnswer;

      // 5. 퀴즈 제출 기록 저장
      const submission = await tx.quizSubmission.create({
        data: {
          teamId: teamId,
          questionId: questionId,
          selectedAnswer: selectedAnswer,
          isCorrect: isCorrect,
          submittedAt: new Date(),
          roundNumber: gameState.currentRound
        }
      });

      let bonus = 0;
      let newBalance: number | null = null;

      // 6. 정답인 경우 보너스 지급
      if (isCorrect) {
        const team = await tx.team.findUnique({
          where: { id: teamId }
        });

        if (!team) {
          throw new Error('팀을 찾을 수 없습니다.');
        }

        const currentBalance = Number(team.balance);
        bonus = Math.floor(currentBalance * 0.02); // 2% 보너스

        // 팀 정보 업데이트
        const updatedTeam = await tx.team.update({
          where: { id: teamId },
          data: {
            balance: currentBalance + bonus,
            quizScore: team.quizScore + 10 // 정답 시 10점 추가
          }
        });

        newBalance = Number(updatedTeam.balance);
        console.log(`✅ 팀 ${teamId} 퀴즈 정답! 보너스: ${bonus}원, 새 잔액: ${newBalance}원`);
      } else {
        console.log(`❌ 팀 ${teamId} 퀴즈 오답`);
      }

      return {
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
        bonus: bonus,
        newBalance: newBalance,
        submissionId: submission.id,
        explanation: getQuizExplanation(question.roundNumber, isCorrect)
      };
    });

    res.json({
      ...result,
      gameState: {
        phase: gameState.phase,
        timeRemaining: gameState.timeRemaining,
        currentRound: gameState.currentRound
      }
    });

  } catch (error: any) {
    console.error('퀴즈 제출 오류:', error);
    
    if (error.message?.includes('이미 퀴즈를 제출')) {
      res.status(409).json({ 
        message: '이미 이 라운드의 퀴즈를 제출했습니다. 라운드당 한 번만 제출할 수 있습니다.',
        errorCode: 'ALREADY_SUBMITTED',
        canForceSubmit: true,
        gameState: {
          phase: gameState.phase,
          timeRemaining: gameState.timeRemaining,
          currentRound: gameState.currentRound
        }
      });
    } else {
      const { message, statusCode } = handleControllerError(error, '퀴즈 제출');
      res.status(statusCode).json({ 
        message,
        gameState: {
          phase: gameState.phase,
          timeRemaining: gameState.timeRemaining,
          currentRound: gameState.currentRound
        }
      });
    }
  }
};

// 🔥 팀의 퀴즈 제출 상태 확인 함수
export const getQuizStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId, round } = req.params;
    const roundNumber = parseInt(round);

    if (!teamId || isNaN(roundNumber)) {
      res.status(400).json({ message: '올바른 팀 ID와 라운드를 입력해주세요.' });
      return;
    }

    // 해당 라운드의 퀴즈 문제 찾기
    const question = await prisma.quizQuestion.findFirst({
      where: { roundNumber: roundNumber }
    });

    if (!question) {
      res.status(404).json({ message: '해당 라운드의 퀴즈를 찾을 수 없습니다.' });
      return;
    }

    // 제출 기록 확인
    const submission = await prisma.quizSubmission.findFirst({
      where: {
        teamId: parseInt(teamId),
        questionId: question.id
      }
    });

    const hasSubmitted = !!submission;
    const canSubmit = gameState.isActive && 
                     gameState.phase === 'quiz' && 
                     gameState.currentRound === roundNumber &&
                     !hasSubmitted;

    res.json({
      hasSubmitted: hasSubmitted,
      canSubmit: canSubmit,
      submission: submission ? {
        selectedAnswer: submission.selectedAnswer,
        isCorrect: submission.isCorrect,
        submittedAt: submission.submittedAt
      } : null,
      gameState: {
        phase: gameState.phase,
        timeRemaining: gameState.timeRemaining,
        currentRound: gameState.currentRound,
        isActive: gameState.isActive
      }
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '퀴즈 상태 조회');
    res.status(statusCode).json({ message });
  }
};

export const getQuizResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { round } = req.params;
    const roundNumber = parseInt(round);

    if (isNaN(roundNumber)) {
      res.status(400).json({ message: '올바른 라운드 번호를 입력해주세요.' });
      return;
    }

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
            correctAnswer: true,
            options: true
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    });

    // 전체 팀 수 조회
    const totalTeams = await prisma.team.count();

    // 통계 계산
    const totalSubmissions = submissions.length;
    const correctSubmissions = submissions.filter(s => s.isCorrect).length;
    const accuracy = totalSubmissions > 0 ? (correctSubmissions / totalSubmissions) * 100 : 0;

    // 빠른 정답자 순서
    const correctSubmitters = submissions
      .filter(s => s.isCorrect)
      .slice(0, 5) // 상위 5명만
      .map((s, index) => ({
        rank: index + 1,
        team: s.team,
        submittedAt: s.submittedAt
      }));

    res.json({
      roundNumber: roundNumber,
      question: submissions[0]?.question || null,
      submissions: submissions.map(s => ({
        team: s.team,
        selectedAnswer: s.selectedAnswer,
        isCorrect: s.isCorrect,
        submittedAt: s.submittedAt
      })),
      statistics: {
        totalSubmissions,
        correctSubmissions,
        accuracy: Math.round(accuracy * 100) / 100,
        participationRate: `${totalSubmissions} / ${totalTeams}`,
        fastestCorrect: correctSubmitters,
        totalTeams: totalTeams
      }
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '퀴즈 결과 조회');
    res.status(statusCode).json({ message });
  }
};

// 🔥 관리자용 퀴즈 제출 기록 삭제 함수들
export const clearAllQuizSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await prisma.quizSubmission.deleteMany({});
    
    console.log(`🗑️ 모든 퀴즈 제출 기록 삭제: ${result.count}개`);
    
    res.json({
      message: `모든 퀴즈 제출 기록을 삭제했습니다. (${result.count}개)`,
      deletedCount: result.count
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '퀴즈 기록 전체 삭제');
    res.status(statusCode).json({ message });
  }
};

export const clearTeamQuizSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId, round } = req.params;
    const roundNumber = parseInt(round);
    const parsedTeamId = parseInt(teamId);

    if (isNaN(parsedTeamId) || isNaN(roundNumber)) {
      res.status(400).json({ message: '올바른 팀 ID와 라운드 번호를 입력해주세요.' });
      return;
    }

    // 해당 라운드의 퀴즈 문제 찾기
    const question = await prisma.quizQuestion.findFirst({
      where: { roundNumber: roundNumber }
    });

    if (!question) {
      res.status(404).json({ message: '해당 라운드의 퀴즈를 찾을 수 없습니다.' });
      return;
    }

    // 특정 팀의 퀴즈 제출 기록 삭제
    const result = await prisma.quizSubmission.deleteMany({
      where: {
        teamId: parsedTeamId,
        questionId: question.id
      }
    });

    console.log(`🗑️ 팀 ${teamId}의 라운드 ${round} 퀴즈 제출 기록 삭제: ${result.count}개`);

    res.json({
      message: `팀 ${teamId}의 라운드 ${round} 퀴즈 제출 기록을 삭제했습니다. (${result.count}개)`,
      deletedCount: result.count
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '팀 퀴즈 기록 삭제');
    res.status(statusCode).json({ message });
  }
};

// 🔥 현재 진행 중인 퀴즈의 실시간 통계 조회
export const getLiveQuizStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!gameState.isActive || gameState.phase !== 'quiz') {
      res.status(400).json({ 
        message: '현재 퀴즈가 진행 중이 아닙니다.',
        gameState: {
          phase: gameState.phase,
          isActive: gameState.isActive
        }
      });
      return;
    }

    const currentRound = gameState.currentRound;

    // 현재 라운드 퀴즈 문제 찾기
    const question = await prisma.quizQuestion.findFirst({
      where: { roundNumber: currentRound }
    });

    if (!question) {
      res.status(404).json({ message: '현재 라운드의 퀴즈를 찾을 수 없습니다.' });
      return;
    }

    // 실시간 제출 통계
    const submissions = await prisma.quizSubmission.findMany({
      where: { 
        questionId: question.id,
        roundNumber: currentRound
      },
      include: {
        team: {
          select: {
            code: true,
            name: true
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    });

    const totalTeams = await prisma.team.count();
    const submittedCount = submissions.length;
    const correctCount = submissions.filter(s => s.isCorrect).length;
    const accuracy = submittedCount > 0 ? (correctCount / submittedCount) * 100 : 0;

    // 선택지별 분포
    const answerDistribution = [0, 1, 2, 3].map(optionIndex => ({
      option: optionIndex,
      count: submissions.filter(s => s.selectedAnswer === optionIndex).length,
      percentage: submittedCount > 0 ? 
        Math.round((submissions.filter(s => s.selectedAnswer === optionIndex).length / submittedCount) * 100) : 0
    }));

    res.json({
      roundNumber: currentRound,
      questionId: question.id,
      gameState: {
        phase: gameState.phase,
        timeRemaining: gameState.timeRemaining,
        isActive: gameState.isActive
      },
      stats: {
        totalTeams,
        submittedCount,
        remainingCount: totalTeams - submittedCount,
        correctCount,
        accuracy: Math.round(accuracy * 100) / 100,
        participationRate: Math.round((submittedCount / totalTeams) * 100)
      },
      answerDistribution,
      recentSubmissions: submissions.slice(-5).map(s => ({
        team: s.team,
        isCorrect: s.isCorrect,
        submittedAt: s.submittedAt
      }))
    });
  } catch (error) {
    const { message, statusCode } = handleControllerError(error, '실시간 퀴즈 통계 조회');
    res.status(statusCode).json({ message });
  }
};

// 퀴즈 설명 생성 함수
function getQuizExplanation(roundNumber: number, isCorrect: boolean): string {
  const explanations: Record<number, { correct: string, incorrect: string }> = {
    1: {
      correct: "정답입니다! ESG는 Environment(환경), Social(사회), Governance(지배구조)를 의미합니다.",
      incorrect: "ESG는 Environment(환경), Social(사회), Governance(지배구조)의 줄임말입니다."
    },
    2: {
      correct: "맞습니다! 전기차 1대가 연간 약 5톤의 CO2 배출량을 절약합니다.",
      incorrect: "전기차 1대는 연간 약 5톤의 CO2 배출량을 절약합니다."
    },
    3: {
      correct: "정답입니다! 천연가스는 화석연료로 재생에너지가 아닙니다.",
      incorrect: "천연가스는 화석연료입니다. 태양광, 풍력, 수력이 재생에너지입니다."
    },
    4: {
      correct: "맞습니다! 플라스틱은 자연 분해되는데 약 500년이 걸립니다.",
      incorrect: "플라스틱은 자연 분해되는데 약 500년이라는 매우 긴 시간이 걸립니다."
    },
    5: {
      correct: "정답입니다! 식물성 고기는 기존 육류 대비 약 90%의 물을 절약합니다.",
      incorrect: "식물성 고기는 기존 육류 생산 대비 약 90%의 물을 절약할 수 있습니다."
    },
    6: {
      correct: "맞습니다! 전 세계 약 20억 명이 깨끗한 물에 접근할 수 없습니다.",
      incorrect: "전 세계 약 20억 명이 깨끗한 물에 접근하지 못하고 있습니다."
    },
    7: {
      correct: "정답입니다! 유기농업은 기존 농업 대비 약 30% 생물다양성을 증가시킵니다.",
      incorrect: "유기농업은 기존 농업 대비 약 30% 생물다양성을 증가시킵니다."
    },
    8: {
      correct: "맞습니다! 현재 탄소 포집 기술로 연간 약 1,000만톤의 CO2를 처리할 수 있습니다.",
      incorrect: "현재 탄소 포집 기술로 연간 약 1,000만톤의 CO2를 처리할 수 있습니다."
    }
  };

  const explanation = explanations[roundNumber];
  if (!explanation) {
    return isCorrect ? "정답입니다!" : "다음에 더 좋은 결과를 기대합니다!";
  }

  return isCorrect ? explanation.correct : explanation.incorrect;
}
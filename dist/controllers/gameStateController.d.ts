import { Request, Response } from 'express';
interface GameState {
    currentRound: number;
    phase: 'news' | 'quiz' | 'trading' | 'results' | 'finished';
    timeRemaining: number;
    isActive: boolean;
    startTime?: Date;
    endTime?: Date;
}
declare let gameState: GameState;
export declare const getGameState: (req: Request, res: Response) => Promise<void>;
export declare const startGame: (req: Request, res: Response) => Promise<void>;
export declare const resetGame: (req: Request, res: Response) => Promise<void>;
export declare const forceNextPhase: (req: Request, res: Response) => Promise<void>;
export declare function broadcastGameState(): void;
export { gameState };
//# sourceMappingURL=gameStateController.d.ts.map
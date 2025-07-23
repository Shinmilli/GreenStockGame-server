export declare class GameLogic {
    static calculateFee(amount: number): number;
    static buyStock(teamId: number, stockId: number, quantity: number): Promise<boolean>;
    static giveQuizReward(teamId: number): Promise<number>;
    static sellStock(teamId: number, stockId: number, quantity: number): Promise<boolean>;
}
//# sourceMappingURL=gameLogic.d.ts.map
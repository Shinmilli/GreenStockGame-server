export declare function getErrorMessage(error: unknown): string;
export declare function logError(context: string, error: unknown): void;
export declare function handleControllerError(error: unknown, context?: string): {
    message: string;
    statusCode: number;
};
export declare function handlePrismaError(error: unknown): {
    message: string;
    statusCode: number;
};
export declare function validateRequired(value: any, fieldName: string): void;
export declare function validatePositiveNumber(value: any, fieldName: string): number;
//# sourceMappingURL=errorHandler.d.ts.map
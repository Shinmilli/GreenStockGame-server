// 간단하고 실용적인 에러 핸들러

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return '알 수 없는 오류가 발생했습니다.';
}

export function logError(context: string, error: unknown): void {
  console.error(`[${context}] 오류:`, error);
}

// HTTP 상태 코드와 함께 에러 처리
export function handleControllerError(
  error: unknown, 
  context: string = '서버'
): { message: string; statusCode: number } {
  logError(context, error);
  
  const message = getErrorMessage(error);
  
  // 특정 에러 메시지에 따른 상태 코드 결정
  if (message.includes('찾을 수 없습니다') || message.includes('존재하지 않')) {
    return { message, statusCode: 404 };
  }
  
  if (message.includes('부족합니다') || message.includes('권한이 없습니다') || 
      message.includes('필수') || message.includes('잘못된')) {
    return { message, statusCode: 400 };
  }
  
  if (message.includes('이미 존재')) {
    return { message, statusCode: 409 };
  }
  
  return { message, statusCode: 500 };
}

// Prisma 에러 처리
export function handlePrismaError(error: unknown): { message: string; statusCode: number } {
  const message = getErrorMessage(error);
  
  if (message.includes('Unique constraint failed')) {
    return { message: '이미 존재하는 데이터입니다.', statusCode: 409 };
  }
  
  if (message.includes('Foreign key constraint failed')) {
    return { message: '참조하는 데이터가 존재하지 않습니다.', statusCode: 400 };
  }
  
  if (message.includes('Record to delete does not exist')) {
    return { message: '삭제하려는 데이터가 존재하지 않습니다.', statusCode: 404 };
  }
  
  return { message: '데이터베이스 오류가 발생했습니다.', statusCode: 500 };
}

// 입력값 검증 헬퍼
export function validateRequired(value: any, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName}은(는) 필수 항목입니다.`);
  }
}

export function validatePositiveNumber(value: any, fieldName: string): number {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    throw new Error(`${fieldName}은(는) 0보다 큰 숫자여야 합니다.`);
  }
  return num;
}
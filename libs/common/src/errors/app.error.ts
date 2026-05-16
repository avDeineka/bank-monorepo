// libs/common/src/errors/app.error.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;

  constructor(message: string, statusCode: number = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    
    // Відновлюємо прототип, бо ми наслідуємося від вбудованого класу Error
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
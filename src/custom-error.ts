/* eslint-disable import/prefer-default-export */
import { ErrorLevel, HttpErrorResponse, RegisterableError } from './types';

export class CustomError extends Error implements RegisterableError {
  public level: ErrorLevel = 'error';

  public errorToHttpResponse(): HttpErrorResponse {
    return {
      code: this.getErrorName(),
      message: this.message,
      statusCode: 500
    };
  }

  public getErrorName(): string {
    return this.constructor.name;
  }
}

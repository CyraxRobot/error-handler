/* eslint-disable import/prefer-default-export */
import { HttpErrorResponse } from './types';
import { CustomError } from './custom-error';

export class HttpError extends CustomError {
  public statusCode: number;

  constructor(message?: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }

  public errorToHttpResponse(): HttpErrorResponse {
    return {
      code: this.getErrorName(),
      message: this.message,
      statusCode: this.statusCode
    };
  }
}

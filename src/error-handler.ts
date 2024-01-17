/* eslint-disable import/prefer-default-export */
/* eslint-disable class-methods-use-this */
import {
  HttpErrorResponse, RegisterableError, RethrowableError, ContextInt
} from './types';

type RegisterableErrorClass = new (...args: any[]) => RegisterableError;
type RethrowableErrorClass = new (...args: any[]) => RethrowableError;

type MessageFormatter<T> = (msg: HttpErrorResponse) => T;

export class ErrorHandler<T=HttpErrorResponse> {

  private formatMessage: MessageFormatter<T>  = (msg) => msg as T & HttpErrorResponse;

  public constructor(
    options: { 
      stackTraceLimit?: number,
      formatMessage?: MessageFormatter<T>
    } = { }
  ) {
    if (options.stackTraceLimit) {
      Error.stackTraceLimit = options.stackTraceLimit ?? 10;
    }

    if (options.formatMessage) {
      this.formatMessage = options.formatMessage;
    }
  }

  private registeredErrors: Record<string, RegisterableErrorClass> = {};

  private wrappedErrors: Record<string, RethrowableErrorClass> = {};

  public registerError(errorClass: RegisterableErrorClass): void {
    this.registeredErrors[errorClass.name] = errorClass;
  }

  public unregisterError(errorClass: RegisterableErrorClass): void {
    delete this.registeredErrors[errorClass.name];
  }

  public wrapAs(errorClassToWrap: new (...args: any[]) => Error, errorClass: RethrowableErrorClass): void {
    this.wrappedErrors[errorClassToWrap.name] = errorClass;
  }

  public unwrap(errorClassUnWrap: new (...args: any[]) => Error): void {
    delete this.wrappedErrors[errorClassUnWrap.name];
  }

  public handle(error: Error, context: ContextInt): void {
    const { logger } = context;
    if (!(error instanceof Error)) {
      logger.fatal(`Unexpected error. Instance of error expected. Given error type: ${typeof error}`);
      return;
    }
    if (this.isWrapedError(error)) {
      const ErrorClassToRethrow = this.wrappedErrors[error.constructor.name];
      const wrappedError = new ErrorClassToRethrow(error.message, error);
      logger[wrappedError.level](wrappedError);
    }

    if (this.isRegisteredError(error)) {
      logger[error.level](error);
    } else {
      logger.error(error);
    }
  }

  private isRegisteredError(error: Error): error is RegisterableError {
    return ('getErrorName' in error) && (<RegisterableError>error).getErrorName() in this.registeredErrors;
  }

  private isWrapedError(error: Error): boolean {
    return error.constructor.name in this.wrappedErrors;
  }

  private static isDevEnv(): boolean {
    return process.env.ENV_NAME === 'dev';
  }

  private withStack(error: Error, errorResponse: HttpErrorResponse): HttpErrorResponse {
    if (ErrorHandler.isDevEnv()) {
      return { ...errorResponse, stack: error.stack || '[no stack]' };
    }
    return errorResponse;
  }

  public errorToHttpResponse(error: Error): T {
    if (this.isWrapedError(error)) {
      const ErrorClassToRethrow = this.wrappedErrors[error.constructor.name];
      const wrappedError = new ErrorClassToRethrow(error.message, error);
      return this.formatMessage(
        this.withStack(wrappedError, wrappedError.errorToHttpResponse())
      );
    }

    if (this.isRegisteredError(error)) {
      return this.formatMessage(
        this.withStack(error, error.errorToHttpResponse())
      );
    }

    const response: T = this.formatMessage(
      this.withStack(error, {
        code: 'UnknownError',
        message: error.message,
        statusCode: 500
      })
    );

    return response;
  }
}
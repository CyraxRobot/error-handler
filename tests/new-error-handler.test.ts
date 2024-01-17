/* eslint-disable max-classes-per-file */
import { ErrorHandler } from '../src/error-handler';
import { CustomError } from '../src/custom-error';
import { ErrorLevel, HttpErrorResponse } from '../src/types';
import { RethrownError } from '../src/rethrown-error';
import { EOL } from 'os';

describe('[LIB] Error Handler', () => {
  it('should return unknown error', () => {
    const errorHandler = new ErrorHandler();
    const someError = new Error('[Error]');
    const response = errorHandler.errorToHttpResponse(someError);
    expect(response).toEqual({
      code: 'UnknownError',
      message: '[Error]',
      statusCode: 500
    });
  });

  it('should return custom error if it is registered', () => {
    const errorHandler = new ErrorHandler();
    errorHandler.registerError(CustomError);
    const someError = new CustomError('[CustomError]');
    const response = errorHandler.errorToHttpResponse(someError);
    expect(response).toEqual({
      code: 'CustomError',
      message: '[CustomError]',
      statusCode: 500
    });
    expect(someError.level).toBe('error');
  });

  it('should treat custom error as unknown error if it does not registered', () => {
    const errorHandler = new ErrorHandler();
    const someError = new CustomError('[UnknownError]');
    const response = errorHandler.errorToHttpResponse(someError);
    expect(response).toEqual({
      code: 'UnknownError',
      message: '[UnknownError]',
      statusCode: 500
    });
    expect(someError.level).toBe('error');
  });

  it('should use statusCode inside custom error class', () => {
    const errorHandler = new ErrorHandler();
    const expectedStatus = 303;
    const ErrorClassWithStatus = class extends CustomError {
      public level: ErrorLevel = 'warn';

      public getErrorName(): string {
        return this.constructor.name;
      }

      public errorToHttpResponse(): HttpErrorResponse {
        return {
          code: this.getErrorName(),
          statusCode: expectedStatus,
          message: this.message
        };
      }
    };
    errorHandler.registerError(ErrorClassWithStatus);
    const errInstance = new ErrorClassWithStatus('[anonymError]');
    const response = errorHandler.errorToHttpResponse(errInstance);
    expect(response).toEqual({
      code: 'ErrorClassWithStatus',
      message: '[anonymError]',
      statusCode: expectedStatus
    });
    expect(errInstance.level).toBe('warn');
  });

  it('should properly handle inherited errors when both are registered', () => {
    const errorHandler = new ErrorHandler();
    const expectedStatus = 303;
    const ParentError = class extends CustomError {
      public level: ErrorLevel = 'warn';

      public getErrorName(): string {
        return this.constructor.name;
      }

      public errorToHttpResponse(): HttpErrorResponse {
        return {
          code: this.getErrorName(),
          statusCode: expectedStatus,
          message: this.message
        };
      }
    };
    const ChildError = class extends ParentError {
      public level: ErrorLevel = 'fatal';

      public getErrorName(): string {
        return this.constructor.name;
      }

      public errorToHttpResponse(): HttpErrorResponse {
        return {
          code: this.getErrorName(),
          statusCode: 400,
          message: this.message
        };
      }
    };
    errorHandler.registerError(ParentError);
    errorHandler.registerError(ChildError);
    const errInstance = new ParentError('[anonymError]');
    const response = errorHandler.errorToHttpResponse(errInstance);
    expect(response).toEqual({
      code: 'ParentError',
      message: '[anonymError]',
      statusCode: expectedStatus
    });
    expect(errInstance.level).toBe('warn');

    const errInstanceChild = new ChildError('[anonymError]');
    const responseChild = errorHandler.errorToHttpResponse(errInstanceChild);
    expect(responseChild).toEqual({
      code: 'ChildError',
      message: '[anonymError]',
      statusCode: 400
    });
    expect(errInstanceChild.level).toBe('fatal');
  });

  it('should propery wrap errors', () => {
    const errorHandler = new ErrorHandler();
    const expectedStatus = 400;
    const SomeRawError = class extends Error {};
    const CatchedError = class extends RethrownError {
      public level: ErrorLevel = 'fatal';

      public getErrorName(): string {
        return this.constructor.name;
      }

      public errorToHttpResponse(): HttpErrorResponse {
        return {
          code: this.getErrorName(),
          statusCode: 400,
          message: this.message
        };
      }
    };
    errorHandler.wrapAs(SomeRawError, CatchedError);
    const errInstance = new SomeRawError('[anonymError]');
    const response = errorHandler.errorToHttpResponse(errInstance);
    expect(response).toEqual({
      code: 'CatchedError',
      message: '[anonymError]',
      statusCode: expectedStatus
    });
  });

  it('should invoke wrapped not registered if a class is both registered and wrapped', () => {
    const errorHandler = new ErrorHandler();
    const isWrapedErrorMock = jest
      .spyOn(errorHandler, 'isWrapedError' as any);

    const isRegisteredErrorMock = jest
      .spyOn(errorHandler, 'isRegisteredError' as any);
    const expectedStatus = 400;
    const SomeRawError = class extends Error {};
    const CatchedError = class extends RethrownError {
      public level: ErrorLevel = 'fatal';

      public getErrorName(): string {
        return this.constructor.name;
      }

      public errorToHttpResponse(): HttpErrorResponse {
        return {
          code: this.getErrorName(),
          statusCode: 400,
          message: this.message
        };
      }
    };
    errorHandler.registerError(CatchedError);
    errorHandler.wrapAs(SomeRawError, CatchedError);
    const errInstance = new SomeRawError('[anonymError]');
    const response = errorHandler.errorToHttpResponse(errInstance);
    expect(isWrapedErrorMock).toHaveBeenCalled();
    expect(isRegisteredErrorMock).not.toHaveBeenCalled();
    expect(response).toEqual({
      code: 'CatchedError',
      message: '[anonymError]',
      statusCode: expectedStatus
    });
  });


  it('should transform http response if format message is set in constructor [registered error]', () => {
    type CustomHttpResponse = {
      status: number,
      msg: string
    };
    const errorHandler = new ErrorHandler<CustomHttpResponse>({ formatMessage: (msg) => {
      return {
        msg: msg.message,
        status: msg.statusCode
      };
    } });

    errorHandler.registerError(CustomError);

    const errInstance = new CustomError('Some internal error');
    const response = errorHandler.errorToHttpResponse(errInstance);
    expect(response).toStrictEqual({
      msg: errInstance.message,
      status: 500
    });

  });

  it('should transform http response if format message is set in constructor [unknown error]', () => {
    type CustomHttpResponse = {
      status: number,
      msg: string
    };
    const errorHandler = new ErrorHandler<CustomHttpResponse>({ formatMessage: (msg) => {
      return {
        msg: msg.message,
        status: msg.statusCode
      };
    } });

    const errInstance = new Error('Some internal error');
    const response = errorHandler.errorToHttpResponse(errInstance);
    expect(response).toStrictEqual({
      msg: errInstance.message,
      status: 500
    });

  });

  it('should transform http response if format message is set in constructor [rethrown error]', () => {
    type CustomHttpResponse = {
      status: number,
      msg: string,
      c: string
    };
    const errorHandler = new ErrorHandler<CustomHttpResponse>({ formatMessage: (msg) => {
      return {
        msg: msg.message,
        status: msg.statusCode,
        c: msg.code
      };
    } });

    const CatchedError = class extends RethrownError {
      public level: ErrorLevel = 'fatal';

      public getErrorName(): string {
        return this.constructor.name;
      }

      public errorToHttpResponse(): HttpErrorResponse {
        return {
          code: this.getErrorName(),
          statusCode: 444,
          message: this.message
        };
      }
    };
    const SomeInternalError = class extends Error {};
    errorHandler.wrapAs(SomeInternalError, CatchedError);
    const errInstance = new SomeInternalError('Some internal error');
    const response = errorHandler.errorToHttpResponse(errInstance);
    expect(response).toStrictEqual({
      msg: errInstance.message,
      status: 444,
      c: 'CatchedError'
    });

  });

  it('should reduce stack trace size if appropriate value is set in constructor', () => {
    process.env.ENV_NAME = 'dev';
    const stackTraceLimit = 2;
    const errorHandler = new ErrorHandler({ stackTraceLimit });
    const expectedStatus = 303;
    const ErrorClassWithStatus = class extends CustomError {
      public level: ErrorLevel = 'warn';

      public getErrorName(): string {
        return this.constructor.name;
      }

      public errorToHttpResponse(): HttpErrorResponse {
        return {
          code: this.getErrorName(),
          statusCode: expectedStatus,
          message: this.message
        };
      }
    };
    errorHandler.registerError(ErrorClassWithStatus);

    const a = () => {
      throw new ErrorClassWithStatus('[anonymError]');
    };
    const b = () => a();
    const c = () => b();
    const d = () => c();

    const catchAndReturn = (fn: () => void): Error | null => {
      try {
        fn();
        return null;
      } catch (err) {
        return err as Error;
      }
    };
    const errInstance = catchAndReturn(d) as Error;
    const response = errorHandler.errorToHttpResponse(errInstance);
    // console.log(response.stack);
    expect(response.stack?.split(EOL).length).toEqual(stackTraceLimit + 1);
  });
  
});
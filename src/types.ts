/* eslint-disable @typescript-eslint/ban-types */

export type HttpErrorResponse = {
  statusCode: number,
  message: string,
  code: string,
  stack?: string | undefined,
  details?: unknown
};

type LogLevelString = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type ErrorLevel = LogLevelString;

export interface RegisterableError extends Error {
  errorToHttpResponse(): HttpErrorResponse;
  getErrorName(): string;
  level: LogLevelString;
}

export interface RethrowableError extends RegisterableError {
  originalError?: Error;
  stackBeforeRethrow?: string;
}

export interface ContextInt {
  logger: LoggerInt;
  [t: string]: unknown;
}

export interface LoggerInt {
  child(options: Object, simple?: boolean): LoggerInt;
  trace(): boolean;
  trace(error: Error, ...params: any[]): void;
  trace(obj: Object, ...params: any[]): void;
  trace(format: any, ...params: any[]): void;

  debug(): boolean;
  debug(error: Error, ...params: any[]): void;
  debug(obj: Object, ...params: any[]): void;
  debug(format: any, ...params: any[]): void;

  info(): boolean;
  info(error: Error, ...params: any[]): void;
  info(obj: Object, ...params: any[]): void;
  info(format: any, ...params: any[]): void;

  warn(): boolean;
  warn(error: Error, ...params: any[]): void;
  warn(obj: Object, ...params: any[]): void;
  warn(format: any, ...params: any[]): void;

  error(): boolean;
  error(error: Error, ...params: any[]): void;
  error(obj: Object, ...params: any[]): void;
  error(format: any, ...params: any[]): void;

  fatal(): boolean;
  fatal(error: Error, ...params: any[]): void;
  fatal(obj: Object, ...params: any[]): void;
  fatal(format: any, ...params: any[]): void;
}

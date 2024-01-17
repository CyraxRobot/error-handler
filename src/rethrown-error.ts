/* eslint-disable import/prefer-default-export */
import { CustomError } from './custom-error';
import { RethrowableError } from './types';

export class RethrownError extends CustomError implements RethrowableError {
  public originalError?: Error;

  public stackBeforeRethrow?: string;

  constructor(message: string, error: Error) {
    super(message);
    this.name = this.constructor.name;
    if (!error) {
      throw new Error('RethrownError requires a message and error');
    }

    Object.defineProperty(this, 'originalError', {
      configurable: false,
      enumerable: false,
      value: error
    });

    Object.defineProperty(this, 'stackBeforeRethrow', {
      configurable: false,
      enumerable: false,
      value: this.stack
    });

    const messageLines = (this.message.match(/\n/g) || []).length + 1;
    this.stack = `${(this.stack || '').split('\n').slice(0, messageLines + 1).join('\n')}\n${
      error.stack}`;
  }
}
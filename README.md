## Library to handle all errors globally


### Base errors in the package

`CustomError` is base error from the package that is not linked to any transport
```ts
//usage
const result = someOperation();
if(!result){
  throw new CustomError('result cannot be null');
}
```


`HttpError` is base error for all HTTP errors

```ts
//usage
try {
  const result = await axios.get('/some/use/here');
  if(!result){
    throw new HttpError('Not found', 404);
  }
} catch(err){
  if(isAxiosError(err) && err.response.status === 404){
    throw new HttpError('Some item not found', 404);
  }
  throw err;
}

// or you can implement common errors in service by extending from HttpError

class HierarchyNotFoundError extends HttpError {
  public constructor() {
    super('Hierarchy not found', 404);
  }
}

class AuthorizationFailedError extends HttpError {
  public constructor(reason: string) {
    super(reason, 401);
  }
}

// and then in code

throw new HierarchyNotFoundError();
throw new AuthorizationFailedError();
```


### API

`./src/initialized-error-handler.ts`
```ts
// There are common errors in the lib, but you can use your own errors
import { CustomError } from '@CyraxRobot/error-handler';

// at first we create instance of ErrorHandler;
export const errorHandler = new ErrorHandler();
// then we should initialize it by registring known errors in our system, so
// errorHandler will be able to catch such types of errors and handle them

errorHandler.registerError(CustomError); // error should implement RegisterableError interface


// or unregister if you want to implement dynamic logic ()
errorHandler.unregisterError(CustomError);



// You can also wrap some system errors (it also registers wraped error)
// in order to simplify process of wraping errors and keep stacktrace such errors
// should implement ThrowableError interface which can be imported from the lib
errorHandler.wrapAs(SyntaxError, InvalidJsonError);

// or unwrap
errorHandler.unwrap(InvalidJsonError);
```


`/src/errors/CustomError`
```ts
import { ErrorLevel, HttpErrorResponse, RegisterableError } from './types';

export class SomeError extends Error implements RegisterableError {
  public level: ErrorLevel = 'error'; // this field indicates severity of the error (basicaly use it un order to indicate log lever of errors)

  public errorToHttpResponse(): HttpErrorResponse {
    return {
      code: this.getErrorName(),
      message: this.message,
      statusCode: 500
    };
  }

  public getErrorName(): string { // this method need in order to reliably catch such errors and use name of the error as code
    return this.constructor.name;
  }
}

```
`./src/errors/InvalidJsonError`

```ts

// here is example how you can wrap SyntaxError
import { HttpErrorResponse, ErrorLevel, RethrownError } from '@CyraxRobot/error-handler';

export class InvalidJsonError extends RethrownError {
  public level = 'warn' as ErrorLevel;

  public errorToHttpResponse(): HttpErrorResponse {
    return {
      code: this.getErrorName(),
      message: this.message,
      statusCode: 400
    };
  }
}

```

 Here is format of all errors

```ts
export type HttpErrorResponse = {
  statusCode: number, // HTTP status code
  message: string, // description of the error
  code: string, // can be used by consumers to identify type of the error
  stack?: string | undefined, // only in dev environment (process.env.ENV_NAME === 'dev')
  details?: unknown // use it if you want to add additional info in error like validation errors and etc.
};

```



```ts
// how to customize error-handler

type CustomHttpResponse = {
  msg: string,
  status: string,
  c: string,
  stack?: string
}

export const errorHandler = new ErrorHandler<CustomHttpResponse>({ 
  stackTraceLimit: 2 // reduces or increases number of entries in stack trace (default: 10),
  formatMessage: (msg) => {
      return {
        msg: msg.message,
        status: msg.statusCode,
        c: msg.code,
        statck: msg.stack
      };
    }
});

errorHandler.register(CustomError);

// in another file 

// response is typed here (so it is type-safe to call fields)
const response = errorHandler.errorToHttpResponse(new Error('something'));
/*
 response output
 {
  msg: 'something',
  status: 500,
  c: 'Error',
  stack: <stack with chain of last 2 calls in it>
  }
*/
```


## Usage

1. At first create file under root dir and call it `initialized-error-handler.ts`
2. Then initialize it with default errors from the package
```ts
import { ErrorHandler, CustomError, HttpError } from '@CyraxRobot/error-handler';
import AuthorizationError from './errors/authorization-error';

const errorHandler = new ErrorHandler();

errorHandler.registerError(CustomError);
errorHandler.registerError(HttpError);
export { errorHandler };

```
3. convert all existing errors to respect RegisterableError interface
```ts
export interface RegisterableError extends Error {
  errorToHttpResponse(): HttpErrorResponse;
  getErrorName(): string;
  level: LogLevelString;
}

class SomeError implements RegisterableError {
  // implement all required fields
}

// or extend error from CustomError/HttpError
 class SomeError extends CustomError {
  // implement all required fields
}

```

4. use `initialized-error-handler.ts`  everywhere where you need to handle errors
```ts

//some lambda
export function handle(){
  try {

  } catch(err){
    errorHandler.handle(err);
    // and rethrow if lambda should die
    throw err;
  }
}


// express

app.use((err, req, res, next) => {
  errorHandler.handle(err);
  const response = errorHandler.errorToHttpResponse(err);
  res.status(response.statusCode).json(response);
})
```
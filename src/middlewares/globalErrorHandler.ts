import { ErrorRequestHandler } from 'express';
import httpStatus from 'http-status';
import { Prisma } from '../../prisma/generated/index';
import ApiError from '../utils/ApiError';
import config from '../config/index';

type TErrorSource = {
  path: string | number;
  message: string;
}[];

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Something went wrong!';
  let errorSources: TErrorSource = [{ path: '', message: 'Something went wrong!' }];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [{ path: '', message: err.message }];
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = httpStatus.CONFLICT;
      message = 'Duplicate entry found';
      errorSources = [
        {
          path: (err.meta?.target as string[])?.join(', ') || '',
          message: 'A record with this value already exists',
        },
      ];
    } else if (err.code === 'P2025') {
      statusCode = httpStatus.NOT_FOUND;
      message = 'Resource not found';
      errorSources = [{ path: '', message: (err.meta?.cause as string) || err.message }];
    } else if (err.code === 'P2003') {
      statusCode = httpStatus.CONFLICT;
      message = 'This action is blocked by related records';
      errorSources = [
        {
          path: (err.meta?.field_name as string) || '',
          message: 'Cannot complete this action because related records still reference it',
        },
      ];
    } else {
      statusCode = httpStatus.BAD_REQUEST;
      message = 'Database Error';
      errorSources = [{ path: '', message: err.message }];
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Validation Error';
    errorSources = [{ path: '', message: 'Invalid data sent to the database' }];
  } else if (err instanceof Error) {
    message = err.message;
    errorSources = [{ path: '', message: err.message }];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    stack: config.env === 'development' ? err?.stack : undefined,
  });
};

export default globalErrorHandler;
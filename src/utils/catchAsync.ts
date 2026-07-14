import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async controller function so any thrown/rejected error
 * is automatically forwarded to Express's error-handling middleware,
 * instead of needing a try/catch in every controller.
 */
const catchAsync = (fn: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((error) => next(error));
  };
};

export default catchAsync;

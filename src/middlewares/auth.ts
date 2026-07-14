import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import { verifyAccessToken } from '../utils/jwt';
import { Role } from '../../prisma/generated/index';

const auth = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = req.cookies?.accessToken;

      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized, please login');
      }

      const decoded = verifyAccessToken(token);

      if (allowedRoles.length && !allowedRoles.includes(decoded.role as Role)) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          'You do not have permission to access this resource',
        );
      }

      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role as Role,
      };

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token'));
      }
    }
  };
};

export default auth;
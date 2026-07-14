import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import config from '../config/index';

export type TJwtPayload = {
  id: number;
  email: string;
  role: string;
};

const signToken = (
  payload: TJwtPayload,
  secret: string,
  expiresIn: SignOptions['expiresIn'],
): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token: string, secret: string): TJwtPayload & JwtPayload => {
  return jwt.verify(token, secret) as TJwtPayload & JwtPayload;
};

export const generateAccessToken = (payload: TJwtPayload): string =>
  signToken(
    payload,
    config.jwt.access_secret,
    config.jwt.access_expires_in as SignOptions['expiresIn'],
  );

export const generateRefreshToken = (payload: TJwtPayload): string =>
  signToken(
    payload,
    config.jwt.refresh_secret,
    config.jwt.refresh_expires_in as SignOptions['expiresIn'],
  );

export const verifyAccessToken = (token: string) =>
  verifyToken(token, config.jwt.access_secret);

export const verifyRefreshToken = (token: string) =>
  verifyToken(token, config.jwt.refresh_secret);
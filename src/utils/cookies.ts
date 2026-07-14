import { CookieOptions, Response } from 'express';
import config from '../config/index';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: config.env === 'production' ? 'none' : 'lax',
};

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken?: string },
): void => {
  res.cookie('accessToken', tokens.accessToken, cookieOptions);

  if (tokens.refreshToken) {
    res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
  }
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};
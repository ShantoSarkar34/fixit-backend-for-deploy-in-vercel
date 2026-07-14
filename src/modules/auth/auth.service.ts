import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import prisma from '../../lib/prisma';
import ApiError from '../../utils/ApiError';
import config from '../../config/index';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { TLoginPayload, TRegisterPayload } from './auth.interface';

const ALLOWED_REGISTER_ROLES = ['CUSTOMER', 'TECHNICIAN'];

const registerUser = async (payload: TRegisterPayload) => {
  if (!payload.name || !payload.email || !payload.password || !payload.role) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'name, email, password and role are required');
  }

  if (!ALLOWED_REGISTER_ROLES.includes(payload.role)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'role must be either CUSTOMER or TECHNICIAN');
  }

  if (payload.password.length < 6) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'password must be at least 6 characters');
  }

  const existingUser = await prisma.user.findUnique({ where: { email: payload.email } });

  if (existingUser) {
    throw new ApiError(httpStatus.CONFLICT, 'An account with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(payload.password, config.bcrypt_salt_rounds);

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone,
      role: payload.role,
    },
  });

  const tokenPayload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  const { password, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, accessToken, refreshToken };
};

const loginUser = async (payload: TLoginPayload) => {
  if (!payload.email || !payload.password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'email and password are required');
  }

  const user = await prisma.user.findUnique({ where: { email: payload.email } });

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }

  if (user.status === 'BANNED') {
    throw new ApiError(httpStatus.FORBIDDEN, 'This account has been banned');
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }

  const tokenPayload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  const { password, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, accessToken, refreshToken };
};

const refreshAccessToken = async (token: string) => {
  let decoded;

  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User no longer exists');
  }

  if (user.status === 'BANNED') {
    throw new ApiError(httpStatus.FORBIDDEN, 'This account has been banned');
  }

  const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });

  return { accessToken };
};

const getMe = async (userId: number) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const { password, ...userWithoutPassword } = user;

  return userWithoutPassword;
};

export const AuthService = {
  registerUser,
  loginUser,
  refreshAccessToken,
  getMe,
};
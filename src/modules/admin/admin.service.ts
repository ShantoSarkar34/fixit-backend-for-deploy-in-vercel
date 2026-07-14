import httpStatus from 'http-status';
import prisma from '../../lib/prisma';
import ApiError from '../../utils/ApiError';
import { Prisma, Role, UserStatus } from '../../../prisma/generated/index';
import { TUpdateUserStatusPayload, TUserFilters } from './admin.interface';

const getAllUsers = async (filters: TUserFilters) => {
  const { role, status, search } = filters;

  const where: Prisma.UserWhereInput = {};

  if (role) {
    where.role = role as Role;
  }

  if (status) {
    where.status = status as UserStatus;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
    ];
  }

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      technicianProfile: {
        select: { id: true, averageRating: true, totalReviews: true, isVerified: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const updateUserStatus = async (id: number, payload: TUpdateUserStatusPayload) => {
  const { status } = payload;

  if (!status || !['ACTIVE', 'BANNED'].includes(status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'status must be either ACTIVE or BANNED');
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.role === 'ADMIN') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Cannot change the status of an admin account');
  }

  return prisma.user.update({
    where: { id },
    data: { status: status as UserStatus },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });
};

export const AdminService = {
  getAllUsers,
  updateUserStatus,
};
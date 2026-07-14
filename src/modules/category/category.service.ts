import httpStatus from 'http-status';
import prisma from '../../lib/prisma';
import ApiError from '../../utils/ApiError';
import { TCreateCategoryPayload } from './category.interface';

const createCategory = async (payload: TCreateCategoryPayload) => {
  if (!payload.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category name is required');
  }

  const existing = await prisma.category.findUnique({ where: { name: payload.name } });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, 'A category with this name already exists');
  }

  return prisma.category.create({ data: payload });
};

const getAllCategories = async () => {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
};

export const CategoryService = {
  createCategory,
  getAllCategories,
};
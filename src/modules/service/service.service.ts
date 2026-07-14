import httpStatus from 'http-status';
import prisma from '../../lib/prisma';
import ApiError from '../../utils/ApiError';
import { Prisma } from '../../../prisma/generated/index';
import { TCreateServicePayload, TServiceFilters, TUpdateServicePayload } from './service.interface';

const getAllServices = async (filters: TServiceFilters) => {
  const { categoryId, location, minPrice, maxPrice, search } = filters;

  const where: Prisma.ServiceWhereInput = {};

  if (categoryId) {
    where.categoryId = Number(categoryId);
  }

  if (location) {
    where.technician = {
      location: { contains: location, mode: Prisma.QueryMode.insensitive },
    };
  }

  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: Number(minPrice) } : {}),
      ...(maxPrice ? { lte: Number(maxPrice) } : {}),
    };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
    ];
  }

  return prisma.service.findMany({
    where,
    include: {
      category: true,
      technician: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getServiceById = async (id: number) => {
  return prisma.service.findUnique({
    where: { id },
    include: {
      category: true,
      technician: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
  });
};

const createMyService = async (userId: number, payload: TCreateServicePayload) => {
  const profile = await prisma.technicianProfile.findUnique({ where: { userId } });

  if (!profile) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Create your technician profile before adding services',
    );
  }

  if (
    !payload.categoryId ||
    !payload.title ||
    payload.price === undefined ||
    payload.duration === undefined ||
    !payload.location
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'categoryId, title, price, duration and location are required',
    );
  }

  const category = await prisma.category.findUnique({
    where: { id: Number(payload.categoryId) },
  });

  if (!category) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid categoryId');
  }

  return prisma.service.create({
    data: {
      technicianId: profile.id,
      categoryId: Number(payload.categoryId),
      title: payload.title,
      description: payload.description,
      price: payload.price,
      duration: Number(payload.duration),
      location: payload.location,
      ...(payload.availability ? { availability: payload.availability } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
    },
  });
};

const getMyServices = async (userId: number) => {
  const profile = await prisma.technicianProfile.findUnique({ where: { userId } });

  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Technician profile not found');
  }

  return prisma.service.findMany({
    where: { technicianId: profile.id },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
};

const updateMyService = async (
  userId: number,
  serviceId: number,
  payload: TUpdateServicePayload,
) => {
  const profile = await prisma.technicianProfile.findUnique({ where: { userId } });

  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Technician profile not found');
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });

  if (!service || service.technicianId !== profile.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Service not found');
  }

  return prisma.service.update({
    where: { id: serviceId },
    data: {
      ...(payload.categoryId ? { categoryId: Number(payload.categoryId) } : {}),
      ...(payload.title ? { title: payload.title } : {}),
      ...(payload.description ? { description: payload.description } : {}),
      ...(payload.price !== undefined ? { price: payload.price } : {}),
      ...(payload.duration !== undefined ? { duration: Number(payload.duration) } : {}),
      ...(payload.location ? { location: payload.location } : {}),
      ...(payload.availability ? { availability: payload.availability } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
    },
  });
};

const deleteMyService = async (userId: number, serviceId: number) => {
  const profile = await prisma.technicianProfile.findUnique({ where: { userId } });

  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Technician profile not found');
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });

  if (!service || service.technicianId !== profile.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Service not found');
  }

  const bookingCount = await prisma.booking.count({ where: { serviceId } });

  if (bookingCount > 0) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'Cannot delete a service that has existing bookings. Set isActive to false instead.',
    );
  }

  await prisma.service.delete({ where: { id: serviceId } });

  return null;
};

export const ServiceService = {
  getAllServices,
  getServiceById,
  createMyService,
  getMyServices,
  updateMyService,
  deleteMyService,
};
import httpStatus from 'http-status';
import prisma from '../../lib/prisma.js';
import ApiError from '../../utils/ApiError.js';
import { Prisma } from '../../../prisma/generated/index.js';
import {
  TAvailabilitySlot,
  TTechnicianFilters,
  TUpsertTechnicianProfilePayload,
} from './technician.interface.js';

const getAllTechnicians = async (filters: TTechnicianFilters) => {
  const { categoryId, location, search } = filters;

  const where: Prisma.TechnicianProfileWhereInput = {};

  if (location) {
    where.location = { contains: location, mode: Prisma.QueryMode.insensitive };
  }

  if (categoryId) {
    where.services = { some: { categoryId: Number(categoryId) } };
  }

  if (search) {
    where.OR = [
      { bio: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { user: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
    ];
  }

  return prisma.technicianProfile.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      services: { include: { category: true } },
    },
  });
};

const getTechnicianById = async (id: number) => {
  const technician = await prisma.technicianProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      services: { include: { category: true } },
      reviews: {
        include: {
          customer: { select: { id: true, name: true } },
          service: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      availabilities: {
        where: { status: 'AVAILABLE' },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      },
    },
  });

  if (!technician) return null;

  const { availabilities, ...rest } = technician;
  return { ...rest, availability: availabilities };
};

const upsertMyProfile = async (userId: number, payload: TUpsertTechnicianProfilePayload) => {
  if (!payload.location || payload.yearsExperience === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'location and yearsExperience are required');
  }

  return prisma.technicianProfile.upsert({
    where: { userId },
    update: {
      bio: payload.bio,
      experience: payload.experience,
      yearsExperience: payload.yearsExperience,
      location: payload.location,
    },
    create: {
      userId,
      bio: payload.bio,
      experience: payload.experience,
      yearsExperience: payload.yearsExperience,
      location: payload.location,
    },
  });
};

const getMyProfile = async (userId: number) => {
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId },
    include: {
      services: { include: { category: true } },
      availabilities: true,
    },
  });

  if (!profile) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Technician profile not found. Create one first via PUT /api/technician/profile',
    );
  }

  return profile;
};

const setMyAvailability = async (userId: number, slots: TAvailabilitySlot[]) => {
  const profile = await prisma.technicianProfile.findUnique({ where: { userId } });

  if (!profile) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Create your technician profile before setting availability',
    );
  }

  if (!Array.isArray(slots) || slots.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'slots must be a non-empty array of { date, startTime, endTime }',
    );
  }

  // Only wipe slots that aren't already booked - reserved/completed slots must stay intact
  await prisma.availability.deleteMany({
    where: { technicianId: profile.id, status: 'AVAILABLE' },
  });

  await prisma.availability.createMany({
    data: slots.map((slot) => ({
      technicianId: profile.id,
      date: new Date(slot.date),
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
  });

  return prisma.availability.findMany({
    where: { technicianId: profile.id },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
};

const getMyAvailability = async (userId: number) => {
  const profile = await prisma.technicianProfile.findUnique({ where: { userId } });

  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Technician profile not found');
  }

  return prisma.availability.findMany({
    where: { technicianId: profile.id },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
};

export const TechnicianService = {
  getAllTechnicians,
  getTechnicianById,
  upsertMyProfile,
  getMyProfile,
  setMyAvailability,
  getMyAvailability,
};
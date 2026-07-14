import httpStatus from 'http-status';
import prisma from '../../lib/prisma';
import ApiError from '../../utils/ApiError';
import { Prisma, BookingStatus, Role } from '../../../prisma/generated/index';
import { TBookingFilters, TCreateBookingPayload } from './booking.interface';

const bookingIncludes = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  technician: { select: { id: true, name: true, email: true, phone: true } },
  service: { include: { category: true } },
  availability: true,
  payment: true,
  review: true,
} satisfies Prisma.BookingInclude;

// Only these transitions are allowed, keyed by current status
const ALLOWED_TECHNICIAN_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  PENDING: ['ACCEPTED', 'DECLINED'],
  ACCEPTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
};

const createBooking = async (customerId: number, payload: TCreateBookingPayload) => {
  const { serviceId, availabilityId, address, note } = payload;

  if (!serviceId || !availabilityId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'serviceId and availabilityId are required');
  }

  const customer = await prisma.user.findUnique({ where: { id: customerId } });

  if (!customer || customer.status !== 'ACTIVE') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Your account is not active');
  }

  const service = await prisma.service.findUnique({
    where: { id: Number(serviceId) },
    include: { technician: { include: { user: true } } },
  });

  if (!service || !service.isActive) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Service not found or inactive');
  }

  if (service.technician.user.status !== 'ACTIVE') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This technician is not currently active');
  }

  const availability = await prisma.availability.findUnique({
    where: { id: Number(availabilityId) },
  });

  if (!availability) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Availability slot not found');
  }

  if (availability.technicianId !== service.technicianId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'This availability slot does not belong to the technician offering this service',
    );
  }

  const today = new Date(new Date().toDateString());
  if (availability.date < today) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot book a slot in the past');
  }

  const duplicateActiveBooking = await prisma.booking.findFirst({
    where: {
      customerId,
      serviceId: service.id,
      status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
    },
  });

  if (duplicateActiveBooking) {
    throw new ApiError(httpStatus.CONFLICT, 'You already have an active booking for this service');
  }

  return prisma.$transaction(async (tx) => {
    // Atomically claim the slot: this UPDATE only affects a row if it is
    // still AVAILABLE and genuinely belongs to this service's technician.
    // If two requests race for the same slot, only one UPDATE can match
    // (Postgres serializes writes to the same row), so `count` tells us
    // definitively whether we won the race - no separate locking needed.
    const reserved = await tx.availability.updateMany({
      where: {
        id: availability.id,
        technicianId: service.technicianId,
        status: 'AVAILABLE',
      },
      data: { status: 'RESERVED' },
    });

    if (reserved.count === 0) {
      throw new ApiError(
        httpStatus.CONFLICT,
        'This slot was just booked by someone else. Please choose another slot.',
      );
    }

    const booking = await tx.booking.create({
      data: {
        customerId,
        technicianId: service.technician.userId,
        serviceId: service.id,
        availabilityId: availability.id,
        bookingDate: availability.date,
        address,
        note,
      },
    });

    return tx.booking.findUnique({
      where: { id: booking.id },
      include: bookingIncludes,
    });
  });
};

const getBookings = async (requester: { id: number; role: Role }, filters: TBookingFilters) => {
  const { status, date, technicianId, customerId } = filters;

  const where: Prisma.BookingWhereInput = {};

  if (status) {
    where.status = status as BookingStatus;
  }

  if (date) {
    where.bookingDate = new Date(date);
  }

  if (requester.role === 'CUSTOMER') {
    where.customerId = requester.id;
  } else if (requester.role === 'TECHNICIAN') {
    where.technicianId = requester.id;
  } else if (requester.role === 'ADMIN') {
    if (technicianId) where.technicianId = Number(technicianId);
    if (customerId) where.customerId = Number(customerId);
  }

  return prisma.booking.findMany({
    where,
    include: bookingIncludes,
    orderBy: { createdAt: 'desc' },
  });
};

const getBookingById = async (requester: { id: number; role: Role }, id: number) => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingIncludes,
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  const canAccess =
    requester.role === 'ADMIN' ||
    (requester.role === 'CUSTOMER' && booking.customerId === requester.id) ||
    (requester.role === 'TECHNICIAN' && booking.technicianId === requester.id);

  if (!canAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this booking');
  }

  return booking;
};

const cancelBooking = async (customerId: number, id: number) => {
  const booking = await prisma.booking.findUnique({ where: { id } });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.customerId !== customerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only cancel your own bookings');
  }

  if (booking.status !== 'PENDING') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot cancel a booking with status ${booking.status}`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: bookingIncludes,
    });

    await tx.availability.update({
      where: { id: booking.availabilityId },
      data: { status: 'AVAILABLE' },
    });

    return updated;
  });
};

const updateBookingStatusByTechnician = async (
  technicianUserId: number,
  id: number,
  nextStatus: string,
) => {
  const booking = await prisma.booking.findUnique({ where: { id } });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.technicianId !== technicianUserId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only update bookings assigned to you');
  }

  const allowedNext = ALLOWED_TECHNICIAN_TRANSITIONS[booking.status] || [];

  if (!allowedNext.includes(nextStatus as BookingStatus)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot move booking from ${booking.status} to ${nextStatus}`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id },
      data: { status: nextStatus as BookingStatus },
      include: bookingIncludes,
    });

    if (nextStatus === 'DECLINED') {
      await tx.availability.update({
        where: { id: booking.availabilityId },
        data: { status: 'AVAILABLE' },
      });
    }

    if (nextStatus === 'COMPLETED') {
      await tx.availability.update({
        where: { id: booking.availabilityId },
        data: { status: 'COMPLETED' },
      });
    }

    return updated;
  });
};

export const BookingService = {
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
  updateBookingStatusByTechnician,
};
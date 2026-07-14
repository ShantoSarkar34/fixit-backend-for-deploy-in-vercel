import httpStatus from 'http-status';
import prisma from '../../lib/prisma';
import ApiError from '../../utils/ApiError';
import { Prisma } from '../../../prisma/generated/index';
import { TCreateReviewPayload, TReviewFilters } from './review.interface';

const reviewIncludes = {
  customer: { select: { id: true, name: true } },
  service: { include: { category: true } },
  booking: { select: { id: true, bookingDate: true, status: true } },
} satisfies Prisma.ReviewInclude;

const createReview = async (customerId: number, payload: TCreateReviewPayload) => {
  const { bookingId, rating, comment } = payload;

  if (!bookingId || rating === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'bookingId and rating are required');
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'rating must be an integer between 1 and 5');
  }

  const booking = await prisma.booking.findUnique({
    where: { id: Number(bookingId) },
    include: { review: true },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.customerId !== customerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only review your own bookings');
  }

  if (booking.status !== 'COMPLETED') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'You can only review a booking after it has been completed',
    );
  }

  if (booking.review) {
    throw new ApiError(httpStatus.CONFLICT, 'You have already reviewed this booking');
  }

  const technicianProfile = await prisma.technicianProfile.findUnique({
    where: { userId: booking.technicianId },
  });

  if (!technicianProfile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Technician profile not found');
  }

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        bookingId: booking.id,
        customerId,
        technicianId: booking.technicianId,
        serviceId: booking.serviceId,
        rating,
        comment,
      },
      include: reviewIncludes,
    });

    // Recalculate the technician's aggregate rating from every review they have,
    // inside the same transaction so it can never drift out of sync with reality.
    const aggregate = await tx.review.aggregate({
      where: { technicianId: booking.technicianId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.technicianProfile.update({
      where: { id: technicianProfile.id },
      data: {
        averageRating: aggregate._avg.rating ?? 0,
        totalReviews: aggregate._count.rating,
      },
    });

    return review;
  });
};

const getReviews = async (filters: TReviewFilters) => {
  const { technicianId, serviceId, customerId } = filters;

  const where: Prisma.ReviewWhereInput = {};

  if (technicianId) where.technicianId = Number(technicianId);
  if (serviceId) where.serviceId = Number(serviceId);
  if (customerId) where.customerId = Number(customerId);

  return prisma.review.findMany({
    where,
    include: reviewIncludes,
    orderBy: { createdAt: 'desc' },
  });
};

const getReviewById = async (id: number) => {
  const review = await prisma.review.findUnique({
    where: { id },
    include: reviewIncludes,
  });

  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
  }

  return review;
};

export const ReviewService = {
  createReview,
  getReviews,
  getReviewById,
};
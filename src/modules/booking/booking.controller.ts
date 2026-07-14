import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { BookingService } from './booking.service';
import { TBookingFilters, TCreateBookingPayload } from './booking.interface';

const createBooking = catchAsync(async (req: Request, res: Response) => {
  const booking = await BookingService.createBooking(
    req.user!.id,
    req.body as TCreateBookingPayload,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Booking created successfully',
    data: booking,
  });
});

const getBookings = catchAsync(async (req: Request, res: Response) => {
  const bookings = await BookingService.getBookings(
    { id: req.user!.id, role: req.user!.role },
    req.query as unknown as TBookingFilters,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Bookings retrieved successfully',
    data: bookings,
  });
});

const getBookingById = catchAsync(async (req: Request, res: Response) => {
  const booking = await BookingService.getBookingById(
    { id: req.user!.id, role: req.user!.role },
    Number(req.params.id),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking retrieved successfully',
    data: booking,
  });
});

const cancelBooking = catchAsync(async (req: Request, res: Response) => {
  const booking = await BookingService.cancelBooking(req.user!.id, Number(req.params.id));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking cancelled successfully',
    data: booking,
  });
});

const updateBookingStatus = catchAsync(async (req: Request, res: Response) => {
  const booking = await BookingService.updateBookingStatusByTechnician(
    req.user!.id,
    Number(req.params.id),
    req.body.status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking status updated successfully',
    data: booking,
  });
});

export const BookingController = {
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
  updateBookingStatus,
};
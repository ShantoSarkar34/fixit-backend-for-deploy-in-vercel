import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AdminService } from './admin.service';
import { BookingService } from '../booking/booking.service';
import { TUserFilters } from './admin.interface';
import { TBookingFilters } from '../booking/booking.interface';

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await AdminService.getAllUsers(req.query as unknown as TUserFilters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users retrieved successfully',
    data: users,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const user = await AdminService.updateUserStatus(Number(req.params.id), req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User status updated successfully',
    data: user,
  });
});

const getAllBookings = catchAsync(async (req: Request, res: Response) => {
  const bookings = await BookingService.getBookings(
    { id: req.user!.id, role: 'ADMIN' },
    req.query as unknown as TBookingFilters,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All bookings retrieved successfully',
    data: bookings,
  });
});

export const AdminController = {
  getAllUsers,
  updateUserStatus,
  getAllBookings,
};
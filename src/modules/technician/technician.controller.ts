import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ApiError from '../../utils/ApiError';
import { TechnicianService } from './technician.service';
import { TTechnicianFilters } from './technician.interface';

const getAllTechnicians = catchAsync(async (req: Request, res: Response) => {
  const technicians = await TechnicianService.getAllTechnicians(
    req.query as unknown as TTechnicianFilters,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Technicians retrieved successfully',
    data: technicians,
  });
});

const getTechnicianById = catchAsync(async (req: Request, res: Response) => {
  const technician = await TechnicianService.getTechnicianById(Number(req.params.id));

  if (!technician) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Technician not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Technician retrieved successfully',
    data: technician,
  });
});

const upsertMyProfile = catchAsync(async (req: Request, res: Response) => {
  const profile = await TechnicianService.upsertMyProfile(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Technician profile saved successfully',
    data: profile,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const profile = await TechnicianService.getMyProfile(req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Technician profile retrieved successfully',
    data: profile,
  });
});

const setMyAvailability = catchAsync(async (req: Request, res: Response) => {
  const availability = await TechnicianService.setMyAvailability(req.user!.id, req.body.slots);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Availability updated successfully',
    data: availability,
  });
});

const getMyAvailability = catchAsync(async (req: Request, res: Response) => {
  const availability = await TechnicianService.getMyAvailability(req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Availability retrieved successfully',
    data: availability,
  });
});

export const TechnicianController = {
  getAllTechnicians,
  getTechnicianById,
  upsertMyProfile,
  getMyProfile,
  setMyAvailability,
  getMyAvailability,
};
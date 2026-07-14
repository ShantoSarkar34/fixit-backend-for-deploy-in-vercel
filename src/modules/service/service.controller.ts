import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ApiError from '../../utils/ApiError';
import { ServiceService } from './service.service';
import { TServiceFilters } from './service.interface';

const getAllServices = catchAsync(async (req: Request, res: Response) => {
  const services = await ServiceService.getAllServices(req.query as unknown as TServiceFilters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Services retrieved successfully',
    data: services,
  });
});

const getServiceById = catchAsync(async (req: Request, res: Response) => {
  const service = await ServiceService.getServiceById(Number(req.params.id));

  if (!service) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Service not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service retrieved successfully',
    data: service,
  });
});

const createMyService = catchAsync(async (req: Request, res: Response) => {
  const service = await ServiceService.createMyService(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Service created successfully',
    data: service,
  });
});

const getMyServices = catchAsync(async (req: Request, res: Response) => {
  const services = await ServiceService.getMyServices(req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your services retrieved successfully',
    data: services,
  });
});

const updateMyService = catchAsync(async (req: Request, res: Response) => {
  const service = await ServiceService.updateMyService(
    req.user!.id,
    Number(req.params.id),
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service updated successfully',
    data: service,
  });
});

const deleteMyService = catchAsync(async (req: Request, res: Response) => {
  await ServiceService.deleteMyService(req.user!.id, Number(req.params.id));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service deleted successfully',
  });
});

export const ServiceController = {
  getAllServices,
  getServiceById,
  createMyService,
  getMyServices,
  updateMyService,
  deleteMyService,
};
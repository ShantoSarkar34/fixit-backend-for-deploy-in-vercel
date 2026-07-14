import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ReviewService } from './review.service';
import { TCreateReviewPayload, TReviewFilters } from './review.interface';

const createReview = catchAsync(async (req: Request, res: Response) => {
  const review = await ReviewService.createReview(
    req.user!.id,
    req.body as TCreateReviewPayload,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Review submitted successfully',
    data: review,
  });
});

const getReviews = catchAsync(async (req: Request, res: Response) => {
  const reviews = await ReviewService.getReviews(req.query as unknown as TReviewFilters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    data: reviews,
  });
});

const getReviewById = catchAsync(async (req: Request, res: Response) => {
  const review = await ReviewService.getReviewById(Number(req.params.id));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review retrieved successfully',
    data: review,
  });
});

export const ReviewController = {
  createReview,
  getReviews,
  getReviewById,
};
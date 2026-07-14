import { Response } from 'express';

type TMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPage?: number;
};

type TApiResponse<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  meta?: TMeta;
  data?: T;
};

const sendResponse = <T>(res: Response, apiResponse: TApiResponse<T>): void => {
  res.status(apiResponse.statusCode).json({
    success: apiResponse.success,
    message: apiResponse.message,
    meta: apiResponse.meta || undefined,
    data: apiResponse.data ?? undefined,
  });
};

export default sendResponse;

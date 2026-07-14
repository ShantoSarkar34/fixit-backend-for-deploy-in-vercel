import { AvailabilityStatus } from '../../../prisma/generated/index.js';

export type TServiceFilters = {
  categoryId?: string;
  location?: string;
  minPrice?: string;
  maxPrice?: string;
  search?: string;
};

export type TCreateServicePayload = {
  categoryId: number;
  title: string;
  description: string;
  price: number;
  duration: number;
  location: string;
  availability?: AvailabilityStatus;
  isActive?: boolean;
};

export type TUpdateServicePayload = Partial<TCreateServicePayload>;
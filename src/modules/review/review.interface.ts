export type TCreateReviewPayload = {
  bookingId: number;
  rating: number;
  comment?: string;
};

export type TReviewFilters = {
  technicianId?: string;
  serviceId?: string;
  customerId?: string;
};
export type TCreatePaymentPayload = {
  bookingId: number;
};

export type TPaymentFilters = {
  status?: string;
  bookingId?: string;
};
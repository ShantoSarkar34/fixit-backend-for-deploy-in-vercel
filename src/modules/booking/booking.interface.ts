export type TCreateBookingPayload = {
  serviceId: number;
  availabilityId: number;
  address?: string;
  note?: string;
};

export type TBookingFilters = {
  status?: string;
  date?: string;
  technicianId?: string;
  customerId?: string;
};

export type TUpdateBookingStatusPayload = {
  status: string;
};
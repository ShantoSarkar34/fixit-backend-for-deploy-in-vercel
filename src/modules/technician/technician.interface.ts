export type TTechnicianFilters = {
  categoryId?: string;
  location?: string;
  search?: string;
};

export type TUpsertTechnicianProfilePayload = {
  bio?: string;
  experience?: string;
  yearsExperience: number;
  location: string;
};

export type TAvailabilitySlot = {
  date: string;
  startTime: string;
  endTime: string;
};
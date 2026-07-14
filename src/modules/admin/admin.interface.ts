export type TUserFilters = {
  role?: string;
  status?: string;
  search?: string;
};

export type TUpdateUserStatusPayload = {
  status: string;
};
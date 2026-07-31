import type { District, DistrictAssistApi } from "./api/client";

export type AppContext = {
  api: DistrictAssistApi;
  district: District;
  canManageDistrict: boolean;
};

import useSWR from "swr";
import { ApiError, type DistrictAssistApi } from "../api/client";

export function useDistrict(
  api: DistrictAssistApi,
  signedIn: boolean | undefined,
  organizationId: string | null | undefined,
) {
  const shouldFetch = signedIn && organizationId;

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? "/api/v1/districts/current" : null,
    () => api.currentDistrict(),
  );

  const isMissing = !isLoading && error instanceof ApiError && error.status === 404;

  return {
    district: data ?? null,
    status: (!shouldFetch
      ? "loading"
      : isLoading
        ? "loading"
        : isMissing
          ? "missing"
          : error
            ? "error"
            : "ready") as "loading" | "ready" | "missing" | "error",
    error: isMissing ? null : (error ?? null),
    refresh: () => mutate(),
  };
}

import { getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";
import type { DistrictService } from "../modules/districts/district.service.js";
import type { PlatformAdminService } from "../modules/platform-admins/platform-admin.service.js";
import { ForbiddenError, UnauthorizedError } from "../shared/errors/app-error.js";

export type ClerkIdentity = {
  userId: string;
  organizationId: string | null;
  organizationRole: string | null;
};

export type IdentityResolver = (request: Request) => ClerkIdentity;

export const clerkIdentityFromRequest: IdentityResolver = (request) => {
  const auth = getAuth(request);
  if (!auth.isAuthenticated || !auth.userId)
    throw new UnauthorizedError("Sign in with Clerk to access the API.");
  return {
    userId: auth.userId,
    organizationId: auth.orgId ?? null,
    organizationRole: auth.orgRole ?? null,
  };
};

export function requireAuthentication(resolver: IdentityResolver): RequestHandler {
  return (request, _response, next) => {
    request.identity = resolver(request);
    return next();
  };
}

export function requirePlatformAdmin(admins: PlatformAdminService): RequestHandler {
  return async (request, _response, next) => {
    if (!request.identity) return next(new UnauthorizedError());
    if (await admins.isAdmin(request.identity.userId)) return next();
    return next(new ForbiddenError());
  };
}

export function requireDistrictAccess(
  districts: DistrictService,
  admins: PlatformAdminService,
): RequestHandler {
  return async (request, _response, next) => {
    if (!request.identity) return next(new UnauthorizedError());
    try {
      if (await admins.isAdmin(request.identity.userId)) {
        request.identity = {
          ...request.identity,
          organizationRole: "platform_admin",
        };
        return next();
      }
      const districtId = request.params.districtId;
      if (typeof districtId !== "string" || !request.identity.organizationId)
        throw new ForbiddenError();
      await districts.assertOrganizationAccess(
        districtId,
        request.identity.organizationId,
      );
      return next();
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError)
        return next(error);
      return next(error);
    }
  };
}

export function requireDistrictCreator(admins: PlatformAdminService): RequestHandler {
  return async (request, _response, next) => {
    if (!request.identity) throw new UnauthorizedError();
    if (await admins.isAdmin(request.identity.userId)) {
      request.identity = {
        ...request.identity,
        organizationRole: "platform_admin",
      };
      return next();
    }
    if (
      request.identity.organizationRole === "org:admin" &&
      request.identity.organizationId
    )
      return next();
    return next(new ForbiddenError());
  };
}

export function requireCoordinator(): RequestHandler {
  return (request, _response, next) => {
    if (
      request.identity?.organizationRole === "org:admin" ||
      request.identity?.organizationRole === "platform_admin"
    )
      return next();
    return next(new ForbiddenError());
  };
}

export function requirePlanEditor(): RequestHandler {
  return (request, _response, next) => {
    if (request.identity?.organizationRole) return next();
    return next(new ForbiddenError());
  };
}

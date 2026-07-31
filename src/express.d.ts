import type { ClerkIdentity } from "./auth/clerk.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      identity?: ClerkIdentity;
    }
  }
}

export {};

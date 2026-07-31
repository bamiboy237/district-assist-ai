const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!apiBaseUrl) throw new Error("VITE_API_BASE_URL is required.");
if (!clerkPublishableKey) throw new Error("VITE_CLERK_PUBLISHABLE_KEY is required.");

export const environment = {
  apiBaseUrl,
  clerkPublishableKey,
};

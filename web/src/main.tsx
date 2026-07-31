import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { App } from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { environment } from "./env";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={environment.clerkPublishableKey}>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </ClerkProvider>
  </StrictMode>,
);

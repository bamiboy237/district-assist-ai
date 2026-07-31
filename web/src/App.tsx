import {
  OrganizationSwitcher,
  SignInButton,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { DistrictAssistApi } from "./api/client";
import type { AppContext } from "./app-context";
import { useDistrict } from "./auth/useDistrict";
import { environment } from "./env";
import { AssistantPage } from "./pages/AssistantPage";
import { DistrictSettingsPage } from "./pages/DistrictSettingsPage";
import { ImportsPage } from "./pages/ImportsPage";
import { SpecialistsPage } from "./pages/SpecialistsPage";
import { StudentDetailPage } from "./pages/StudentDetailPage";
import { StudentsPage } from "./pages/StudentsPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PlatformLayout />}>
          <Route index element={<Navigate to="/students" replace />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/:studentId" element={<StudentDetailPage />} />
          <Route path="imports" element={<ImportsPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="settings" element={<DistrictSettingsPage />} />
          <Route path="specialists" element={<SpecialistsPage />} />
          <Route path="*" element={<Navigate to="/students" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function CenteredState({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <main className="centered-state">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {children}
    </main>
  );
}

function PlatformLayout() {
  const { getToken, isLoaded, isSignedIn, orgId, orgRole } = useAuth();
  const api = useMemo(
    () => new DistrictAssistApi(environment.apiBaseUrl, getToken),
    [getToken],
  );
  const currentDistrict = useDistrict(api, isSignedIn, orgId);

  if (!isLoaded)
    return (
      <CenteredState
        eyebrow="DistrictAssist"
        title="Loading your session"
        description="Checking your identity and organization membership."
      />
    );
  if (!isSignedIn)
    return (
      <CenteredState eyebrow="DistrictAssist" title="Sign in to continue">
        <SignInButton mode="modal">
          <button className="button button-primary" type="button">
            Sign in
          </button>
        </SignInButton>
      </CenteredState>
    );
  if (!orgId)
    return (
      <CenteredState
        eyebrow="DistrictAssist"
        title="Select a district organization"
        description="Your active Clerk organization determines the district records you can access."
      >
        <OrganizationSwitcher />
      </CenteredState>
    );
  if (currentDistrict.status === "loading")
    return (
      <CenteredState
        eyebrow="DistrictAssist"
        title="Loading your workspace"
        description="Confirming your active organization and district access."
      />
    );
  if (currentDistrict.status === "missing")
    return (
      <DistrictSetupScreen
        api={api}
        canCreate={orgRole === "org:admin"}
        onCreated={currentDistrict.refresh}
      />
    );
  if (currentDistrict.status === "error")
    return (
      <CenteredState
        eyebrow="Workspace unavailable"
        title="We could not load this district"
        description={currentDistrict.error?.message}
      >
        <button
          className="button button-primary"
          type="button"
          onClick={currentDistrict.refresh}
        >
          Try again
        </button>
      </CenteredState>
    );

  const context: AppContext = {
    api,
    district: currentDistrict.district!,
    canManageDistrict: orgRole === "org:admin",
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            DA
          </span>
          <span>DistrictAssist</span>
        </div>
        <div className="header-actions">
          <OrganizationSwitcher />
          <UserButton />
        </div>
      </header>
      <div className="app-layout">
        <aside className="sidebar">
          <p className="district-info">
            {currentDistrict.district!.name} · {currentDistrict.district!.stateCode}
          </p>
          <nav>
            <NavItem to="/students" label="Students" />
            <NavItem to="/imports" label="Imports" />
            <NavItem to="/assistant" label="Assistant" />
            <NavItem to="/settings" label="Settings" />
            <NavItem to="/specialists" label="Specialists" />
          </nav>
          <p className="scope-note">
            Records and actions are scoped to your active organization.
          </p>
        </aside>
        <main id="main-content" className="main-content">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
      to={to}
    >
      {label}
    </NavLink>
  );
}

function DistrictSetupScreen({
  api,
  canCreate,
  onCreated,
}: {
  api: DistrictAssistApi;
  canCreate: boolean;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.createDistrict({ name: name.trim(), stateCode: stateCode.trim() });
      onCreated();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "The district could not be created.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="centered-state setup-state">
      <p className="eyebrow">First-time setup</p>
      <h1>Create your district workspace</h1>
      <p>
        This workspace will be securely connected to your active organization. You can
        start importing synthetic student-program records as soon as it is created.
      </p>
      {canCreate ? (
        <form className="setup-form" onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span>District name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={1}
              maxLength={200}
              required
              autoFocus
            />
          </label>
          <label className="field setup-state-code">
            <span>State code</span>
            <input
              value={stateCode}
              onChange={(event) => setStateCode(event.target.value.toUpperCase())}
              minLength={2}
              maxLength={2}
              pattern="[A-Za-z]{2}"
              placeholder="IL"
              required
            />
          </label>
          {error ? (
            <p className="error-notice" role="alert">
              {error}
            </p>
          ) : null}
          <button
            className="button button-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating workspace…" : "Create workspace"}
          </button>
        </form>
      ) : (
        <div className="error-notice" role="alert">
          Ask an organization administrator to create this district workspace.
        </div>
      )}
      <div className="setup-account-controls">
        <OrganizationSwitcher />
        <UserButton />
      </div>
    </main>
  );
}

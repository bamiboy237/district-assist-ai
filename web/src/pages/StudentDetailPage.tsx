import { type FormEvent, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import useSWR, { useSWRConfig } from "swr";
import type { Student, SupportPlan } from "../api/client";
import type { AppContext } from "../app-context";

export function StudentDetailPage() {
  const { api, district, canManageDistrict } = useOutletContext<AppContext>();
  const { studentId } = useParams<{ studentId: string }>();
  const { mutate } = useSWRConfig();

  const {
    data: student,
    error,
    isLoading,
  } = useSWR(
    studentId ? `api/v1/districts/${district.id}/students/${studentId}` : null,
    () => api.getStudent(district.id, studentId!),
  );

  const { data: plans, mutate: mutatePlans } = useSWR(
    student
      ? `api/v1/districts/${district.id}/students/${studentId}/support-plans`
      : null,
    () => api.listSupportPlans(district.id, studentId!),
  );

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Partial<Student>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [planGoal, setPlanGoal] = useState("");
  const [planStart, setPlanStart] = useState(new Date().toISOString().slice(0, 10));
  const [planReview, setPlanReview] = useState(new Date().toISOString().slice(0, 10));
  const [planError, setPlanError] = useState<string | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);

  if (isLoading)
    return (
      <div className="notice" aria-live="polite">
        Loading student…
      </div>
    );
  if (error || !student)
    return (
      <div className="error-notice" role="alert">
        <p>Student could not be loaded.</p>
        <Link to="/students" className="button button-secondary">
          Back to students
        </Link>
      </div>
    );

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await api.updateStudent(district.id, student!.id, form);
      setEdit(false);
      setForm({});
      mutate(`api/v1/districts/${district.id}/students/${studentId}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    setForm({
      firstName: student!.firstName,
      lastName: student!.lastName,
      gradeLevel: student!.gradeLevel,
      schoolName: student!.schoolName,
      programStatus: student!.programStatus,
    });
    setEdit(true);
  }

  async function createPlan(event: FormEvent) {
    event.preventDefault();
    setPlanError(null);
    setCreatingPlan(true);
    try {
      await api.createSupportPlan(district.id, student!.id, {
        goal: planGoal,
        startDate: planStart,
        reviewDate: planReview,
      });
      setShowCreatePlan(false);
      setPlanGoal("");
      mutatePlans();
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Creation failed.");
    } finally {
      setCreatingPlan(false);
    }
  }

  async function advancePlan(plan: SupportPlan, next: SupportPlan["status"]) {
    try {
      await api.updateSupportPlan(district.id, plan.id, {
        status: next,
        version: plan.version,
      });
      mutatePlans();
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Transition failed.");
    }
  }

  const gradeLabel = student.gradeLevel === 0 ? "K" : String(student.gradeLevel);

  return (
    <div>
      <nav className="breadcrumb">
        <Link to="/students">Students</Link> / {student.firstName} {student.lastName}
      </nav>

      <h1>
        {student.firstName} {student.lastName}
      </h1>

      {canManageDistrict && !edit && (
        <div className="actions-bar">
          <button className="button button-secondary" type="button" onClick={startEdit}>
            Edit student
          </button>
        </div>
      )}

      {edit && (
        <form className="card" onSubmit={saveEdit}>
          <h2>Edit student</h2>
          <label className="field">
            <span>First name</span>
            <input
              value={form.firstName ?? ""}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              maxLength={100}
              required
            />
          </label>
          <label className="field">
            <span>Last name</span>
            <input
              value={form.lastName ?? ""}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              maxLength={100}
              required
            />
          </label>
          <label className="field">
            <span>Grade level</span>
            <select
              value={form.gradeLevel ?? 0}
              onChange={(e) => setForm({ ...form, gradeLevel: Number(e.target.value) })}
            >
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? "K" : String(i)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>School name</span>
            <input
              value={form.schoolName ?? ""}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
              maxLength={200}
              required
            />
          </label>
          <label className="field">
            <span>Program status</span>
            <select
              value={form.programStatus ?? "active"}
              onChange={(e) =>
                setForm({
                  ...form,
                  programStatus: e.target.value as Student["programStatus"],
                })
              }
            >
              <option value="active">Active</option>
              <option value="monitoring">Monitoring</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          {formError && (
            <p className="error-notice" role="alert">
              {formError}
            </p>
          )}
          <div className="button-group">
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setEdit(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="card">
        <h2>Details</h2>
        <dl className="detail-list">
          <dt>External ID</dt>
          <dd>{student.externalId}</dd>
          <dt>Grade</dt>
          <dd>{gradeLabel}</dd>
          <dt>School</dt>
          <dd>{student.schoolName}</dd>
          <dt>Status</dt>
          <dd>
            <span className={`status-badge status-${student.programStatus}`}>
              {student.programStatus}
            </span>
          </dd>
          <dt>Added</dt>
          <dd>{new Date(student.createdAt).toLocaleDateString()}</dd>
        </dl>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Support plans</h2>
          {canManageDistrict && !showCreatePlan && (
            <button
              className="button button-primary"
              type="button"
              onClick={() => setShowCreatePlan(true)}
            >
              New plan
            </button>
          )}
        </div>

        {showCreatePlan && (
          <form className="plan-form" onSubmit={createPlan}>
            <label className="field">
              <span>Goal</span>
              <input
                value={planGoal}
                onChange={(e) => setPlanGoal(e.target.value)}
                minLength={1}
                required
                placeholder="Describe the support goal…"
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Start date</span>
                <input
                  type="date"
                  value={planStart}
                  onChange={(e) => setPlanStart(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Review date</span>
                <input
                  type="date"
                  value={planReview}
                  onChange={(e) => setPlanReview(e.target.value)}
                  required
                />
              </label>
            </div>
            {planError && (
              <p className="error-notice" role="alert">
                {planError}
              </p>
            )}
            <div className="button-group">
              <button
                className="button button-primary"
                type="submit"
                disabled={creatingPlan}
              >
                {creatingPlan ? "Creating…" : "Create plan"}
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowCreatePlan(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {(plans ?? []).length === 0 ? (
          <p className="muted">No support plans yet.</p>
        ) : (
          <ul className="plan-list">
            {plans!.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                canManage={canManageDistrict}
                onAdvance={(next) => advancePlan(plan, next)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PlanCard({
  plan,
  canManage,
  onAdvance,
}: {
  plan: SupportPlan;
  canManage: boolean;
  onAdvance: (next: SupportPlan["status"]) => void | Promise<void>;
}) {
  const transitions: Record<SupportPlan["status"], SupportPlan["status"][]> = {
    draft: ["active", "cancelled"],
    active: ["completed", "cancelled"],
    completed: ["active"],
    cancelled: [],
  };

  return (
    <li className="plan-item">
      <div className="plan-header">
        <span className={`status-badge status-${plan.status}`}>{plan.status}</span>
        <span className="plan-version">v{plan.version}</span>
      </div>
      <p className="plan-goal">{plan.goal}</p>
      <div className="plan-dates">
        <span>Start: {plDate(plan.startDate)}</span>
        <span>Review: {plDate(plan.reviewDate)}</span>
      </div>
      {canManage && transitions[plan.status].length > 0 && (
        <div className="plan-actions">
          {transitions[plan.status].map((next) => (
            <button
              key={next}
              className="button button-small button-secondary"
              type="button"
              onClick={() => onAdvance(next)}
            >
              {plNext(next)}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

function plDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function plNext(s: SupportPlan["status"]): string {
  if (s === "active") return "Launch";
  if (s === "completed") return "Complete";
  if (s === "draft") return "Open";
  return s;
}

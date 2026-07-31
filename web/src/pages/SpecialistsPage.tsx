import { type FormEvent, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { AppContext } from "../app-context";

export function SpecialistsPage() {
  const { api, district, canManageDistrict } = useOutletContext<AppContext>();

  const [clerkUserId, setClerkUserId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [schools, setSchools] = useState("");
  const [saving, setSaving] = useState(false);

  if (!canManageDistrict)
    return (
      <div className="error-notice" role="alert">
        Only district coordinators can manage specialist assignments.
      </div>
    );

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const { schoolNames } = await api.getSpecialistSchools(
        district.id,
        clerkUserId.trim(),
      );
      setSchools(schoolNames.join("\n"));
      setResult(
        schoolNames.length === 0
          ? "No schools assigned yet."
          : `${schoolNames.length} school(s) assigned.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const list = schools
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const { schoolNames } = await api.setSpecialistSchools(
        district.id,
        clerkUserId.trim(),
        list,
      );
      setSchools(schoolNames.join("\n"));
      setResult(`${schoolNames.length} school(s) saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>Specialist school assignments</h1>

      <section className="card">
        <p>
          Enter a specialist&apos;s Clerk user ID to view or update the schools they can
          access. One school name per line.
        </p>

        <form className="specialist-form" onSubmit={lookup}>
          <label className="field">
            <span>Clerk user ID</span>
            <div className="field-row">
              <input
                value={clerkUserId}
                onChange={(e) => setClerkUserId(e.target.value)}
                placeholder="user_..."
                required
              />
              <button
                className="button button-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Loading…" : "Look up"}
              </button>
            </div>
          </label>
        </form>

        {result && (
          <form onSubmit={save}>
            <label className="field">
              <span>Assigned schools (one per line)</span>
              <textarea
                value={schools}
                onChange={(e) => setSchools(e.target.value)}
                rows={6}
                placeholder="Lincoln Elementary&#10;Washington Middle School"
              />
            </label>
            {error && (
              <p className="error-notice" role="alert">
                {error}
              </p>
            )}
            <div className="button-group">
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save assignments"}
              </button>
              <span className="muted">{result}</span>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

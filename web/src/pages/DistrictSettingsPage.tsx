import { type FormEvent, useState } from "react";
import { useOutletContext } from "react-router-dom";
import useSWR from "swr";
import type { AppContext } from "../app-context";

export function DistrictSettingsPage() {
  const { api, district, canManageDistrict } = useOutletContext<AppContext>();

  const { data: full, mutate } = useSWR(`api/v1/districts/${district.id}`, () =>
    api.getDistrict(district.id),
  );

  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(district.name);
  const [stateCode, setStateCode] = useState(district.stateCode);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!full)
    return (
      <div className="notice" aria-live="polite">
        Loading settings…
      </div>
    );

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updatedName = name.trim() !== district.name ? name.trim() : undefined;
      const updatedCode =
        stateCode.trim().toUpperCase() !== district.stateCode
          ? stateCode.trim().toUpperCase()
          : undefined;
      const payload: Record<string, string> = {};
      if (updatedName) payload.name = updatedName;
      if (updatedCode) payload.stateCode = updatedCode;
      await api.updateDistrict(district.id, payload);
      setEdit(false);
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>District settings</h1>

      <section className="card">
        <div className="section-header">
          <h2>Details</h2>
          {canManageDistrict && !edit && (
            <button
              className="button button-primary"
              type="button"
              onClick={() => setEdit(true)}
            >
              Edit
            </button>
          )}
        </div>

        {edit ? (
          <form onSubmit={save}>
            <label className="field">
              <span>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                required
              />
            </label>
            <label className="field">
              <span>State code</span>
              <input
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value.toUpperCase())}
                minLength={2}
                maxLength={2}
                pattern="[A-Z]{2}"
                required
              />
            </label>
            {error && (
              <p className="error-notice" role="alert">
                {error}
              </p>
            )}
            <div className="button-group">
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
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
        ) : (
          <dl className="detail-list">
            <dt>ID</dt>
            <dd>{full.id}</dd>
            <dt>Name</dt>
            <dd>{full.name}</dd>
            <dt>State</dt>
            <dd>{full.stateCode}</dd>
            <dt>Created</dt>
            <dd>{new Date(full.createdAt).toLocaleDateString()}</dd>
          </dl>
        )}
      </section>
    </div>
  );
}

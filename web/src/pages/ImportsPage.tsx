import { type FormEvent, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import useSWR from "swr";
import type { ImportError, ImportExplanation, ImportJob } from "../api/client";
import type { AppContext } from "../app-context";

const MAX_CSV_BYTES = 1024 * 1024;

export function ImportsPage() {
  const { api, district, canManageDistrict } = useOutletContext<AppContext>();
  const [searchParams] = useSearchParams();
  const requestedImportId = searchParams.get("importId");
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replayNotice, setReplayNotice] = useState<string | null>(null);

  useSWR(
    requestedImportId
      ? `api/v1/districts/${district.id}/imports/${requestedImportId}`
      : null,
    (url) => api.fetcher<ImportJob>(url),
    { onSuccess: (data) => setJob(data) },
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a CSV file to import.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a file with a .csv extension.");
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      setError("CSV files must be 1 MB or smaller.");
      return;
    }

    setIsSubmitting(true);
    setProgress(0);
    setError(null);
    setReplayNotice(null);
    try {
      const result = await api.uploadStudentCsv(district.id, file, {
        onProgress: setProgress,
      });
      setJob(result.job);
      if (result.replayed)
        setReplayNotice(
          "This exact file was already imported. The existing import is shown below.",
        );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "The CSV could not be imported.",
      );
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  }

  return (
    <section aria-labelledby="imports-heading">
      <header className="page-header">
        <div>
          <p className="eyebrow">Student-program data</p>
          <h1 id="imports-heading">Import a CSV</h1>
          <p>Upload one UTF-8 CSV with the required student-program columns.</p>
        </div>
      </header>

      <section className="import-layout">
        <form className="upload-panel" onSubmit={(event) => void submit(event)}>
          <h2>Student CSV</h2>
          <p className="helper-text">
            Required columns: external ID, first name, last name, grade level, school
            name, and program status.
          </p>
          <label className="file-picker" htmlFor="student-csv">
            <span>Choose CSV file</span>
            <input
              id="student-csv"
              type="file"
              accept=".csv,text/csv"
              disabled={!canManageDistrict || isSubmitting}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <p className="selected-file">
            {file ? `${file.name} (${formatBytes(file.size)})` : "No file selected"}
          </p>
          {!canManageDistrict ? (
            <p className="permission-note">
              Your role can review imports but cannot upload a student CSV.
            </p>
          ) : null}
          {progress !== null ? (
            <div className="upload-progress" aria-live="polite">
              <progress value={progress} max="100" />
              <span>
                {progress < 100
                  ? `Uploading ${progress}%`
                  : "Validating and importing…"}
              </span>
            </div>
          ) : null}
          <button
            className="button button-primary"
            type="submit"
            disabled={!canManageDistrict || isSubmitting}
          >
            {isSubmitting ? "Importing…" : "Import CSV"}
          </button>
        </form>

        <aside className="import-guidance" aria-labelledby="import-guidance-heading">
          <h2 id="import-guidance-heading">What happens next</h2>
          <ol>
            <li>DistrictAssist validates each CSV row.</li>
            <li>Valid student records are accepted.</li>
            <li>
              Invalid rows stay out of the system and receive a clear error report.
            </li>
          </ol>
          <p>
            Never upload real student data to a portfolio or development environment.
          </p>
        </aside>
      </section>

      {replayNotice ? (
        <div className="info-notice import-message">{replayNotice}</div>
      ) : null}
      {error ? (
        <div className="error-notice import-message" role="alert">
          {error}
        </div>
      ) : null}
      {job ? <ImportResult api={api} districtId={district.id} job={job} /> : null}
    </section>
  );
}

function ImportResult({
  api,
  districtId,
  job,
}: {
  api: AppContext["api"];
  districtId: string;
  job: ImportJob;
}) {
  const [errors, setErrors] = useState<ImportError[] | null>(null);
  const [explanation, setExplanation] = useState<ImportExplanation | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  async function showErrors() {
    setLoadingErrors(true);
    setActionError(null);
    try {
      setErrors(await api.importErrors(districtId, job.id));
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Could not load import errors.",
      );
    } finally {
      setLoadingErrors(false);
    }
  }

  async function explainErrors() {
    setLoadingExplanation(true);
    setActionError(null);
    try {
      setExplanation(await api.explainImportErrors(districtId, job.id));
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Could not explain import issues.",
      );
    } finally {
      setLoadingExplanation(false);
    }
  }

  return (
    <section className="import-result" aria-labelledby="import-result-heading">
      <div className="result-heading">
        <div>
          <p className="eyebrow">Import result</p>
          <h2 id="import-result-heading">{job.filename}</h2>
        </div>
        <span className={`status-badge import-status-${job.status}`}>{job.status}</span>
      </div>
      <dl className="import-metrics">
        <div>
          <dt>Total rows</dt>
          <dd>{job.totalRows}</dd>
        </div>
        <div>
          <dt>Accepted</dt>
          <dd>{job.acceptedRows}</dd>
        </div>
        <div>
          <dt>Rejected</dt>
          <dd>{job.rejectedRows}</dd>
        </div>
      </dl>
      {job.failureMessage ? <p className="error-notice">{job.failureMessage}</p> : null}
      {actionError ? (
        <p className="error-notice" role="alert">
          {actionError}
        </p>
      ) : null}
      <div className="result-actions">
        {job.rejectedRows > 0 ? (
          <>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void showErrors()}
              disabled={loadingErrors}
            >
              {loadingErrors ? "Loading issues…" : "Review row issues"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void explainErrors()}
              disabled={loadingExplanation}
            >
              {loadingExplanation ? "Explaining…" : "Explain common issues"}
            </button>
          </>
        ) : null}
        <Link className="button button-secondary" to={`/assistant?importId=${job.id}`}>
          Ask about this import
        </Link>
      </div>
      {errors ? <ImportErrors errors={errors} /> : null}
      {explanation ? <ImportExplanationView explanation={explanation} /> : null}
    </section>
  );
}

function ImportErrors({ errors }: { errors: ImportError[] }) {
  return (
    <div className="issues-panel">
      <h3>Row issues</h3>
      {errors.length === 0 ? (
        <p>No row issues were reported.</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Row</th>
                <th scope="col">Field</th>
                <th scope="col">Issue</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.rowNumber}</td>
                  <td>{entry.field ?? "Row"}</td>
                  <td>{entry.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ImportExplanationView({ explanation }: { explanation: ImportExplanation }) {
  return (
    <section className="explanation-panel" aria-labelledby="explanation-heading">
      <h3 id="explanation-heading">Common issues</h3>
      <p>{explanation.summary}</p>
      <ul>
        {explanation.topIssues.map((issue) => (
          <li key={issue.code}>
            <strong>
              {issue.count} × {issue.code}
            </strong>
            <span>
              {issue.explanation} {issue.suggestedFix}
            </span>
          </li>
        ))}
      </ul>
      <p className="helper-text">{explanation.caveat}</p>
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

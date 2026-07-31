import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import useSWRInfinite from "swr/infinite";
import type { Student, StudentPage } from "../api/client";
import type { AppContext } from "../app-context";

export function StudentsPage() {
  const { api, district } = useOutletContext<AppContext>();
  const [search, setSearch] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const getKey = (pageIndex: number, previousPageData: StudentPage | null) => {
    if (previousPageData && !previousPageData.page.nextCursor) return null;
    const params = new URLSearchParams({ limit: "25" });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (gradeLevel) params.set("gradeLevel", gradeLevel);
    if (pageIndex > 0 && previousPageData?.page.cursor)
      params.set("cursor", previousPageData.page.cursor);
    return `api/v1/districts/${district.id}/students?${params}`;
  };

  const { data, error, isLoading, isValidating, mutate, size, setSize } =
    useSWRInfinite(getKey, (url) => api.fetcherRaw<StudentPage>(url));

  const students: Student[] = data ? data.flatMap((page) => page.data) : [];
  const lastPage = data?.[data.length - 1];
  const hasMore = !!lastPage?.page.nextCursor;

  return (
    <section aria-labelledby="students-heading">
      <header className="page-header">
        <div>
          <p className="eyebrow">Student records</p>
          <h1 id="students-heading">Students</h1>
          <p>Records available to your current district access.</p>
        </div>
        <p className="record-count" aria-live="polite">
          {data ? `${students.length} loaded` : ""}
        </p>
      </header>

      <section className="filter-bar" aria-label="Filter students">
        <label className="field field-search">
          <span>Search students</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or external ID"
          />
        </label>
        <label className="field">
          <span>Grade level</span>
          <select
            value={gradeLevel}
            onChange={(event) => setGradeLevel(event.target.value)}
          >
            <option value="">All grades</option>
            {Array.from({ length: 13 }, (_, grade) => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
        </label>
      </section>

      {isLoading && !data ? <LoadingNotice /> : null}
      {error ? <ErrorNotice error={error} onRetry={() => void mutate()} /> : null}
      {!isLoading && !error && students.length === 0 && data ? <EmptyNotice /> : null}
      {students.length > 0 ? <StudentResults students={students} /> : null}

      {hasMore ? (
        <div className="load-more">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setSize(size + 1)}
            disabled={isValidating}
          >
            {isValidating ? "Loading…" : "Load more students"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function StudentResults({ students }: { students: Student[] }) {
  return (
    <>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Student</th>
              <th scope="col">External ID</th>
              <th scope="col">Grade</th>
              <th scope="col">School</th>
              <th scope="col">Program status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <th scope="row">
                  <Link to={`/students/${student.id}`}>
                    {student.firstName} {student.lastName}
                  </Link>
                </th>
                <td className="external-id">{student.externalId}</td>
                <td>{student.gradeLevel}</td>
                <td>{student.schoolName}</td>
                <td>
                  <StatusBadge status={student.programStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="record-list" aria-label="Student records">
        {students.map((student) => (
          <li key={student.id} className="record-card">
            <Link to={`/students/${student.id}`} className="record-card-link">
              <div>
                <strong>
                  {student.firstName} {student.lastName}
                </strong>
                <p>
                  {student.schoolName} · Grade {student.gradeLevel}
                </p>
              </div>
              <div className="record-card-meta">
                <span className="external-id">{student.externalId}</span>
                <StatusBadge status={student.programStatus} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function StatusBadge({ status }: { status: Student["programStatus"] }) {
  const labels = {
    active: "Active",
    monitoring: "Monitoring",
    inactive: "Inactive",
  } as const;
  return <span className={`status-badge status-${status}`}>{labels[status]}</span>;
}

function LoadingNotice() {
  return (
    <div className="notice" aria-live="polite">
      Loading students…
    </div>
  );
}

function EmptyNotice() {
  return (
    <div className="empty-state">
      <h2>No students found</h2>
      <p>Try a different search term or clear the grade filter.</p>
    </div>
  );
}

function ErrorNotice({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="error-notice" role="alert">
      <div>
        <strong>Students could not be loaded.</strong>
        <p>{error.message ?? "Try again."}</p>
      </div>
      <button className="button button-secondary" type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

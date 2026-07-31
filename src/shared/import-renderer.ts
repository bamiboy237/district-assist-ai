import type { ImportSummary } from "./import-summary.js";

export function formatImportSummary(summary: ImportSummary): string {
  if (summary.status === "received" || summary.status === "processing") {
    return `The import is still ${summary.status}. Current counts are ${summary.acceptedRows} accepted and ${summary.rejectedRows} rejected rows out of ${summary.totalRows}; these counts may change.`;
  }
  if (summary.status === "failed") {
    return `The import failed after processing ${summary.totalRows} rows, with ${summary.acceptedRows} accepted and ${summary.rejectedRows} rejected. Review the import errors or retry after correcting the source file.`;
  }
  const first = summary.categories[0];
  const top = first
    ? `Most common issue: ${first.code} (${first.count}).`
    : "No validation errors were recorded.";
  return `Import completed with ${summary.acceptedRows} accepted and ${summary.rejectedRows} rejected rows out of ${summary.totalRows}. ${top}`;
}

export function formatWorkflowSummary(
  status: ImportSummary["status"],
  acceptedRows: number,
  rejectedRows: number,
): string {
  if (status === "received" || status === "processing") {
    return `The import is ${status}; current counts are ${acceptedRows} accepted and ${rejectedRows} rejected rows.`;
  }
  if (status === "failed") {
    return `The import failed with ${acceptedRows} accepted and ${rejectedRows} rejected rows recorded before failure.`;
  }
  return `The import completed with ${acceptedRows} accepted and ${rejectedRows} rejected rows.`;
}

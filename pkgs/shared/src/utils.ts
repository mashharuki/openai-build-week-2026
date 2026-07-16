import type { FileReference, ObservationLog } from "./contracts.js";

export function formatDateTime(value: string, locale: "ja" | "en"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function normalizeFileReference(file: FileReference): FileReference {
  return {
    ...file,
    fileId: file.fileId.trim(),
    mimeType: file.mimeType.trim(),
  };
}

export function dedupeObservationLogs(
  logs: readonly ObservationLog[],
): ObservationLog[] {
  const seenIds = new Set<string>();

  return logs.filter((log) => {
    if (seenIds.has(log.id)) {
      return false;
    }

    seenIds.add(log.id);
    return true;
  });
}

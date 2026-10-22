import { isoDate } from './time';

/** Hands the browser a file to save. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** e.g. qinglan-chinese-backup-2026-01-05.json */
export function datedFileName(name: string, extension: string, date = new Date()): string {
  return `qinglan-chinese-${name}-${isoDate(date.getTime())}.${extension}`;
}

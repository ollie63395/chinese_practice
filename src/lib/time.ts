/** 125 → "2:05" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A number and its unit, joined by a no-break space so a line never splits them. */
const unit = (n: number, name: string) => `${n} ${name}`;

/** 45 → "45 giây", 150 → "2 phút 30 giây", 3900 → "1 giờ 5 phút" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours) return minutes ? `${unit(hours, 'giờ')} ${unit(minutes, 'phút')}` : unit(hours, 'giờ');
  if (minutes) return seconds ? `${unit(minutes, 'phút')} ${unit(seconds, 'giây')}` : unit(minutes, 'phút');
  return unit(seconds, 'giây');
}

const timeFormat = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayFormat = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});

/** "21:05" */
export function formatTime(timestamp: number): string {
  return timeFormat.format(timestamp);
}

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** "Hôm nay", "Hôm qua", "Ngày mai", or a date such as "Thứ Năm, 8/10/2026". */
export function formatDay(timestamp: number, now = Date.now()): string {
  // Rounding keeps this right across daylight-saving changes (23- or 25-hour days).
  const daysAgo = Math.round((startOfDay(now) - startOfDay(timestamp)) / 86_400_000);
  if (daysAgo === 0) return 'Hôm nay';
  if (daysAgo === 1) return 'Hôm qua';
  if (daysAgo === -1) return 'Ngày mai';
  return dayFormat.format(timestamp);
}

/** The local midnight starting a YYYY-MM-DD day; `endOfDay` is the next one. */
export function parseIsoDate(day: string, endOfDay = false): number {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date + (endOfDay ? 1 : 0)).getTime();
}

/** A date as YYYY-MM-DD, in local time. */
export function isoDate(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

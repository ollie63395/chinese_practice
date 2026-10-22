import { describe, expect, it } from 'vitest';
import { formatClock, formatDay, formatDuration, formatTime, isoDate, parseIsoDate } from './time';

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [65, '1:05'],
    [600, '10:00'],
    [-3, '0:00'],
  ])('%d s → %s', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0 giây'],
    [45, '45 giây'],
    [60, '1 phút'],
    [150, '2 phút 30 giây'],
    [3900, '1 giờ 5 phút'],
    [7200, '2 giờ'],
  ])('%d s → %s', (seconds, expected) => {
    // Numbers are joined to their units by a no-break space.
    expect(formatDuration(seconds).replaceAll(' ', ' ')).toBe(expected);
  });

  it('never lets a line break split a number from its unit', () => {
    expect(formatDuration(150)).toBe('2 phút 30 giây');
  });
});

describe('formatTime', () => {
  it('uses the 24-hour clock', () => {
    expect(formatTime(new Date(2026, 9, 10, 21, 5).getTime())).toBe('21:05');
    expect(formatTime(new Date(2026, 9, 10, 9, 30).getTime())).toBe('09:30');
  });
});

describe('formatDay', () => {
  const now = new Date(2026, 9, 10, 9, 30).getTime();

  it('says Hôm nay and Hôm qua', () => {
    expect(formatDay(new Date(2026, 9, 10, 0, 5).getTime(), now)).toBe('Hôm nay');
    expect(formatDay(new Date(2026, 9, 9, 23, 55).getTime(), now)).toBe('Hôm qua');
  });

  it('gives the date in Vietnamese for anything older', () => {
    expect(formatDay(new Date(2026, 9, 8, 12).getTime(), now)).toBe('Thứ Năm, 8/10/2026');
  });

  it('says Ngày mai, and gives the date for later days', () => {
    expect(formatDay(new Date(2026, 9, 11, 23, 55).getTime(), now)).toBe('Ngày mai');
    expect(formatDay(new Date(2026, 9, 12, 8).getTime(), now)).toBe('Thứ Hai, 12/10/2026');
  });
});

describe('parseIsoDate', () => {
  it('gives the local midnight that starts or ends the day', () => {
    expect(parseIsoDate('2026-10-31')).toBe(new Date(2026, 9, 31).getTime());
    expect(parseIsoDate('2026-10-31', true)).toBe(new Date(2026, 10, 1).getTime());
    expect(isoDate(parseIsoDate('2026-12-31', true))).toBe('2027-01-01');
  });
});

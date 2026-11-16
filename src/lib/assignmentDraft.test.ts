import { describe, expect, it } from 'vitest';
import { blankFields, fitDraft, isBlank, sanitizeDraft, savedLabel, type AssignmentFormDraft } from './assignmentDraft';

const savedAt = new Date(2026, 10, 17, 14, 5).getTime();

const draft: AssignmentFormDraft = {
  title: 'Kể về trường học',
  instructions: 'Dùng ít nhất hai từ.',
  bank: 'an',
  source: 'pick',
  tags: ['động vật'],
  picked: ['w1', 'w2'],
  count: 3,
  timeLimitSec: 30,
  dueOn: '2026-11-18',
  studentIds: ['an', 'binh'],
  savedAt,
};

describe('isBlank', () => {
  it('holds for a form nothing has been filled in on', () => {
    expect(isBlank(blankFields('co'))).toBe(true);
    expect(isBlank({ ...blankFields('co'), title: '   ' })).toBe(true);
  });

  it('ignores only looking at another bank or way of choosing words', () => {
    expect(isBlank({ ...blankFields('co'), bank: 'an', source: 'pick' })).toBe(true);
  });

  it('fails once anything is filled in', () => {
    const blank = blankFields('co');
    for (const filled of [
      { title: 'Bài 1' },
      { instructions: 'Nói về gia đình' },
      { tags: ['động vật'] },
      { picked: ['w1'] },
      { count: 3 },
      { timeLimitSec: 30 },
      { dueOn: '2026-11-18' },
      { studentIds: ['an'] },
    ]) {
      expect(isBlank({ ...blank, ...filled })).toBe(false);
    }
  });
});

describe('sanitizeDraft', () => {
  it('keeps a draft as it was saved', () => {
    expect(sanitizeDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
  });

  it('gives nothing for missing, broken or blank drafts', () => {
    expect(sanitizeDraft(undefined)).toBeNull();
    expect(sanitizeDraft('draft')).toBeNull();
    expect(sanitizeDraft([draft])).toBeNull();
    expect(sanitizeDraft({ ...draft, bank: 7 })).toBeNull();
    expect(sanitizeDraft({ ...draft, savedAt: 'yesterday' })).toBeNull();
    expect(sanitizeDraft({ ...blankFields('co'), savedAt })).toBeNull();
  });

  it('puts unusable fields back to how a new form starts', () => {
    const sanitized = sanitizeDraft({
      title: 'Bài 1',
      instructions: 42,
      bank: 'co',
      source: 'everything',
      tags: ['động vật', 3],
      picked: 'w1',
      count: 0,
      timeLimitSec: 5,
      dueOn: 'tomorrow',
      studentIds: [null, 'an'],
      savedAt,
    });
    expect(sanitized).toEqual({ ...blankFields('co'), title: 'Bài 1', tags: ['động vật'], studentIds: ['an'], savedAt });
  });
});

describe('fitDraft', () => {
  it('leaves a draft alone when everyone is still here', () => {
    expect(fitDraft(draft, 'co', ['an', 'binh'])).toEqual(draft);
  });

  it('drops students who have gone, and falls back to the teacher’s bank', () => {
    expect(fitDraft(draft, 'co', ['binh'])).toEqual({ ...draft, bank: 'co', studentIds: ['binh'] });
  });

  it('keeps the teacher’s own bank', () => {
    expect(fitDraft({ ...draft, bank: 'co' }, 'co', ['an']).bank).toBe('co');
  });
});

describe('savedLabel', () => {
  it('says when the draft was saved', () => {
    expect(savedLabel(draft, savedAt + 60_000)).toBe('lưu hôm nay lúc 14:05');
    expect(savedLabel(draft, savedAt + 86_400_000)).toBe('lưu hôm qua lúc 14:05');
  });
});

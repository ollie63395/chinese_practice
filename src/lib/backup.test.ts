import { describe, expect, it } from 'vitest';
import { backupFileName, base64ToBlob, blobToBase64, parseBackup } from './backup';

describe('base64 helpers', () => {
  it('round-trip every byte value', async () => {
    const bytes = Uint8Array.from({ length: 256 * 3 }, (_, i) => i % 256);
    const blob = new Blob([bytes], { type: 'image/png' });
    const restored = base64ToBlob(await blobToBase64(blob), 'image/png');
    expect(restored.type).toBe('image/png');
    expect(new Uint8Array(await restored.arrayBuffer())).toEqual(bytes);
  });
});

describe('parseBackup', () => {
  const word = { id: 'w1', word: '猫', reading: 'māo', meaning: 'mèo', tags: ['động vật'], createdAt: 1, updatedAt: 2 };

  it('rejects files that are not Cíhuì backups', () => {
    expect(() => parseBackup({ hello: 'world' })).toThrow(/Tệp này không phải bản sao lưu của Cíhuì/);
    expect(() => parseBackup([])).toThrow();
  });

  it('rejects backups from a newer version', () => {
    expect(() => parseBackup({ app: 'cihui', version: 99, words: [] })).toThrow(/phiên bản Cíhuì mới hơn/);
  });

  it('keeps valid words and skips broken ones', () => {
    const result = parseBackup({ app: 'cihui', version: 1, words: [word, { id: 'w2' }, 'nonsense'] });
    expect(result.words).toEqual([word]);
  });

  it('fills in missing optional fields', () => {
    const result = parseBackup({ app: 'cihui', version: 1, words: [{ id: 'w1', word: '猫', reading: 'māo', meaning: 'mèo' }] });
    expect(result.words[0].tags).toEqual([]);
    expect(typeof result.words[0].createdAt).toBe('number');
  });

  it('keeps image links only when the image is in the file', () => {
    const result = parseBackup({
      app: 'cihui',
      version: 1,
      words: [
        { ...word, id: 'a', imageId: 'img-1' },
        { ...word, id: 'b', imageId: 'missing' },
      ],
      images: [{ id: 'img-1', type: 'image/png', data: btoa('png') }],
    });
    expect(result.words.map((w) => w.imageId)).toEqual(['img-1', undefined]);
    expect(result.images).toHaveLength(1);
    expect(result.images[0].blob.type).toBe('image/png');
  });

  it('reads practice logs', () => {
    const result = parseBackup({
      app: 'cihui',
      version: 1,
      words: [],
      practices: [
        {
          id: 'p1',
          startedAt: 100,
          endedAt: 200,
          timeLimitSec: 60,
          spokenSec: 55,
          endedEarly: true,
          notes: 'Kể chuyện về con mèo',
          words: [{ id: 'w1', word: '猫', reading: 'māo', meaning: 'mèo', used: true }],
        },
        { id: 'broken' },
      ],
    });
    expect(result.practices).toHaveLength(1);
    expect(result.practices[0]).toMatchObject({ id: 'p1', spokenSec: 55, endedEarly: true });
    expect(result.practices[0].words[0].used).toBe(true);
  });
});

describe('backupFileName', () => {
  it('includes the date', () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe('cihui-backup-2026-01-05.json');
  });
});

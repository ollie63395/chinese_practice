import { uid } from '../lib/id';
import { db } from './db';
import type { PracticeLog } from './types';

export async function addPractice(log: Omit<PracticeLog, 'id'>): Promise<PracticeLog> {
  const record: PracticeLog = { ...log, id: uid() };
  await db.practices.add(record);
  return record;
}

export async function deletePractice(id: string): Promise<void> {
  await db.practices.delete(id);
}

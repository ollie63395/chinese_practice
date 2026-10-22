// The database's access rules, tested directly against local Supabase: what each kind of
// account can read and change, whatever the app's own screens would let them do.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

process.loadEnvFile('.env.local');
const URL = process.env.VITE_SUPABASE_URL!;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const admin = createClient(URL, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

const PASSWORD = 'mat-khau-1';
const run = Math.random().toString(36).slice(2, 8);

interface Account {
  id: string;
  login: string;
  client: SupabaseClient;
}

function newClient() {
  return createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signUp(login: string, displayName: string): Promise<Account> {
  const client = newClient();
  const { data, error } = await client.auth.signUp({ email: login, password: PASSWORD, options: { data: { display_name: displayName } } });
  if (error) throw error;
  return { id: data.user!.id, login, client };
}

const word = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  word: '猫',
  reading: 'māo',
  meaning: 'mèo',
  tags: ['động vật'],
  ...extra,
});

let an: Account; // student, signs in with an email address
let binh: Account; // student, signs in with a username
let co: Account; // teacher

beforeAll(async () => {
  an = await signUp(`an-${run}@example.com`, 'Nguyễn Văn An');
  binh = await signUp(`binh_${run}@users.cihui.invalid`, 'Trần Thị Bình');
  co = await signUp(`co-${run}@example.com`, 'Cô Lan');
  // The first teacher is made by hand (in production, from the Supabase dashboard).
  const { error } = await admin.from('profiles').update({ role: 'teacher' }).eq('id', co.id);
  if (error) throw error;

  for (const [account, ids] of [
    [an, ['a1', 'shared']],
    [binh, ['b1', 'shared']],
  ] as const) {
    const { error: wordError } = await account.client.from('words').insert(ids.map((id) => word(id)));
    if (wordError) throw wordError;
    const { error: practiceError } = await account.client.from('practices').insert({
      id: `p-${ids[0]}`,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      time_limit_sec: 60,
      spoken_sec: 60,
      words: [],
    });
    if (practiceError) throw practiceError;
  }
});

describe('signing up', () => {
  it('makes every new account a student with its display name', async () => {
    const { data } = await an.client.from('profiles').select('*').eq('id', an.id).single();
    expect(data).toMatchObject({ display_name: 'Nguyễn Văn An', role: 'student', email: an.login, username: null });
  });

  it('records username accounts by username, without the made-up address', async () => {
    const { data } = await binh.client.from('profiles').select('*').eq('id', binh.id).single();
    expect(data).toMatchObject({ username: `binh_${run}`, email: null, role: 'student' });
  });

  it('keeps usernames unique', async () => {
    const { error } = await newClient().auth.signUp({ email: binh.login, password: PASSWORD });
    expect(error?.code).toBe('user_already_exists');
  });
});

describe('a student', () => {
  it('sees only their own words, practice history and profile', async () => {
    const words = await an.client.from('words').select('id, owner_id');
    expect(words.data?.every((w) => w.owner_id === an.id)).toBe(true);
    expect(words.data?.map((w) => w.id).sort()).toEqual(['a1', 'shared']);

    const practices = await an.client.from('practices').select('owner_id');
    expect(practices.data).toEqual([{ owner_id: an.id }]);

    const profiles = await an.client.from('profiles').select('id');
    expect(profiles.data).toEqual([{ id: an.id }]);

    const summaries = await an.client.from('account_summaries').select('id, word_count, practice_count');
    expect(summaries.data).toEqual([{ id: an.id, word_count: 2, practice_count: 1 }]);
  });

  it('cannot add, change or delete another student’s words', async () => {
    const insert = await an.client.from('words').insert({ ...word('sneaky'), owner_id: binh.id });
    expect(insert.error?.code).toBe('42501');

    const update = await an.client.from('words').update({ meaning: 'hacked' }).eq('owner_id', binh.id).select();
    expect(update.data).toEqual([]);
    const remove = await an.client.from('words').delete().eq('owner_id', binh.id).select();
    expect(remove.data).toEqual([]);

    const { data } = await admin.from('words').select('meaning').eq('owner_id', binh.id).eq('id', 'b1').single();
    expect(data?.meaning).toBe('mèo');
  });

  it('cannot hand a word to someone else', async () => {
    const { error } = await an.client.from('words').update({ owner_id: binh.id }).eq('owner_id', an.id).eq('id', 'a1');
    expect(error?.code).toBe('42501');
  });

  it('cannot point a word at a picture outside their own folder', async () => {
    const { error } = await an.client.from('words').update({ image_path: `${binh.id}/x` }).eq('id', 'a1');
    expect(error?.code).toBe('23514');
  });

  it('can rename themselves but not make themselves a teacher', async () => {
    const rename = await an.client.from('profiles').update({ display_name: 'An Nguyễn' }).eq('id', an.id).select();
    expect(rename.data?.[0].display_name).toBe('An Nguyễn');

    const promote = await an.client.from('profiles').update({ role: 'teacher' }).eq('id', an.id);
    expect(promote.error?.code).toBe('42501');
    const viaFunction = await an.client.rpc('set_account_role', { target: an.id, new_role: 'teacher' });
    expect(viaFunction.error?.code).toBe('42501');

    const { data } = await admin.from('profiles').select('role').eq('id', an.id).single();
    expect(data?.role).toBe('student');
  });

  it('cannot reset anyone’s password', async () => {
    const { error } = await an.client.rpc('reset_student_password', { target: binh.id, new_password: 'hacked!!' });
    expect(error?.code).toBe('42501');
  });
});

describe('a teacher', () => {
  it('sees every student’s words, practice history and profile', async () => {
    const words = await co.client.from('words').select('owner_id, id').in('owner_id', [an.id, binh.id]);
    expect(words.data).toHaveLength(4);
    const practices = await co.client.from('practices').select('owner_id').in('owner_id', [an.id, binh.id]);
    expect(practices.data).toHaveLength(2);
    const summaries = await co.client.from('account_summaries').select('id, word_count').in('id', [an.id, binh.id, co.id]);
    expect(summaries.data).toHaveLength(3);
  });

  it('can only look: cannot change or delete a student’s words', async () => {
    const update = await co.client.from('words').update({ meaning: 'changed' }).eq('owner_id', an.id).select();
    expect(update.data).toEqual([]);
    const remove = await co.client.from('words').delete().eq('owner_id', an.id).select();
    expect(remove.data).toEqual([]);
    const insert = await co.client.from('words').insert({ ...word('gift'), owner_id: an.id });
    expect(insert.error?.code).toBe('42501');
  });

  it('can make a student a teacher and back, but not change their own role', async () => {
    expect((await co.client.rpc('set_account_role', { target: an.id, new_role: 'teacher' })).error).toBeNull();
    const asTeacher = await an.client.from('profiles').select('id').in('id', [binh.id]);
    expect(asTeacher.data).toHaveLength(1);

    expect((await co.client.rpc('set_account_role', { target: an.id, new_role: 'student' })).error).toBeNull();
    const asStudent = await an.client.from('profiles').select('id').in('id', [binh.id]);
    expect(asStudent.data).toEqual([]);

    const self = await co.client.rpc('set_account_role', { target: co.id, new_role: 'student' });
    expect(self.error?.code).toBe('42501');
  });

  it('can reset a student’s password, so a username account can sign in again', async () => {
    const { error } = await co.client.rpc('reset_student_password', { target: binh.id, new_password: 'mat-khau-moi' });
    expect(error).toBeNull();
    const old = await newClient().auth.signInWithPassword({ email: binh.login, password: PASSWORD });
    expect(old.error?.code).toBe('invalid_credentials');
    const fresh = await newClient().auth.signInWithPassword({ email: binh.login, password: 'mat-khau-moi' });
    expect(fresh.error).toBeNull();
  });

  it('cannot reset a teacher’s password, or set one that is too short', async () => {
    const teacher = await co.client.rpc('reset_student_password', { target: co.id, new_password: 'whatever1' });
    expect(teacher.error?.code).toBe('42501');
    const short = await co.client.rpc('reset_student_password', { target: an.id, new_password: '123' });
    expect(short.error?.code).toBe('22023');
  });
});

describe('assignments', () => {
  const words = [{ id: 'w1', word: '猫', reading: 'māo', meaning: 'mèo' }];
  const assignment = { title: 'Kể về con mèo', words, word_count: 1, time_limit_sec: 60 };
  const session = (id: string, assignment_id: string) => ({
    id,
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    time_limit_sec: 60,
    spoken_sec: 60,
    words: [],
    assignment_id,
  });
  let id: string;
  let thay: Account; // another teacher

  beforeAll(async () => {
    thay = await signUp(`thay-${run}@example.com`, 'Thầy Minh');
    const promoted = await admin.from('profiles').update({ role: 'teacher' }).eq('id', thay.id);
    if (promoted.error) throw promoted.error;

    const { data, error } = await co.client.from('assignments').insert(assignment).select('id, teacher_id').single();
    if (error) throw error;
    expect(data.teacher_id).toBe(co.id);
    id = data.id;
    const given = await co.client.from('assignment_students').insert({ assignment_id: id, student_id: an.id });
    if (given.error) throw given.error;
  });

  it('are seen only by the students given them, who never see who else got them', async () => {
    const forAn = await an.client.from('assignments').select('id, title, assignment_students(student_id)');
    expect(forAn.data).toEqual([{ id, title: 'Kể về con mèo', assignment_students: [{ student_id: an.id }] }]);
    expect((await binh.client.from('assignments').select('id')).data).toEqual([]);
    expect((await binh.client.from('assignment_students').select('*')).data).toEqual([]);
  });

  it('can only be given out by teachers', async () => {
    const make = await an.client.from('assignments').insert(assignment);
    expect(make.error?.code).toBe('42501');
    const join = await binh.client.from('assignment_students').insert({ assignment_id: id, student_id: binh.id });
    expect(join.error?.code).toBe('42501');
  });

  it('are read by every teacher but changed only by the one who gave them', async () => {
    expect((await thay.client.from('assignments').select('id').eq('id', id)).data).toEqual([{ id }]);
    const rename = await thay.client.from('assignments').update({ title: 'Đổi tên' }).eq('id', id).select();
    expect(rename.data).toEqual([]);
    const remove = await thay.client.from('assignments').delete().eq('id', id).select();
    expect(remove.data).toEqual([]);
    const give = await thay.client.from('assignment_students').insert({ assignment_id: id, student_id: binh.id });
    expect(give.error?.code).toBe('42501');

    const handOver = await co.client.from('assignments').update({ teacher_id: thay.id }).eq('id', id);
    expect(handOver.error?.code).toBe('42501');
    const studentRename = await an.client.from('assignments').update({ title: 'hacked' }).eq('id', id).select();
    expect(studentRename.data).toEqual([]);
  });

  it('take sessions only from the students given them, and the link can’t be changed afterwards', async () => {
    expect((await an.client.from('practices').insert(session('p-assigned', id))).error).toBeNull();
    const sneaky = await binh.client.from('practices').insert(session('p-sneaky', id));
    expect(sneaky.error?.code).toBe('42501');
    const unlink = await an.client.from('practices').update({ assignment_id: null }).eq('id', 'p-assigned');
    expect(unlink.error?.code).toBe('42501');

    const seen = await co.client.from('practices').select('id, owner_id').eq('assignment_id', id);
    expect(seen.data).toEqual([{ id: 'p-assigned', owner_id: an.id }]);
  });

  it('when deleted, leave the sessions done for them in the students’ history', async () => {
    expect((await co.client.from('assignments').delete().eq('id', id).select('id')).data).toEqual([{ id }]);
    const { data } = await an.client.from('practices').select('assignment_id').eq('id', 'p-assigned').single();
    expect(data).toEqual({ assignment_id: null });
    expect((await an.client.from('assignments').select('id')).data).toEqual([]);
  });
});

describe('pictures', () => {
  const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });

  it('are private to their owner, readable by teachers, and only changed by their owner', async () => {
    const path = `${an.id}/pic-${run}`;
    expect((await an.client.storage.from('word-images').upload(path, png)).error).toBeNull();

    const intoOtherFolder = await an.client.storage.from('word-images').upload(`${binh.id}/pic-${run}`, png);
    expect(intoOtherFolder.error).not.toBeNull();

    expect((await binh.client.storage.from('word-images').download(path)).data).toBeNull();
    expect((await co.client.storage.from('word-images').download(path)).data?.size).toBe(4);

    await co.client.storage.from('word-images').remove([path]);
    expect((await an.client.storage.from('word-images').download(path)).data?.size).toBe(4);
    await an.client.storage.from('word-images').remove([path]);
    expect((await an.client.storage.from('word-images').download(path)).data).toBeNull();
  });
});

describe('without signing in', () => {
  it('nothing can be read', async () => {
    const anonymous = newClient();
    for (const table of ['words', 'practices', 'profiles', 'account_summaries', 'assignments', 'assignment_students']) {
      const { data } = await anonymous.from(table).select('*');
      expect(data ?? []).toEqual([]);
    }
  });
});

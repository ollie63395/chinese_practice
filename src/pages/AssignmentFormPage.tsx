import { BookOpen, Check, FileSpreadsheet, Plus, SearchX, Send, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useToast } from '../components/feedback';
import { DurationInput, MIN_SPEECH_SECONDS, NumberStepper } from '../components/NumberInputs';
import { TagPicker } from '../components/TagPicker';
import { buttonClass, EmptyState, ErrorNotice, inputClass, MixedText, PageHeader, PageLoader, SearchInput, Segmented } from '../components/ui';
import { saveAssignment } from '../db/assignments';
import { useAccount } from '../db/auth';
import { useAccountSummaries, useAssignments, useTagCounts, useWords } from '../db/hooks';
import type { AccountSummary, Assignment, Word } from '../db/types';
import { loginLabel } from '../lib/accounts';
import { assignmentWords } from '../lib/assignments';
import { cn } from '../lib/cn';
import { useDocumentTitle } from '../lib/hooks';
import { fold, matchesSearch } from '../lib/search';
import { wordsWithAnyTag } from '../lib/tags';
import { NotFoundPage } from './ErrorPages';
import { SetupRow } from './speaking/SetupStep';

/** Teachers only: giving out a new assignment, or changing one of theirs. */
export function AssignmentFormPage() {
  const { isTeacher } = useAccount();
  const { id } = useParams();
  if (!isTeacher) return <NotFoundPage />;
  return id ? <EditAssignment key={id} id={id} /> : <AssignmentForm />;
}

function EditAssignment({ id }: { id: string }) {
  const me = useAccount().id;
  const assignments = useAssignments();
  if (!assignments) return <PageLoader />;
  const assignment = assignments.find((a) => a.id === id && a.teacherId === me);
  if (!assignment) {
    return (
      <EmptyState
        icon={<SearchX />}
        title="Không tìm thấy bài tập này"
        action={
          <Link to="/assignments" className={buttonClass('secondary')}>
            Quay lại danh sách bài tập
          </Link>
        }
      >
        Có thể bài tập đã bị xóa, hoặc do giáo viên khác giao.
      </EmptyState>
    );
  }
  return <AssignmentForm existing={assignment} />;
}

type Source = 'all' | 'tags' | 'pick';

function AssignmentForm({ existing }: { existing?: Assignment }) {
  useDocumentTitle(existing ? 'Sửa bài tập' : 'Giao bài mới');
  const words = useWords();
  const accounts = useAccountSummaries();
  if (!words || !accounts) return <PageLoader />;
  return <AssignmentFields existing={existing} words={words} accounts={accounts} />;
}

interface AssignmentFieldsProps {
  existing?: Assignment;
  /** The teacher's own words. */
  words: Word[];
  accounts: AccountSummary[];
}

function AssignmentFields({ existing, words, accounts }: AssignmentFieldsProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const tagCounts = useTagCounts(words);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');
  // An assignment being changed starts from the words it was given, picked one by one.
  const [source, setSource] = useState<Source>(existing ? 'pick' : 'all');
  const [tags, setTags] = useState<string[]>([]);
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set(existing?.words.map((w) => w.id)));
  const [count, setCount] = useState(existing?.wordCount ?? 5);
  const [timeLimitSec, setTimeLimitSec] = useState(existing?.timeLimitSec ?? 120);
  const [dueOn, setDueOn] = useState(existing?.dueOn ?? '');
  const [studentIds, setStudentIds] = useState<ReadonlySet<string>>(() => new Set(existing?.studentIds));
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Words already given out stay pickable even if they've since been deleted from the bank.
  const choices = useMemo(() => {
    const inBank = new Set(words.map((w) => w.id));
    return [...words, ...(existing ? assignmentWords(existing).filter((w) => !inBank.has(w.id)) : [])];
  }, [words, existing]);
  const pool =
    source === 'all' ? words : source === 'tags' ? wordsWithAnyTag(words, tags) : choices.filter((w) => picked.has(w.id));
  const max = Math.max(1, pool.length);
  const wordCount = Math.min(count, max);
  const students = accounts.filter((a) => a.role === 'student');

  if (choices.length === 0) {
    return (
      <>
        <PageHeader back={{ to: '/assignments', label: 'Bài tập' }} zh="作业" title="Giao bài mới" />
        <EmptyState
          icon={<BookOpen />}
          title="Hãy thêm vài từ vào kho của bạn trước"
          action={
            <>
              <Link to="/words/new" className={buttonClass('primary')}>
                <Plus /> Thêm từ
              </Link>
              <Link to="/words/import" className={buttonClass('secondary')}>
                <FileSpreadsheet /> Nhập từ bảng tính
              </Link>
            </>
          }
        >
          Học viên sẽ bốc từ trong số những từ bạn chọn từ kho của mình.
        </EmptyState>
      </>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const issue = !title.trim()
      ? 'Hãy đặt tên cho bài tập.'
      : pool.length === 0
        ? 'Hãy chọn ít nhất một từ.'
        : timeLimitSec < MIN_SPEECH_SECONDS
          ? `Hãy đặt thời gian nói ít nhất ${MIN_SPEECH_SECONDS} giây.`
          : studentIds.size === 0
            ? 'Hãy chọn ít nhất một học viên.'
            : null;
    setProblem(issue);
    if (issue) return;

    setSaving(true);
    try {
      const id = await saveAssignment(
        {
          title: title.trim(),
          instructions: instructions.trim(),
          words: pool,
          wordCount,
          timeLimitSec,
          dueOn: dueOn || null,
          studentIds: [...studentIds],
        },
        existing?.id,
      );
      toast(existing ? 'Đã lưu bài tập' : `Đã giao bài cho ${studentIds.size} học viên`);
      void navigate(`/assignments/${id}`, { replace: Boolean(existing) });
    } catch (err) {
      setProblem(err instanceof Error ? `Không lưu được: ${err.message}` : 'Không lưu được bài tập.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        back={existing ? { to: `/assignments/${existing.id}`, label: existing.title } : { to: '/assignments', label: 'Bài tập' }}
        zh="作业"
        title={existing ? 'Sửa bài tập' : 'Giao bài mới'}
        description={
          existing
            ? 'Thay đổi chỉ áp dụng cho các lần luyện sau. Những lần học viên đã làm vẫn được tính theo bài lúc đó.'
            : 'Học viên bốc ngẫu nhiên vài từ trong kho từ bạn chọn, chuẩn bị, rồi nói trong thời gian giới hạn.'
        }
      />
      <form noValidate onSubmit={(event) => void submit(event)} className="max-w-2xl space-y-4">
        <SetupRow step={1} title="Tên bài" htmlFor="assignment-title">
          <input
            id="assignment-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            placeholder="Ví dụ: Kể về trường học của em"
            className={inputClass}
          />
          <div className="space-y-1.5">
            <label htmlFor="assignment-instructions" className="text-sm font-semibold">
              Đề bài <span className="font-normal text-faint">không bắt buộc</span>
            </label>
            <textarea
              id="assignment-instructions"
              rows={3}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              maxLength={5000}
              placeholder="Học viên nên nói về điều gì, dùng mẫu câu nào…"
              className={cn(inputClass, 'resize-y')}
            />
          </div>
        </SetupRow>

        <SetupRow step={2} title="Kho từ" description={`Học viên bốc từ trong số ${pool.length} từ.`}>
          <Segmented
            label="Lấy từ"
            value={source}
            onChange={setSource}
            options={[
              { value: 'all', label: 'Tất cả' },
              ...(tagCounts.length > 0 ? [{ value: 'tags' as const, label: 'Theo nhãn' }] : []),
              { value: 'pick', label: 'Tự chọn' },
            ]}
          />
          {source === 'tags' && (
            <div className="space-y-2">
              <TagPicker tags={tagCounts} selected={tags} onChange={setTags} />
              {tags.length === 0 && <p className="text-sm text-muted">Hãy chọn ít nhất một nhãn.</p>}
            </div>
          )}
          {source === 'pick' && <WordChecklist words={choices} picked={picked} onChange={setPicked} />}
        </SetupRow>

        <SetupRow step={3} title="Bốc bao nhiêu từ mỗi lần?" htmlFor="assignment-count">
          <NumberStepper id="assignment-count" label="số từ" value={wordCount} min={1} max={max} onChange={setCount} />
        </SetupRow>

        <SetupRow step={4} title="Thời gian nói" description="Học viên hoàn thành bài khi nói đủ thời gian này.">
          <DurationInput idPrefix="assignment-time" seconds={timeLimitSec} onChange={setTimeLimitSec} />
        </SetupRow>

        <SetupRow step={5} title="Hạn nộp" htmlFor="assignment-due" description="Không bắt buộc. Học viên vẫn làm được sau hạn, nhưng sẽ hiện là quá hạn.">
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="assignment-due"
              type="date"
              value={dueOn}
              onChange={(event) => setDueOn(event.target.value)}
              className={cn(inputClass, 'w-auto')}
            />
            {dueOn && (
              <button type="button" onClick={() => setDueOn('')} className={buttonClass('ghost', 'sm')}>
                <X /> Bỏ hạn
              </button>
            )}
          </div>
        </SetupRow>

        <SetupRow step={6} title="Giao cho" description={`Đã chọn ${studentIds.size} học viên.`}>
          {students.length === 0 ? (
            <p className="text-sm text-muted">Chưa có học viên nào. Khi học viên tạo tài khoản, họ sẽ hiện ở đây.</p>
          ) : (
            <StudentChecklist students={students} selected={studentIds} onChange={setStudentIds} />
          )}
        </SetupRow>

        {problem && <ErrorNotice>{problem}</ErrorNotice>}
        <button type="submit" disabled={saving} className={buttonClass('primary', 'lg', 'w-full sm:w-auto')}>
          {existing ? <Check /> : <Send />} {existing ? 'Lưu thay đổi' : 'Giao bài'}
        </button>
      </form>
    </>
  );
}

const checkRow = 'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-sunken';
const checkbox = 'size-4 shrink-0 cursor-pointer accent-accent';

interface WordChecklistProps {
  words: Word[];
  picked: ReadonlySet<string>;
  onChange: (picked: ReadonlySet<string>) => void;
}

function WordChecklist({ words, picked, onChange }: WordChecklistProps) {
  const [query, setQuery] = useState('');
  const matches = words.filter((w) => matchesSearch(w, query));
  const allPicked = matches.length > 0 && matches.every((w) => picked.has(w.id));
  const toggle = (id: string) => {
    const next = new Set(picked);
    if (!next.delete(id)) next.add(id);
    onChange(next);
  };
  const toggleMatches = () => {
    const next = new Set(picked);
    for (const w of matches) {
      if (allPicked) next.delete(w.id);
      else next.add(w.id);
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} label="Tìm từ" placeholder="Chữ Hán, pinyin, nghĩa hoặc nhãn" />
        <button type="button" onClick={toggleMatches} disabled={matches.length === 0} className={buttonClass('secondary', 'sm')}>
          {allPicked ? 'Bỏ chọn' : 'Chọn'} {query.trim() ? `${matches.length} từ phù hợp` : 'tất cả'}
        </button>
      </div>
      <p className="text-sm text-muted">Đã chọn {picked.size} từ.</p>
      <ul aria-label="Các từ" className="max-h-80 overflow-y-auto rounded-xl border border-line p-1">
        {matches.map((word) => (
          <li key={word.id}>
            <label className={checkRow}>
              <input type="checkbox" checked={picked.has(word.id)} onChange={() => toggle(word.id)} className={checkbox} />
              <span lang="zh-Hans" className="font-zh text-lg font-semibold">
                {word.word}
              </span>
              {word.reading !== word.word && (
                <span lang="zh-Latn-pinyin" className="font-pinyin text-sm text-accent-ink">
                  {word.reading}
                </span>
              )}
              {/* The padding gives stacked marks on capitals (Ấ, Ổ) room inside the clipped box. */}
              <span className="min-w-0 flex-1 truncate py-1 text-sm text-muted">
                <MixedText>{word.meaning}</MixedText>
              </span>
            </label>
          </li>
        ))}
        {matches.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">Không có từ nào phù hợp.</li>}
      </ul>
    </div>
  );
}

interface StudentChecklistProps {
  students: AccountSummary[];
  selected: ReadonlySet<string>;
  onChange: (selected: ReadonlySet<string>) => void;
}

function StudentChecklist({ students, selected, onChange }: StudentChecklistProps) {
  const [query, setQuery] = useState('');
  const q = fold(query.trim());
  const matches = students.filter((s) => !q || fold(s.displayName).includes(q) || fold(loginLabel(s)).includes(q));
  const allSelected = matches.length > 0 && matches.every((s) => selected.has(s.id));
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (!next.delete(id)) next.add(id);
    onChange(next);
  };
  const toggleMatches = () => {
    const next = new Set(selected);
    for (const s of matches) {
      if (allSelected) next.delete(s.id);
      else next.add(s.id);
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} label="Tìm học viên" placeholder="Tên, email hoặc tên đăng nhập" />
        <button type="button" onClick={toggleMatches} disabled={matches.length === 0} className={buttonClass('secondary', 'sm')}>
          {allSelected ? 'Bỏ chọn' : 'Chọn'} {q ? `${matches.length} học viên` : 'tất cả'}
        </button>
      </div>
      <ul aria-label="Học viên" className="max-h-80 overflow-y-auto rounded-xl border border-line p-1">
        {matches.map((student) => (
          <li key={student.id}>
            <label className={checkRow}>
              <input type="checkbox" checked={selected.has(student.id)} onChange={() => toggle(student.id)} className={checkbox} />
              <span className="font-medium">{student.displayName}</span>
              <span className="min-w-0 flex-1 truncate py-0.5 text-sm text-muted">{loginLabel(student)}</span>
            </label>
          </li>
        ))}
        {matches.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">Không có ai khớp với “{query}”.</li>}
      </ul>
    </div>
  );
}

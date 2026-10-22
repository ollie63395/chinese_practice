import { Bot, Check, ClipboardCopy, FileSpreadsheet, FileText, Undo2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useConfirm, useToast } from '../components/feedback';
import { TagInput } from '../components/TagInput';
import {
  buttonClass,
  ErrorNotice,
  Field,
  IconPanel,
  inputClass,
  MixedText,
  PageHeader,
  PageLoader,
  panelClass,
  Segmented,
  TagChip,
} from '../components/ui';
import { useTagCounts, useWords } from '../db/hooks';
import type { Word } from '../db/types';
import { importWords, undoImport, type ImportReceipt, type WordImport } from '../db/words';
import { cn } from '../lib/cn';
import { parseTable, readTextFile, toCsv } from '../lib/csv';
import { downloadBlob } from '../lib/download';
import { useDocumentTitle } from '../lib/hooks';
import { addTag } from '../lib/tags';
import { aiPrompt, previewImport, TEMPLATE_HEADERS, type ImportRow } from '../lib/wordSheet';

const TEMPLATE_NAME = 'qinglan-chinese-mau-tu-vung';
/** Rows shown at once in the preview; a long list is summed up after these. */
const SHOWN_ROWS = 300;

type Stage =
  | { step: 'input' }
  | { step: 'preview'; rows: ImportRow[]; source: string }
  | { step: 'done'; receipt: ImportReceipt; added: number; updated: number; tag?: string };

type Filter = 'all' | 'new' | 'existing' | 'problems';

async function readRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) return (await import('../lib/wordXlsx')).readXlsx(file);
  if (name.endsWith('.xls') || name.endsWith('.ods') || name.endsWith('.numbers')) {
    throw new Error('Chỉ đọc được tệp .xlsx và .csv. Hãy mở tệp này rồi lưu lại thành .xlsx (Excel Workbook).');
  }
  if (name.endsWith('.json')) {
    throw new Error('Đây có vẻ là một bản sao lưu. Hãy khôi phục nó ở trang “Nhập, xuất & sao lưu”.');
  }
  return parseTable(await readTextFile(file));
}

/** Tags in order, without repeats (ignoring case), reusing the spelling of tags already in use. */
function mergeTags(known: readonly string[], ...lists: readonly string[][]): string[] {
  return lists.flat().reduce<string[]>((tags, tag) => addTag(tags, tag, known), []);
}

export function WordImportPage() {
  useDocumentTitle('Nhập từ hàng loạt');
  const words = useWords();
  const tagCounts = useTagCounts(words);
  const knownTags = useMemo(() => tagCounts.map((t) => t.tag), [tagCounts]);
  const [stage, setStage] = useState<Stage>({ step: 'input' });
  // Each step starts at the top, where its summary and buttons are.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stage]);

  if (!words) return <PageLoader />;

  return (
    <>
      <PageHeader
        back={{ to: '/words', label: 'Từ vựng của bạn' }}
        zh="批量导入"
        title="Nhập từ hàng loạt"
        description="Thêm nhiều từ một lúc từ Excel, Google Sheets, tệp CSV hoặc câu trả lời của AI. Bạn sẽ được xem trước trước khi lưu."
      />
      {stage.step === 'input' && (
        <InputStep words={words} knownTags={knownTags} onPreview={(rows, source) => setStage({ step: 'preview', rows, source })} />
      )}
      {stage.step === 'preview' && (
        <PreviewStep
          key={stage.source}
          rows={stage.rows}
          source={stage.source}
          knownTags={knownTags}
          onBack={() => setStage({ step: 'input' })}
          onDone={(done) => setStage({ step: 'done', ...done })}
        />
      )}
      {stage.step === 'done' && <DoneStep {...stage} onAgain={() => setStage({ step: 'input' })} />}
    </>
  );
}

// ---------------------------------------------------------------- Getting the words in

interface InputStepProps {
  words: Word[];
  knownTags: string[];
  onPreview: (rows: ImportRow[], source: string) => void;
}

function InputStep({ words, knownTags, onPreview }: InputStepProps) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const prompt = useMemo(() => aiPrompt(knownTags), [knownTags]);

  const preview = async (source: string, read: () => Promise<string[][]>) => {
    setBusy(true);
    setProblem(null);
    try {
      onPreview(previewImport(await read(), words, knownTags), source);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Không đọc được danh sách này.');
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async (kind: 'xlsx' | 'csv') => {
    try {
      const blob =
        kind === 'csv'
          ? new Blob([toCsv([TEMPLATE_HEADERS])], { type: 'text/csv;charset=utf-8' })
          : await (await import('../lib/wordXlsx')).templateXlsx();
      downloadBlob(blob, `${TEMPLATE_NAME}.${kind}`);
    } catch {
      toast('Không tải được mẫu. Hãy kiểm tra mạng rồi thử lại.');
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast('Đã sao chép câu lệnh');
    } catch {
      // The clipboard needs HTTPS and permission; the prompt can still be copied by hand.
      setPromptOpen(true);
      toast('Không sao chép tự động được. Hãy chọn và sao chép câu lệnh bên dưới.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <IconPanel icon={<FileSpreadsheet />} title="Điền vào bảng mẫu">
          <p className="text-sm text-muted">
            Mẫu có sẵn các cột {TEMPLATE_HEADERS.join(', ')}. Mở bằng Excel hoặc Google Sheets rồi điền mỗi từ một dòng. Pinyin
            gõ bằng số (ni3 hao3) cũng được.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void downloadTemplate('xlsx')} className={buttonClass('secondary')}>
              <FileSpreadsheet /> Mẫu Excel (.xlsx)
            </button>
            <button type="button" onClick={() => void downloadTemplate('csv')} className={buttonClass('ghost')}>
              <FileText /> Mẫu CSV
            </button>
          </div>
        </IconPanel>

        <IconPanel icon={<Bot />} title="Nhờ AI điền giúp">
          <p className="text-sm text-muted">
            Sao chép câu lệnh, dán vào ChatGPT, Claude hoặc Gemini và thêm danh sách từ hay chủ đề bạn muốn học. Rồi dán câu trả lời
            của AI vào ô bên dưới.
          </p>
          <button type="button" onClick={() => void copyPrompt()} className={buttonClass('secondary', 'md', 'mt-4')}>
            <ClipboardCopy /> Sao chép câu lệnh
          </button>
          <details open={promptOpen} onToggle={(event) => setPromptOpen(event.currentTarget.open)} className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted hover:text-ink">Xem câu lệnh</summary>
            <textarea
              readOnly
              value={prompt}
              aria-label="Câu lệnh cho AI"
              onFocus={(event) => event.currentTarget.select()}
              rows={10}
              className={cn(inputClass, 'mt-2 font-mono text-xs')}
            />
          </details>
        </IconPanel>
      </div>

      <IconPanel
        icon={<Upload />}
        title="Đưa danh sách vào"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          // Moving onto something inside the panel is not leaving it.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void preview(file.name, () => readRows(file));
        }}
        className={cn('space-y-4 transition', dragging && 'border-accent ring-3 ring-accent/15')}
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.csv,.tsv,.txt,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            aria-label="Chọn tệp bảng tính"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void preview(file.name, () => readRows(file));
            }}
          />
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className={buttonClass('primary')}>
            <Upload /> Chọn tệp (.xlsx, .csv)
          </button>
          <span className="text-sm text-muted">hoặc kéo tệp vào đây</span>
        </div>
        <Field
          label="Hoặc dán vào đây"
          htmlFor="pasted"
          hint="Các dòng chép từ Excel hay Google Sheets, hoặc khối CSV AI trả lời. Có dòng tiêu đề thì các cột theo tiêu đề; không có thì theo thứ tự Chữ Hán, Pinyin, Nghĩa, Nhãn."
        >
          <textarea
            id="pasted"
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={6}
            placeholder={`${TEMPLATE_HEADERS.join(',')}\n"你好","nǐ hǎo","xin chào","chào hỏi"`}
            spellCheck={false}
            className={cn(inputClass, 'font-mono text-sm')}
          />
        </Field>
        {problem && <ErrorNotice>{problem}</ErrorNotice>}
        <button
          type="button"
          disabled={busy || !pasted.trim()}
          onClick={() => void preview('nội dung đã dán', async () => parseTable(pasted))}
          className={buttonClass('secondary')}
        >
          Xem trước
        </button>
      </IconPanel>
    </div>
  );
}

// ---------------------------------------------------------------- Preview

interface PreviewStepProps {
  rows: ImportRow[];
  source: string;
  knownTags: string[];
  onBack: () => void;
  onDone: (done: { receipt: ImportReceipt; added: number; updated: number; tag?: string }) => void;
}

function PreviewStep({ rows, source, knownTags, onBack, onDone }: PreviewStepProps) {
  const toast = useToast();
  const [existingMode, setExistingMode] = useState<'skip' | 'update'>('skip');
  const [extraTags, setExtraTags] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [saving, setSaving] = useState(false);

  const counts = {
    new: rows.filter((r) => r.status === 'new').length,
    existing: rows.filter((r) => r.status === 'existing').length,
    problems: rows.filter((r) => r.status === 'error' || r.status === 'repeat').length,
  };

  const plan = useMemo<WordImport>(() => {
    const add = rows.flatMap((r) => (r.status === 'new' ? [{ ...r.value, tags: mergeTags(knownTags, r.value.tags, extraTags) }] : []));
    const update =
      existingMode === 'skip'
        ? []
        : rows.flatMap((r) => {
          if (r.status !== 'existing') return [];
          const tags = mergeTags(knownTags, r.existing.tags, r.value.tags, extraTags);
          const unchanged = r.value.meaning === r.existing.meaning && tags.length === r.existing.tags.length;
          return unchanged ? [] : [{ previous: r.existing, meaning: r.value.meaning, tags }];
        });
    return { add, update };
  }, [rows, knownTags, extraTags, existingMode]);
  const total = plan.add.length + plan.update.length;

  const shown = rows.filter(
    (r) =>
      filter === 'all' ||
      (filter === 'problems' ? r.status === 'error' || r.status === 'repeat' : r.status === filter),
  );
  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: `Tất cả (${rows.length})` },
    ...(counts.new ? [{ value: 'new' as const, label: `Mới (${counts.new})` }] : []),
    ...(counts.existing ? [{ value: 'existing' as const, label: `Đã có (${counts.existing})` }] : []),
    ...(counts.problems ? [{ value: 'problems' as const, label: `Bị bỏ qua (${counts.problems})` }] : []),
  ];

  const save = async () => {
    setSaving(true);
    try {
      const receipt = await importWords(plan);
      toast(`Đã nhập ${plan.add.length} từ${plan.update.length ? `, cập nhật ${plan.update.length} từ` : ''}`);
      onDone({ receipt, added: plan.add.length, updated: plan.update.length, tag: extraTags[0] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không nhập được các từ này.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className={cn(panelClass, 'space-y-5 p-5 md:p-6')}>
        <div>
          <h2 className="font-semibold">
            Xem trước: <MixedText>{source}</MixedText>
          </h2>
          <p className="mt-2 flex flex-wrap gap-2 text-sm">
            <Count tone="good">{counts.new} từ mới</Count>
            {counts.existing > 0 && <Count tone="warn">{counts.existing} từ đã có</Count>}
            {counts.problems > 0 && <Count tone="danger">{counts.problems} dòng bị bỏ qua</Count>}
          </p>
        </div>
        {counts.existing > 0 && (
          <Field
            label="Từ đã có trong kho"
            hint={
              existingMode === 'skip'
                ? 'Những từ này được giữ nguyên.'
                : 'Nghĩa được thay bằng nghĩa trong danh sách; nhãn mới được thêm vào, nhãn cũ vẫn giữ.'
            }
          >
            <div>
              <Segmented
                label="Từ đã có trong kho"
                value={existingMode}
                onChange={setExistingMode}
                options={[
                  { value: 'skip', label: 'Bỏ qua' },
                  { value: 'update', label: 'Cập nhật nghĩa & nhãn' },
                ]}
              />
            </div>
          </Field>
        )}
        <Field label="Gắn thêm nhãn cho mọi từ" htmlFor="extra-tags" optional hint="Ví dụ tên bài học, để ôn riêng những từ này sau.">
          <TagInput id="extra-tags" value={extraTags} onChange={setExtraTags} suggestions={knownTags} />
        </Field>
        {counts.problems > 0 && (
          <p className="text-sm text-muted">
            Dòng có lỗi hoặc bị trùng sẽ không được nhập. Hãy sửa chúng trong bảng tính rồi nhập lại; những từ đã nhập lần này sẽ hiện là
            “đã có”.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={saving || total === 0} onClick={() => void save()} className={buttonClass('primary', 'lg')}>
            <Check /> {saving ? 'Đang nhập…' : `Nhập ${total} từ`}
          </button>
          <button type="button" disabled={saving} onClick={onBack} className={buttonClass('ghost', 'lg')}>
            Chọn danh sách khác
          </button>
        </div>
      </section>

      {filters.length > 2 && (
        <div className="overflow-x-auto">
          <Segmented label="Hiện" value={filter} onChange={setFilter} options={filters} />
        </div>
      )}
      <ul aria-label="Các dòng trong danh sách" className="space-y-2">
        {shown.slice(0, SHOWN_ROWS).map((row) => (
          <PreviewRow key={row.rowNumber} row={row} updating={existingMode === 'update'} />
        ))}
      </ul>
      {shown.length > SHOWN_ROWS && <p className="text-center text-sm text-muted">… và {shown.length - SHOWN_ROWS} dòng nữa.</p>}
    </div>
  );
}

const TONES = {
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  muted: 'bg-sunken text-muted',
};

function Count({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return <span className={cn('rounded-full px-2.5 py-0.5 font-medium', TONES[tone])}>{children}</span>;
}

function PreviewRow({ row, updating }: { row: ImportRow; updating: boolean }) {
  const { value } = row;
  const [label, tone]: [string, keyof typeof TONES] =
    row.status === 'new'
      ? ['Mới', 'good']
      : row.status === 'existing'
        ? [updating ? 'Cập nhật' : 'Đã có', 'warn']
        : row.status === 'repeat'
          ? ['Trùng', 'muted']
          : ['Lỗi', 'danger'];

  return (
    <li className={cn('flex min-w-0 gap-3 rounded-2xl border border-line bg-card p-3 shadow-xs md:gap-4 md:p-4', row.status === 'error' && 'border-danger/30')}>
      <span className="w-8 shrink-0 pt-1 text-right text-xs text-faint tabular-nums" title="Số dòng trong bảng tính">
        {row.rowNumber}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          {value.word && (
            <span lang="zh-Hans" className="font-zh text-xl leading-tight font-semibold break-all">
              {value.word}
            </span>
          )}
          {value.reading && (
            <span lang="zh-Latn-pinyin" className="font-pinyin text-sm text-accent-ink">
              {value.reading}
            </span>
          )}
        </div>
        {value.meaning && (
          <p className="pt-0.5 text-sm text-muted">
            <MixedText>{value.meaning}</MixedText>
          </p>
        )}
        {value.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {value.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        )}
        {row.status === 'error' && <p className="mt-1.5 text-sm text-danger">{row.error}</p>}
        {row.status === 'repeat' && <p className="mt-1.5 text-sm text-muted">Trùng với dòng {row.repeatOf}, nên chỉ nhập một lần.</p>}
        {row.status === 'existing' && updating && row.existing.meaning !== value.meaning && (
          <p className="mt-1.5 text-sm text-muted">
            Nghĩa cũ: <MixedText>{row.existing.meaning}</MixedText>
          </p>
        )}
        {row.status === 'new' && row.sameHanzi && (
          <p className="mt-1.5 text-sm text-muted">
            Bạn đã có <span lang="zh-Hans">{row.sameHanzi.word}</span> đọc là{' '}
            <span lang="zh-Latn-pinyin" className="font-pinyin">
              {row.sameHanzi.reading}
            </span>
            ; từ này đọc khác nên sẽ được thêm riêng.
          </p>
        )}
      </div>
      <span className={cn('h-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', TONES[tone])}>{label}</span>
    </li>
  );
}

// ---------------------------------------------------------------- Done

interface DoneStepProps {
  receipt: ImportReceipt;
  added: number;
  updated: number;
  tag?: string;
  onAgain: () => void;
}

function DoneStep({ receipt, added, updated, tag, onAgain }: DoneStepProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [undoing, setUndoing] = useState(false);

  const undo = async () => {
    const ok = await confirm({
      title: 'Hoàn tác lần nhập này?',
      message: `${added ? `${added} từ vừa thêm sẽ bị xóa` : ''}${added && updated ? ', và ' : ''}${updated ? `${updated} từ vừa cập nhật sẽ trở lại như trước` : ''}.`,
      confirmLabel: 'Hoàn tác',
      danger: true,
    });
    if (!ok) return;
    setUndoing(true);
    try {
      await undoImport(receipt);
      toast('Đã hoàn tác lần nhập');
      onAgain();
    } catch (err) {
      toast(err instanceof Error ? `Không hoàn tác được: ${err.message}` : 'Không hoàn tác được.');
      setUndoing(false);
    }
  };

  return (
    <section className={cn(panelClass, 'flex flex-col items-center px-6 py-12 text-center')}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-good-soft text-good [&_svg]:size-7">
        <Check />
      </div>
      <h2 className="text-lg font-semibold">
        Đã nhập {added} từ{updated ? `, cập nhật ${updated} từ` : ''}
      </h2>
      <p className="mt-1.5 max-w-sm text-muted">
        Bạn có thể ôn chúng ngay bằng thẻ ghi nhớ, và thêm hình ảnh cho từng từ trong kho từ vựng.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to={tag ? `/words?tag=${encodeURIComponent(tag)}` : '/words'} className={buttonClass('primary')}>
          Xem từ vựng
        </Link>
        <button type="button" onClick={onAgain} className={buttonClass('secondary')}>
          Nhập thêm
        </button>
        <button type="button" disabled={undoing} onClick={() => void undo()} className={buttonClass('ghost-danger')}>
          <Undo2 /> Hoàn tác lần nhập này
        </button>
      </div>
    </section>
  );
}

import { Check, SearchX, Trash2, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useConfirm, useToast } from '../components/feedback';
import { ImagePicker } from '../components/ImagePicker';
import { PinyinInput } from '../components/PinyinInput';
import { TagInput } from '../components/TagInput';
import { buttonClass, EmptyState, Field, inputClass, MixedText, PageHeader, PageLoader, panelClass } from '../components/ui';
import { useAccount } from '../db/auth';
import { useWords } from '../db/hooks';
import { loadImage } from '../db/images';
import type { Word } from '../db/types';
import { deleteWord, fetchWord, saveWord } from '../db/words';
import { cn } from '../lib/cn';
import { useDocumentTitle, useGoBack } from '../lib/hooks';
import { finalizeReading, hasDigit, hasHanzi, hasVietnameseLetters } from '../lib/pinyin';
import { countTags } from '../lib/tags';

interface FormState {
  word: string;
  reading: string;
  meaning: string;
  tags: string[];
  image: Blob | null;
  imageChanged: boolean;
}

const EMPTY_FORM: FormState = { word: '', reading: '', meaning: '', tags: [], image: null, imageChanged: false };

type RequiredField = 'word' | 'reading' | 'meaning';
type Errors = Partial<Record<RequiredField, string>>;

/** Pinyin shown as an example in the hints. */
function Example({ children }: { children: string }) {
  return (
    <span lang="zh-Latn-pinyin" className="font-pinyin whitespace-nowrap text-ink">
      {children}
    </span>
  );
}

export function WordFormPage() {
  const { id } = useParams();
  // A fresh form per word, so switching between words never carries state over.
  return <WordForm key={id ?? 'new'} id={id} />;
}

function WordForm({ id }: { id?: string }) {
  const isEdit = id !== undefined;
  useDocumentTitle(isEdit ? 'Sửa từ' : 'Thêm từ mới');
  const navigate = useNavigate();
  const goBack = useGoBack('/words');
  const toast = useToast();
  const confirm = useConfirm();
  const me = useAccount().id;
  const words = useWords();
  const tagSuggestions = useMemo(() => countTags(words ?? []).map((t) => t.tag), [words]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>(isEdit ? 'loading' : 'ready');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<unknown>();
  const wordInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const word = await fetchWord(me, id);
        const image = word?.imagePath ? await loadImage(word.imagePath).catch(() => null) : null;
        if (cancelled) return;
        if (!word) {
          setStatus('missing');
          return;
        }
        setForm({
          word: word.word,
          reading: word.reading,
          meaning: word.meaning,
          tags: word.tags,
          image,
          imageChanged: false,
        });
        setStatus('ready');
      } catch (err) {
        if (!cancelled) setLoadError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, me]);

  const setField = (field: RequiredField, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };
  const setImage = useCallback((image: Blob | null) => setForm((f) => ({ ...f, image, imageChanged: true })), []);
  const setTags = useCallback((tags: string[]) => setForm((f) => ({ ...f, tags })), []);

  const trimmedWord = form.word.trim();
  const duplicate = trimmedWord ? words?.find((w) => w.id !== id && w.word === trimmedWord) : undefined;

  const save = async (addAnother: boolean) => {
    if (saving) return;
    const word = form.word.trim();
    const meaning = form.meaning.trim();
    const reading = finalizeReading(form.reading);

    const nextErrors: Errors = {};
    if (!word) nextErrors.word = 'Hãy nhập từ bằng chữ Hán.';
    if (!reading) nextErrors.reading = 'Hãy nhập pinyin của từ.';
    else if (hasHanzi(reading)) nextErrors.reading = 'Ô này chỉ nhận pinyin, không nhận chữ Hán.';
    else if (hasDigit(reading)) {
      nextErrors.reading = 'Còn số chưa chuyển thành dấu thanh. Hãy gõ số ngay sau âm tiết, ví dụ ni3 → nǐ.';
    } else if (hasVietnameseLetters(reading)) {
      nextErrors.reading = 'Pinyin bị lẫn dấu tiếng Việt (như ẻ, đ). Hãy tắt bộ gõ tiếng Việt (Telex/VNI) rồi gõ lại.';
    }
    if (!meaning) nextErrors.meaning = 'Hãy nhập nghĩa của từ.';
    setErrors(nextErrors);
    const firstInvalid = (['word', 'reading', 'meaning'] as const).find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setSaving(true);
    try {
      await saveWord({ word, reading, meaning, tags: form.tags, image: form.imageChanged ? form.image : undefined }, id);
      toast(isEdit ? `Đã lưu ${word}` : `Đã thêm ${word}`);
      if (addAnother) {
        // Keep the tags: words added in a row usually belong together.
        setForm({ ...EMPTY_FORM, tags: form.tags });
        wordInput.current?.focus();
      } else if (isEdit) {
        goBack();
      } else {
        void navigate('/words');
      }
    } catch (err) {
      toast(err instanceof Error ? `Không lưu được: ${err.message}` : 'Không lưu được từ này.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id) return;
    const ok = await confirm({
      title: `Xóa ${trimmedWord || 'từ này'}?`,
      message: 'Từ này sẽ bị xóa khỏi kho từ vựng. Lịch sử luyện tập vẫn giữ bản ghi riêng của nó.',
      confirmLabel: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteWord(id);
    } catch (err) {
      toast(err instanceof Error ? `Không xóa được: ${err.message}` : 'Không xóa được từ này.');
      return;
    }
    toast(`Đã xóa ${trimmedWord}`);
    void navigate('/words', { replace: true });
  };

  if (loadError) throw loadError;
  if (status === 'loading') return <PageLoader />;
  if (status === 'missing') {
    return (
      <EmptyState
        icon={<SearchX />}
        title="Không tìm thấy từ này"
        action={
          <Link to="/words" className={buttonClass('secondary')}>
            Quay lại kho từ vựng
          </Link>
        }
      >
        Có thể từ này đã bị xóa.
      </EmptyState>
    );
  }

  return (
    <>
      <PageHeader
        back={{ to: '/words', label: 'Từ vựng của bạn' }}
        zh={isEdit ? '编辑生词' : '新词'}
        title={isEdit ? 'Sửa từ' : 'Thêm từ mới'}
        description={isEdit ? undefined : 'Chỉ cần điền từ, pinyin và nghĩa. Các mục còn lại không bắt buộc.'}
      />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save(false);
        }}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            // Blur first so a half-typed tag gets committed, then submit once React has re-rendered.
            (document.activeElement as HTMLElement | null)?.blur();
            const form = event.currentTarget;
            setTimeout(() => form.requestSubmit());
          }
        }}
        className="space-y-5"
      >
        <section className={cn(panelClass, 'space-y-5 p-5 md:p-7')}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Từ (chữ Hán)"
              htmlFor="word"
              error={errors.word}
              hint="Viết bằng chữ Hán, giản thể hay phồn thể đều được."
            >
              <input
                ref={wordInput}
                id="word"
                lang="zh-Hans"
                value={form.word}
                onChange={(event) => setField('word', event.target.value)}
                placeholder="你好"
                autoComplete="off"
                autoFocus={!isEdit}
                aria-invalid={!!errors.word}
                className={cn(inputClass, 'font-zh text-xl')}
              />
            </Field>
            <Field
              label="Pinyin"
              htmlFor="reading"
              badge={
                <span lang="zh-Latn-pinyin" className="rounded-full bg-sunken px-2 py-0.5 font-pinyin text-[11px] font-medium text-muted">
                  ni3 → nǐ
                </span>
              }
              error={errors.reading}
              hint={
                <>
                  Gõ số thanh điệu ngay sau mỗi âm tiết: <Example>ni3 hao3 → nǐ hǎo</Example>. Gõ v để có ü (
                  <Example>lv4 → lǜ</Example>), số 5 cho thanh nhẹ (<Example>xie4xie5 → xièxie</Example>).
                  <span className="mt-1 block">
                    <strong className="font-semibold text-ink">Hãy tắt bộ gõ tiếng Việt (Telex/VNI) khi gõ pinyin</strong>,
                    nếu không nó sẽ đổi chữ của bạn: <span className="whitespace-nowrap text-ink">er → ẻ</span>,{' '}
                    <span className="whitespace-nowrap text-ink">dd → đ</span>.
                  </span>
                </>
              }
            >
              <PinyinInput
                id="reading"
                value={form.reading}
                onValueChange={(value) => setField('reading', value)}
                placeholder="ni3 hao3"
                enterKeyHint="next"
                aria-invalid={!!errors.reading}
                className={cn(inputClass, 'font-pinyin text-xl')}
              />
            </Field>
          </div>
          <Field label="Nghĩa" htmlFor="meaning" error={errors.meaning}>
            <input
              id="meaning"
              value={form.meaning}
              onChange={(event) => setField('meaning', event.target.value)}
              placeholder="xin chào"
              autoComplete="off"
              aria-invalid={!!errors.meaning}
              className={inputClass}
            />
          </Field>
          {duplicate && <DuplicateNotice word={duplicate} />}
        </section>

        <section className={cn(panelClass, 'grid gap-6 p-5 md:grid-cols-2 md:p-7')}>
          <Field label="Hình ảnh" optional hint="Một hình ảnh giúp bạn nhớ từ này lâu hơn.">
            <ImagePicker value={form.image} onChange={setImage} />
          </Field>
          <Field
            label="Nhãn"
            htmlFor="tags"
            optional
            hint="Nhóm các từ theo chủ đề để ôn cùng nhau. Nhấn Enter hoặc gõ dấu phẩy sau mỗi nhãn."
          >
            <TagInput id="tags" value={form.tags} onChange={setTags} suggestions={tagSuggestions} />
          </Field>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className={buttonClass('primary', 'lg')}>
            <Check /> {isEdit ? 'Lưu thay đổi' : 'Lưu từ'}
          </button>
          {!isEdit && (
            <button type="button" disabled={saving} onClick={() => void save(true)} className={buttonClass('secondary', 'lg')}>
              Lưu &amp; thêm từ khác
            </button>
          )}
          <button type="button" onClick={goBack} className={buttonClass('ghost', 'lg')}>
            Hủy
          </button>
          {isEdit && (
            <button type="button" onClick={() => void remove()} className={buttonClass('danger', 'lg', 'sm:ml-auto')}>
              <Trash2 /> Xóa từ
            </button>
          )}
        </div>
        <p className="hidden text-xs text-faint md:block">Mẹo: nhấn Ctrl + Enter (⌘ + Enter trên Mac) để lưu từ bất kỳ ô nào.</p>
      </form>
    </>
  );
}

function DuplicateNotice({ word }: { word: Word }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-ink">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
      <p>
        Bạn đã có từ{' '}
        <Link to={`/words/${word.id}`} className="font-semibold underline underline-offset-2">
          <span lang="zh-Hans">{word.word}</span>
        </Link>
        {word.reading !== word.word && (
          <>
            {' '}
            (<span lang="zh-Latn-pinyin" className="font-pinyin">{word.reading}</span>)
          </>
        )}
        : <MixedText>{word.meaning}</MixedText>. Bạn vẫn có thể lưu từ này.
      </p>
    </div>
  );
}

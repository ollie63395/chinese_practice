import { Download, HardDrive, ShieldCheck, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useConfirm, useToast } from '../components/feedback';
import { buttonClass, PageHeader, PageLoader, panelClass } from '../components/ui';
import { usePractices, useWords } from '../db/hooks';
import { backupFileName, createBackup, readBackup, restoreBackup } from '../lib/backup';
import { cn } from '../lib/cn';
import { useDocumentTitle } from '../lib/hooks';
import { requestPersistentStorage } from '../lib/prefs';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const format = (n: number, digits: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: digits });
  if (bytes < 1024 * 1024) return `${format(bytes / 1024, 0)} KB`;
  return `${format(bytes / 1024 / 1024, 1)} MB`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function BackupPage() {
  useDocumentTitle('Sao lưu & khôi phục');
  const words = useWords();
  const practices = usePractices();
  const toast = useToast();
  const confirm = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [storage, setStorage] = useState<{ usage?: number; persisted?: boolean }>({});

  const refreshStorage = useCallback(async () => {
    try {
      const [estimate, persisted] = await Promise.all([navigator.storage?.estimate(), navigator.storage?.persisted()]);
      setStorage({ usage: estimate?.usage, persisted });
    } catch {
      // Storage estimates aren't available everywhere.
    }
  }, []);

  useEffect(() => {
    void refreshStorage();
  }, [refreshStorage, words, practices]);

  if (!words || !practices) return <PageLoader />;

  const exportData = async () => {
    setBusy('export');
    try {
      downloadBlob(await createBackup(), backupFileName());
      toast('Đã tải bản sao lưu');
    } catch (err) {
      toast(err instanceof Error ? `Không tạo được bản sao lưu: ${err.message}` : 'Không tạo được bản sao lưu.');
    } finally {
      setBusy(null);
    }
  };

  const importData = async (file: File) => {
    setBusy('import');
    try {
      const contents = await readBackup(file);
      const ok = await confirm({
        title: 'Khôi phục bản sao lưu này?',
        message: (
          <>
            Bản sao lưu có <strong className="text-ink">{contents.words.length} từ</strong> và{' '}
            <strong className="text-ink">{contents.practices.length} buổi luyện tập</strong>. Chúng sẽ được thêm vào
            dữ liệu hiện có; mục nào có ở cả hai nơi sẽ được thay bằng bản trong tệp sao lưu.
          </>
        ),
        confirmLabel: 'Khôi phục',
      });
      if (!ok) return;
      await restoreBackup(contents);
      toast(`Đã khôi phục ${contents.words.length} từ và ${contents.practices.length} buổi luyện tập`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không khôi phục được bản sao lưu này.');
    } finally {
      setBusy(null);
    }
  };

  const keepData = async () => {
    const granted = await requestPersistentStorage();
    await refreshStorage();
    toast(granted ? 'Trình duyệt sẽ giữ dữ liệu này' : 'Trình duyệt đã từ chối. Hãy sao lưu thường xuyên nhé.');
  };

  return (
    <>
      <PageHeader
        zh="备份"
        title="Sao lưu & khôi phục"
        description="Cíhuì lưu từ vựng, hình ảnh và lịch sử luyện tập ngay trong trình duyệt này, trên thiết bị này. Không có gì được tải lên mạng. Thỉnh thoảng hãy tải một bản sao lưu, và dùng nó để chuyển từ vựng sang thiết bị hoặc trình duyệt khác."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel icon={<Download />} title="Tải bản sao lưu">
          <p className="text-sm text-muted">
            {words.length} từ và {practices.length} buổi luyện tập, kèm cả hình ảnh, trong một tệp.
          </p>
          <button type="button" onClick={() => void exportData()} disabled={busy !== null} className={buttonClass('primary', 'md', 'mt-4')}>
            <Download /> {busy === 'export' ? 'Đang chuẩn bị…' : 'Tải bản sao lưu'}
          </button>
        </Panel>

        <Panel icon={<Upload />} title="Khôi phục từ bản sao lưu">
          <p className="text-sm text-muted">
            Chọn tệp sao lưu của Cíhuì (.json). Các từ và buổi luyện tập trong đó sẽ được thêm vào dữ liệu ở đây.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Chọn tệp sao lưu"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void importData(file);
            }}
          />
          <button type="button" onClick={() => fileInput.current?.click()} disabled={busy !== null} className={buttonClass('secondary', 'md', 'mt-4')}>
            <Upload /> {busy === 'import' ? 'Đang khôi phục…' : 'Chọn tệp sao lưu'}
          </button>
        </Panel>

        <Panel icon={storage.persisted ? <ShieldCheck /> : <HardDrive />} title="Bộ nhớ trên thiết bị này" className="md:col-span-2">
          <p className="text-sm text-muted">
            {storage.usage !== undefined && <>Cíhuì đang dùng khoảng {formatBytes(storage.usage)}. </>}
            {storage.persisted
              ? 'Trình duyệt đã đồng ý giữ dữ liệu này, kể cả khi thiết bị sắp hết dung lượng.'
              : 'Trình duyệt có thể xóa dữ liệu này khi thiết bị sắp hết dung lượng, hoặc khi bạn xóa dữ liệu duyệt web. Bản sao lưu giúp dữ liệu luôn an toàn.'}
          </p>
          {storage.persisted === false && (
            <button type="button" onClick={() => void keepData()} className={buttonClass('secondary', 'md', 'mt-4')}>
              <ShieldCheck /> Yêu cầu trình duyệt giữ dữ liệu của tôi
            </button>
          )}
        </Panel>
      </div>
    </>
  );
}

function Panel({ icon, title, className, children }: { icon: ReactNode; title: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn(panelClass, 'p-5 md:p-6', className)}>
      <div className="mb-2 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-ink [&_svg]:size-[18px]">{icon}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

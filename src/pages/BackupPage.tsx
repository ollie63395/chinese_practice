import { Download, Upload } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { useConfirm, useToast } from '../components/feedback';
import { buttonClass, PageHeader, PageLoader, panelClass } from '../components/ui';
import { usePractices, useWords } from '../db/hooks';
import { backupFileName, createBackup, readBackup, restoreBackup } from '../lib/backup';
import { cn } from '../lib/cn';
import { useDocumentTitle } from '../lib/hooks';

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
            tài khoản của bạn; mục nào có ở cả hai nơi sẽ được thay bằng bản trong tệp sao lưu.
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

  return (
    <>
      <PageHeader
        zh="备份"
        title="Sao lưu & khôi phục"
        description="Từ vựng, hình ảnh và lịch sử luyện tập được lưu trong tài khoản của bạn, nên bạn dùng được trên mọi thiết bị. Bạn cũng có thể tải tất cả về thành một tệp, hoặc đưa một tệp sao lưu vào tài khoản: chẳng hạn dữ liệu từ phiên bản Cíhuì cũ chỉ lưu trong trình duyệt, hoặc danh sách từ giáo viên gửi cho bạn."
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
            Chọn tệp sao lưu của Cíhuì (.json). Các từ và buổi luyện tập trong đó sẽ được thêm vào tài khoản của bạn.
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
      </div>
    </>
  );
}

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className={cn(panelClass, 'p-5 md:p-6')}>
      <div className="mb-2 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-ink [&_svg]:size-[18px]">{icon}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

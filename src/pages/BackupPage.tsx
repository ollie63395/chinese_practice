import { Download, FileSpreadsheet, FileText, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useConfirm, useToast } from '../components/feedback';
import { buttonClass, IconPanel, PageHeader, PageLoader } from '../components/ui';
import { usePractices, useWords } from '../db/hooks';
import { backupFileName, createBackup, readBackup, restoreBackup } from '../lib/backup';
import { toCsv } from '../lib/csv';
import { datedFileName, downloadBlob } from '../lib/download';
import { useDocumentTitle } from '../lib/hooks';
import { wordsToRows } from '../lib/wordSheet';

export const BACKUP_TITLE = 'Nhập, xuất & sao lưu';

export function BackupPage() {
  useDocumentTitle(BACKUP_TITLE);
  const words = useWords();
  const practices = usePractices();
  const toast = useToast();
  const confirm = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'export' | 'import' | 'sheet' | null>(null);

  if (!words || !practices) return <PageLoader />;

  const exportSheet = async (kind: 'xlsx' | 'csv') => {
    setBusy('sheet');
    try {
      const blob =
        kind === 'csv'
          ? new Blob([toCsv(wordsToRows(words))], { type: 'text/csv;charset=utf-8' })
          : await (await import('../lib/wordXlsx')).wordsXlsx(words);
      downloadBlob(blob, datedFileName('tu-vung', kind));
      toast(`Đã xuất ${words.length} từ`);
    } catch {
      toast('Không xuất được danh sách từ. Hãy kiểm tra mạng rồi thử lại.');
    } finally {
      setBusy(null);
    }
  };

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
        zh="导入导出"
        title={BACKUP_TITLE}
        description="Từ vựng, hình ảnh và lịch sử luyện tập được lưu trong tài khoản của bạn, nên bạn dùng được trên mọi thiết bị. Ở đây bạn có thể đưa từ vào và lấy từ ra bằng bảng tính, hoặc tải mọi thứ về thành một bản sao lưu."
      />

      <h2 className="mb-1 text-lg font-semibold">Bảng tính</h2>
      <p className="mb-4 max-w-prose text-sm text-muted">
        Chỉ gồm từ vựng (chữ Hán, pinyin, nghĩa, nhãn), mở được bằng Excel hoặc Google Sheets để xem, sửa, in hay gửi cho người khác.
      </p>
      <div className="mb-10 grid gap-4 md:grid-cols-2">
        <IconPanel icon={<FileSpreadsheet />} title="Xuất danh sách từ">
          <p className="text-sm text-muted">{words.length} từ trong kho của bạn. Tệp này nhập lại được vào bất kỳ tài khoản nào.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void exportSheet('xlsx')}
              disabled={busy !== null || words.length === 0}
              className={buttonClass('secondary')}
            >
              <FileSpreadsheet /> Xuất ra Excel
            </button>
            <button
              type="button"
              onClick={() => void exportSheet('csv')}
              disabled={busy !== null || words.length === 0}
              className={buttonClass('ghost')}
            >
              <FileText /> Xuất ra CSV
            </button>
          </div>
        </IconPanel>

        <IconPanel icon={<Upload />} title="Nhập từ hàng loạt">
          <p className="text-sm text-muted">
            Thêm nhiều từ một lúc từ tệp Excel, CSV, các dòng chép từ bảng tính hoặc câu trả lời của AI. Có bảng mẫu để điền.
          </p>
          <Link to="/words/import" className={buttonClass('secondary', 'md', 'mt-4')}>
            <Upload /> Nhập từ hàng loạt
          </Link>
        </IconPanel>
      </div>

      <h2 className="mb-1 text-lg font-semibold">Bản sao lưu đầy đủ</h2>
      <p className="mb-4 max-w-prose text-sm text-muted">
        Mọi thứ, kể cả hình ảnh và lịch sử luyện tập, trong một tệp để cất giữ hoặc chuyển sang tài khoản khác: chẳng hạn dữ liệu từ
        phiên bản Qinglan Chinese Class cũ chỉ lưu trong trình duyệt.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <IconPanel icon={<Download />} title="Tải bản sao lưu">
          <p className="text-sm text-muted">
            {words.length} từ và {practices.length} buổi luyện tập, kèm cả hình ảnh, trong một tệp.
          </p>
          <button type="button" onClick={() => void exportData()} disabled={busy !== null} className={buttonClass('primary', 'md', 'mt-4')}>
            <Download /> {busy === 'export' ? 'Đang chuẩn bị…' : 'Tải bản sao lưu'}
          </button>
        </IconPanel>

        <IconPanel icon={<Upload />} title="Khôi phục từ bản sao lưu">
          <p className="text-sm text-muted">
            Chọn tệp sao lưu của Qinglan Chinese Class (.json). Các từ và buổi luyện tập trong đó sẽ được thêm vào tài khoản của bạn.
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
        </IconPanel>
      </div>
    </>
  );
}

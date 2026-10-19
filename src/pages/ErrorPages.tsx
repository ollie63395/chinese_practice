import { CircleAlert, Compass } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { buttonClass, EmptyState } from '../components/ui';
import { useDocumentTitle } from '../lib/hooks';

export function NotFoundPage() {
  useDocumentTitle('Không tìm thấy trang');
  return (
    <EmptyState
      icon={<Compass />}
      title="Trang này không tồn tại"
      action={
        <Link to="/" className={buttonClass('primary')}>
          Về trang chủ
        </Link>
      }
    >
      Có thể liên kết đã cũ.
    </EmptyState>
  );
}

/** Shown when a page throws, e.g. when the server can't be reached. */
export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={<CircleAlert />}
        title="Đã có lỗi xảy ra"
        action={
          <a href="./" className={buttonClass('primary')}>
            Tải lại Qinglan Chinese Class
          </a>
        }
      >
        <p>{message}</p>
        <p className="mt-2 text-sm">
          Hãy kiểm tra kết nối mạng rồi tải lại trang. Từ vựng và lịch sử luyện tập của bạn vẫn được lưu an toàn trong
          tài khoản.
        </p>
      </EmptyState>
    </div>
  );
}

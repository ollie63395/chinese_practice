import { isRecord } from './prefs';

const BY_CODE: Record<string, string> = {
  // Supabase Auth
  invalid_credentials: 'Sai email/tên đăng nhập hoặc mật khẩu.',
  user_already_exists: 'Email hoặc tên đăng nhập này đã có người dùng.',
  email_exists: 'Email hoặc tên đăng nhập này đã có người dùng.',
  weak_password: 'Mật khẩu quá yếu. Hãy dùng ít nhất 6 ký tự.',
  same_password: 'Mật khẩu mới phải khác mật khẩu cũ.',
  email_address_invalid: 'Địa chỉ email không hợp lệ.',
  validation_failed: 'Địa chỉ email không hợp lệ.',
  signup_disabled: 'Hiện chưa thể tạo tài khoản mới.',
  email_not_confirmed: 'Email này chưa được xác nhận.',
  over_request_rate_limit: 'Bạn đã thử quá nhiều lần. Hãy đợi một lát rồi thử lại.',
  over_email_send_rate_limit: 'Đã gửi quá nhiều email. Hãy đợi một lát rồi thử lại.',
  session_not_found: 'Phiên đăng nhập đã hết. Hãy đăng nhập lại.',
  refresh_token_not_found: 'Phiên đăng nhập đã hết. Hãy đăng nhập lại.',
  // Postgres
  '42501': 'Bạn không có quyền làm việc này.',
  '23505': 'Mục này đã có rồi.',
  '23514': 'Dữ liệu không hợp lệ hoặc quá dài.',
  '22001': 'Dữ liệu quá dài.',
  '23502': 'Còn thiếu dữ liệu bắt buộc.',
  // PostgREST: .single() found no row.
  PGRST116: 'Không tìm thấy dữ liệu này. Có thể nó đã bị xóa.',
};

const OFFLINE = 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.';

/** A message in Vietnamese for an error from Supabase or the network. */
export function errorMessage(error: unknown): string {
  if (!isRecord(error) && !(error instanceof Error)) return 'Đã có lỗi xảy ra. Hãy thử lại.';
  const { code, name, message, status } = error as Record<string, unknown>;
  if (typeof code === 'string' && BY_CODE[code]) return BY_CODE[code];
  if (
    name === 'AuthRetryableFetchError' ||
    status === 0 ||
    (typeof message === 'string' && /failed to fetch|networkerror|load failed|fetch failed/i.test(message))
  ) {
    return OFFLINE;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return OFFLINE;
  return 'Máy chủ gặp lỗi. Hãy thử lại sau.';
}

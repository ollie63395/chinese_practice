import { describe, expect, it } from 'vitest';
import { errorMessage } from './errors';

describe('errorMessage', () => {
  it('explains sign-in errors in Vietnamese', () => {
    expect(errorMessage({ name: 'AuthApiError', code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      'Sai email/tên đăng nhập hoặc mật khẩu.',
    );
    expect(errorMessage({ code: 'user_already_exists' })).toMatch(/đã có người dùng/);
  });

  it('explains database errors without showing the English message', () => {
    expect(errorMessage({ code: '42501', message: 'new row violates row-level security policy' })).toBe(
      'Bạn không có quyền làm việc này.',
    );
    expect(errorMessage({ code: 'XX000', message: 'internal error' })).toBe('Máy chủ gặp lỗi. Hãy thử lại sau.');
  });

  it('recognises a lost connection', () => {
    const offline = 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.';
    expect(errorMessage(new TypeError('Failed to fetch'))).toBe(offline);
    expect(errorMessage({ message: 'TypeError: NetworkError when attempting to fetch resource.', code: '' })).toBe(offline);
    expect(errorMessage({ name: 'AuthRetryableFetchError', message: '', status: 0 })).toBe(offline);
  });

  it('copes with anything at all', () => {
    expect(errorMessage(undefined)).toBe('Đã có lỗi xảy ra. Hãy thử lại.');
  });
});

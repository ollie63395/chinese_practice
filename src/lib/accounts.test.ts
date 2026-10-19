import { describe, expect, it } from 'vitest';
import { isValidUsername, loginLabel, loginToEmail, normalizeUsername, USERNAME_DOMAIN } from './accounts';

describe('loginToEmail', () => {
  it('uses an email address as it is, in lowercase', () => {
    expect(loginToEmail('  An.Nguyen@Example.com ')).toBe('an.nguyen@example.com');
  });

  it('turns a username into its made-up address', () => {
    expect(loginToEmail('Binh_01')).toBe(`binh_01@${USERNAME_DOMAIN}`);
  });
});

describe('usernames', () => {
  it.each([
    ['binh', true],
    ['nguyen.an', true],
    ['an-01_b', true],
    ['ab', false],
    ['có dấu', false],
    ['bình', false],
    ['a'.repeat(31), false],
  ])('%s → %s', (username, valid) => {
    expect(isValidUsername(username)).toBe(valid);
  });

  it('are compared in lowercase', () => {
    expect(normalizeUsername('  Binh ')).toBe('binh');
  });
});

describe('loginLabel', () => {
  it('shows the username, or else the email address', () => {
    expect(loginLabel({ username: 'binh', email: null })).toBe('binh');
    expect(loginLabel({ username: null, email: 'an@example.com' })).toBe('an@example.com');
  });
});

import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  isValidFullName,
  isValidOtp,
  isValidPassword,
  isValidUsername,
} from '../../../utils/authValidation';

describe('shared authentication validation', () => {
  it('uses the backend username and full-name boundaries', () => {
    expect(isValidUsername('Reader.One_2')).toBe(true);
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('reader name')).toBe(false);
    expect(isValidFullName("Nguyễn-Anh O'Neil")).toBe(true);
    expect(isValidFullName('Reader 2')).toBe(false);
  });

  it('uses the same password, email and OTP policy as Flutter', () => {
    expect(isValidPassword('1234567')).toBe(false);
    expect(isValidPassword('12345678')).toBe(true);
    expect(isValidPassword('a'.repeat(128))).toBe(true);
    expect(isValidPassword('a'.repeat(129))).toBe(false);
    expect(isValidEmail(' reader@example.com ')).toBe(true);
    expect(isValidEmail('reader@example')).toBe(false);
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('12345a')).toBe(false);
  });
});

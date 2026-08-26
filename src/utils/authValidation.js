export const AUTH_LIMITS = Object.freeze({
  usernameMin: 3,
  usernameMax: 20,
  fullNameMin: 2,
  fullNameMax: 50,
  passwordMin: 8,
  passwordMax: 128,
  otpLength: 6,
});

export const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());

export const isValidUsername = (value) =>
  /^[A-Za-z0-9._]{3,20}$/.test((value || '').trim());

export const isValidFullName = (value) => {
  const normalized = (value || '').trim().replace(/\s+/g, ' ');
  return normalized.length >= AUTH_LIMITS.fullNameMin
    && normalized.length <= AUTH_LIMITS.fullNameMax
    && /^[\p{L}\s'-]+$/u.test(normalized);
};

export const isValidPassword = (value) => {
  const length = (value || '').length;
  return length >= AUTH_LIMITS.passwordMin && length <= AUTH_LIMITS.passwordMax;
};

export const isValidOtp = (value) => /^\d{6}$/.test((value || '').trim());

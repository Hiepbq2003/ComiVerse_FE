import { describe, it, expect } from 'vitest';

// Function extracted directly from Forum.jsx logic
const sanitizeHtml = (html) => {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('script, style, iframe, object, embed').forEach(el => el.remove());
  div.querySelectorAll('*').forEach(el => {
    const attrs = [...el.attributes];
    attrs.forEach(attr => {
      if (attr.name.startsWith('on') || attr.name === 'style') {
        el.removeAttribute(attr.name);
      }
    });
  });
  return div.innerHTML;
};

describe('XSS Input Sanitization Security Tests (sanitizeHtml)', () => {
  it('should strip out malicious <script> tags and inner code', () => {
    const maliciousInput = '<p>Hello</p><script>alert("XSS Attack!");</script>';
    const sanitized = sanitizeHtml(maliciousInput);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert("XSS Attack!")');
    expect(sanitized).toBe('<p>Hello</p>');
  });

  it('should remove inline event handlers such as onerror, onload, onclick', () => {
    const maliciousInput = '<img src="invalid.jpg" onerror="alert(document.cookie)" onclick="stealData()" />';
    const sanitized = sanitizeHtml(maliciousInput);
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('alert(document.cookie)');
  });

  it('should remove dangerous <iframe>, <object>, and <embed> tags', () => {
    const maliciousInput = '<div>Safe Content</div><iframe src="http://phishing.site"></iframe><object data="evil.swf"></object>';
    const sanitized = sanitizeHtml(maliciousInput);
    expect(sanitized).not.toContain('<iframe');
    expect(sanitized).not.toContain('<object');
    expect(sanitized).toBe('<div>Safe Content</div>');
  });

  it('should preserve safe HTML formatting tags such as <b>, <i>, <a>, <u>', () => {
    const safeInput = '<b>Bold text</b> <i>Italic text</i> <u>Underlined</u>';
    const sanitized = sanitizeHtml(safeInput);
    expect(sanitized).toBe('<b>Bold text</b> <i>Italic text</i> <u>Underlined</u>');
  });
});

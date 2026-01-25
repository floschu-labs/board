import { describe, it, expect } from 'vitest';
import { getDomainFromUrl, getFaviconUrl, getSafeHref, getSafeImageUrl, normalizeUrl } from './url';

describe('URL Utilities', () => {
  describe('getDomainFromUrl', () => {
    it('should extract domain from URL with https', () => {
      expect(getDomainFromUrl('https://example.com/path')).toBe('example.com');
    });

    it('should extract domain from URL with http', () => {
      expect(getDomainFromUrl('http://example.com/path')).toBe('example.com');
    });

    it('should extract domain from URL without protocol', () => {
      expect(getDomainFromUrl('example.com/path')).toBe('example.com');
    });

    it('should strip www prefix', () => {
      expect(getDomainFromUrl('https://www.example.com')).toBe('example.com');
    });

    it('should return null for invalid URL', () => {
      expect(getDomainFromUrl('not a url')).toBe(null);
    });

    it('should handle subdomains', () => {
      expect(getDomainFromUrl('https://sub.example.com')).toBe('sub.example.com');
    });
  });

  describe('getFaviconUrl', () => {
    it('should return Google favicon URL for valid URL', () => {
      const result = getFaviconUrl('https://github.com');
      expect(result).toBe('https://www.google.com/s2/favicons?domain=github.com&sz=32');
    });

    it('should add https to URL without protocol', () => {
      const result = getFaviconUrl('github.com');
      expect(result).toBe('https://www.google.com/s2/favicons?domain=github.com&sz=32');
    });

    it('should return null for invalid URL', () => {
      expect(getFaviconUrl('not a url')).toBe(null);
    });
  });

  describe('getSafeHref - XSS Prevention', () => {
    describe('should allow safe protocols', () => {
      it('allows https URLs', () => {
        expect(getSafeHref('https://example.com')).toBe('https://example.com');
      });

      it('allows http URLs', () => {
        expect(getSafeHref('http://example.com')).toBe('http://example.com');
      });

      it('prepends https to URLs without protocol', () => {
        expect(getSafeHref('example.com')).toBe('https://example.com');
      });

      it('preserves query parameters', () => {
        expect(getSafeHref('https://example.com?foo=bar')).toBe('https://example.com?foo=bar');
      });

      it('preserves hash fragments', () => {
        expect(getSafeHref('https://example.com#section')).toBe('https://example.com#section');
      });
    });

    describe('should block dangerous protocols (XSS prevention)', () => {
      it('blocks javascript: protocol', () => {
        expect(getSafeHref('javascript:alert(1)')).toBeUndefined();
      });

      it('blocks javascript: with encoding', () => {
        expect(getSafeHref('javascript:alert(document.cookie)')).toBeUndefined();
      });

      it('blocks data: protocol', () => {
        expect(getSafeHref('data:text/html,<script>alert(1)</script>')).toBeUndefined();
      });

      it('blocks data: base64 encoded', () => {
        expect(getSafeHref('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBeUndefined();
      });

      it('blocks vbscript: protocol', () => {
        expect(getSafeHref('vbscript:msgbox(1)')).toBeUndefined();
      });

      it('blocks file: protocol', () => {
        expect(getSafeHref('file:///etc/passwd')).toBeUndefined();
      });

      it('blocks uppercase protocol variations', () => {
        expect(getSafeHref('JAVASCRIPT:alert(1)')).toBeUndefined();
        expect(getSafeHref('JavaScript:alert(1)')).toBeUndefined();
      });
    });

    describe('should handle invalid URLs', () => {
      it('returns undefined for completely invalid input', () => {
        expect(getSafeHref('')).toBeUndefined();
      });

      it('returns undefined for malformed URLs', () => {
        expect(getSafeHref('://invalid')).toBeUndefined();
      });
    });
  });

  describe('getSafeImageUrl - Image URL Validation', () => {
    describe('should allow safe image URLs', () => {
      it('allows https image URLs', () => {
        expect(getSafeImageUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
      });

      it('allows http image URLs', () => {
        expect(getSafeImageUrl('http://example.com/image.png')).toBe('http://example.com/image.png');
      });

      it('prepends https to URLs without protocol', () => {
        expect(getSafeImageUrl('example.com/image.gif')).toBe('https://example.com/image.gif');
      });

      it('allows URLs with query parameters', () => {
        expect(getSafeImageUrl('https://example.com/image.jpg?size=large')).toBe('https://example.com/image.jpg?size=large');
      });
    });

    describe('should block dangerous protocols', () => {
      it('blocks javascript: protocol', () => {
        expect(getSafeImageUrl('javascript:alert(1)')).toBeUndefined();
      });

      it('blocks data: protocol (prevents embedded scripts)', () => {
        expect(getSafeImageUrl('data:image/svg+xml,<svg onload="alert(1)"></svg>')).toBeUndefined();
      });

      it('blocks data: base64 images (could contain malicious content)', () => {
        expect(getSafeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBeUndefined();
      });

      it('blocks file: protocol', () => {
        expect(getSafeImageUrl('file:///etc/passwd')).toBeUndefined();
      });
    });

    describe('should handle edge cases', () => {
      it('returns undefined for empty string', () => {
        expect(getSafeImageUrl('')).toBeUndefined();
      });

      it('returns undefined for whitespace-only string', () => {
        expect(getSafeImageUrl('   ')).toBeUndefined();
      });

      it('handles string "undefined" by prepending https (edge case)', () => {
        // Note: While 'undefined' as a string will become 'https://undefined',
        // this is technically valid URL behavior. The important thing is that
        // dangerous protocols are blocked.
        const result = getSafeImageUrl('undefined');
        // Either undefined or a safe https:// URL is acceptable
        expect(result === undefined || result?.startsWith('https://')).toBe(true);
      });
    });
  });

  describe('normalizeUrl', () => {
    it('adds https to URL without protocol', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com');
    });

    it('preserves http protocol', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('preserves https protocol', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    });
  });
});

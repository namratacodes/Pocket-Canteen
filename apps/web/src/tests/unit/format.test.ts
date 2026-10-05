import { describe, it, expect } from 'vitest';
import { formatINR, formatMMSS, formatTime, timeAgo } from '@/lib/format';

describe('Format Helpers', () => {
  describe('formatINR', () => {
    it('formats numbers to Indian Rupee currency with commas and 2 decimals', () => {
      const formatted = formatINR(1234.5);
      // Remove non-breaking spaces for universal comparison
      const normalized = formatted.replace(/\u00a0/g, ' ');
      expect(normalized).toContain('1,234.50');
      expect(normalized).toContain('₹');
    });

    it('formats 0 correctly', () => {
      const formatted = formatINR(0).replace(/\u00a0/g, ' ');
      expect(formatted).toContain('0.00');
    });

    it('formats large numbers with Indian grouping', () => {
      const formatted = formatINR(1234567.89).replace(/\u00a0/g, ' ');
      expect(formatted).toContain('12,34,567.89');
    });
  });

  describe('formatMMSS', () => {
    it('clamps negative numbers to 0:00', () => {
      expect(formatMMSS(-5)).toBe('0:00');
    });

    it('formats 0 seconds', () => {
      expect(formatMMSS(0)).toBe('0:00');
    });

    it('formats seconds with leading zero under 10 seconds', () => {
      expect(formatMMSS(65)).toBe('1:05');
      expect(formatMMSS(9)).toBe('0:09');
    });

    it('formats minutes and seconds accurately', () => {
      expect(formatMMSS(125)).toBe('2:05');
      expect(formatMMSS(600)).toBe('10:00');
    });
  });

  describe('formatTime', () => {
    it('formats valid ISO dates into 12-hour AM/PM format', () => {
      const iso = '2026-10-05T13:30:00Z';
      const timeStr = formatTime(iso);
      expect(timeStr).toMatch(/\d{1,2}:\d{2}\s+(AM|PM)/i);
    });

    it('returns fallback for invalid date strings', () => {
      expect(formatTime('invalid-date')).toBe('--:--');
    });
  });

  describe('timeAgo', () => {
    it('returns human readable relative time', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      expect(timeAgo(fiveMinutesAgo)).toContain('5 minutes ago');
    });
  });
});

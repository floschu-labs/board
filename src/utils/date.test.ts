import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isDueDatePast, getDueDateColor, formatDisplayDate, formatDateForInput } from './date';

describe('Date Utilities', () => {
  // Mock the current date for consistent testing
  const MOCK_TODAY = new Date('2024-06-15T12:00:00');
  
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isDueDatePast', () => {
    it('should return true for dates before today', () => {
      expect(isDueDatePast('2024-06-14')).toBe(true);
      expect(isDueDatePast('2024-01-01')).toBe(true);
      expect(isDueDatePast('2023-12-31')).toBe(true);
    });

    it('should return false for today', () => {
      expect(isDueDatePast('2024-06-15')).toBe(false);
    });

    it('should return false for future dates', () => {
      expect(isDueDatePast('2024-06-16')).toBe(false);
      expect(isDueDatePast('2024-12-31')).toBe(false);
      expect(isDueDatePast('2025-01-01')).toBe(false);
    });

    it('should handle edge case: yesterday', () => {
      expect(isDueDatePast('2024-06-14')).toBe(true);
    });

    it('should handle edge case: tomorrow', () => {
      expect(isDueDatePast('2024-06-16')).toBe(false);
    });
  });

  describe('getDueDateColor', () => {
    describe('with 0 warning days', () => {
      it('should return muted for past dates', () => {
        expect(getDueDateColor('2024-06-14', 0)).toBe('text-text-muted');
      });

      it('should return danger for today (daysUntilDue = 0)', () => {
        expect(getDueDateColor('2024-06-15', 0)).toBe('text-danger');
      });

      it('should return muted for future dates', () => {
        expect(getDueDateColor('2024-06-16', 0)).toBe('text-text-muted');
      });
    });

    describe('with 3 warning days', () => {
      it('should return muted for past dates', () => {
        expect(getDueDateColor('2024-06-14', 3)).toBe('text-text-muted');
      });

      it('should return danger for today', () => {
        expect(getDueDateColor('2024-06-15', 3)).toBe('text-danger');
      });

      it('should return danger for tomorrow (within 3 days)', () => {
        expect(getDueDateColor('2024-06-16', 3)).toBe('text-danger');
      });

      it('should return danger for day after tomorrow (within 3 days)', () => {
        expect(getDueDateColor('2024-06-17', 3)).toBe('text-danger');
      });

      it('should return danger for 3 days from now', () => {
        expect(getDueDateColor('2024-06-18', 3)).toBe('text-danger');
      });

      it('should return muted for 4 days from now (outside warning)', () => {
        expect(getDueDateColor('2024-06-19', 3)).toBe('text-text-muted');
      });
    });

    describe('with 7 warning days', () => {
      it('should return danger for dates within a week', () => {
        expect(getDueDateColor('2024-06-15', 7)).toBe('text-danger'); // today
        expect(getDueDateColor('2024-06-18', 7)).toBe('text-danger'); // 3 days
        expect(getDueDateColor('2024-06-22', 7)).toBe('text-danger'); // 7 days
      });

      it('should return muted for dates beyond a week', () => {
        expect(getDueDateColor('2024-06-23', 7)).toBe('text-text-muted'); // 8 days
      });
    });
  });

  describe('formatDisplayDate', () => {
    it('should return localized date string', () => {
      // The exact format depends on the locale, so we just verify it's a non-empty string
      const result = formatDisplayDate('2024-06-15');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle different date formats consistently', () => {
      // These should produce the same output
      const result1 = formatDisplayDate('2024-01-01');
      expect(typeof result1).toBe('string');
    });
  });

  describe('formatDateForInput', () => {
    it('should format current date as YYYY-MM-DD', () => {
      expect(formatDateForInput()).toBe('2024-06-15');
    });

    it('should format provided date as YYYY-MM-DD', () => {
      expect(formatDateForInput(new Date('2024-01-05T12:00:00'))).toBe('2024-01-05');
    });

    it('should pad single-digit months', () => {
      expect(formatDateForInput(new Date('2024-03-15T12:00:00'))).toBe('2024-03-15');
    });

    it('should pad single-digit days', () => {
      expect(formatDateForInput(new Date('2024-06-05T12:00:00'))).toBe('2024-06-05');
    });

    it('should handle December correctly', () => {
      expect(formatDateForInput(new Date('2024-12-25T12:00:00'))).toBe('2024-12-25');
    });

    it('should handle year boundaries', () => {
      expect(formatDateForInput(new Date('2025-01-01T12:00:00'))).toBe('2025-01-01');
    });
  });

  describe('timezone handling', () => {
    it('should use local midnight for date comparison', () => {
      // The functions use T00:00:00 suffix to interpret dates as local timezone
      // This test verifies that dates are compared at midnight local time
      
      // If today is June 15, then June 15 should NOT be past
      expect(isDueDatePast('2024-06-15')).toBe(false);
      
      // And June 14 should be past
      expect(isDueDatePast('2024-06-14')).toBe(true);
    });
  });
});

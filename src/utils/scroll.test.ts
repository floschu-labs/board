import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  scrollIntoViewHorizontal,
  scrollIntoViewVertical,
  scrollIntoViewBoth,
} from './scroll';

describe('scroll utilities', () => {
  let element: HTMLDivElement;
  let horizontalContainer: HTMLDivElement;
  let verticalContainer: HTMLDivElement;

  beforeEach(() => {
    // Create test elements
    element = document.createElement('div');
    horizontalContainer = document.createElement('div');
    verticalContainer = document.createElement('div');

    // Setup container classes
    horizontalContainer.className = 'overflow-x-auto';
    verticalContainer.className = 'overflow-y-auto';

    // Mock scrollBy
    horizontalContainer.scrollBy = vi.fn();
    verticalContainer.scrollBy = vi.fn();

    // Mock scrollIntoView
    element.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to mock getBoundingClientRect
  const mockRect = (el: HTMLElement, rect: Partial<DOMRect>) => {
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    });
  };

  describe('scrollIntoViewHorizontal', () => {
    it('returns false when no horizontal scroll container exists', () => {
      const result = scrollIntoViewHorizontal(element);
      expect(result).toBe(false);
    });

    it('returns true when horizontal scroll container exists', () => {
      horizontalContainer.appendChild(element);
      document.body.appendChild(horizontalContainer);

      mockRect(element, { left: 100, right: 200 });
      mockRect(horizontalContainer, { left: 0, right: 500 });

      const result = scrollIntoViewHorizontal(element);
      expect(result).toBe(true);

      document.body.removeChild(horizontalContainer);
    });

    it('scrolls right when element is past right edge', () => {
      horizontalContainer.appendChild(element);
      document.body.appendChild(horizontalContainer);

      mockRect(element, { left: 400, right: 500 });
      mockRect(horizontalContainer, { left: 0, right: 450 }); // Element right (500) > container right - padding (450 - 40 = 410)

      scrollIntoViewHorizontal(element);

      expect(horizontalContainer.scrollBy).toHaveBeenCalledWith({
        left: 90, // 500 - 450 + 40 = 90
        behavior: 'smooth',
      });

      document.body.removeChild(horizontalContainer);
    });

    it('scrolls left when element is past left edge', () => {
      horizontalContainer.appendChild(element);
      document.body.appendChild(horizontalContainer);

      mockRect(element, { left: 20, right: 120 });
      mockRect(horizontalContainer, { left: 50, right: 500 }); // Element left (20) < container left + padding (50 + 40 = 90)

      scrollIntoViewHorizontal(element);

      expect(horizontalContainer.scrollBy).toHaveBeenCalledWith({
        left: -70, // 20 - 50 - 40 = -70
        behavior: 'smooth',
      });

      document.body.removeChild(horizontalContainer);
    });

    it('does not scroll when element is fully visible', () => {
      horizontalContainer.appendChild(element);
      document.body.appendChild(horizontalContainer);

      mockRect(element, { left: 100, right: 200 });
      mockRect(horizontalContainer, { left: 0, right: 500 }); // Element well within bounds

      scrollIntoViewHorizontal(element);

      expect(horizontalContainer.scrollBy).not.toHaveBeenCalled();

      document.body.removeChild(horizontalContainer);
    });

    it('respects custom padding option', () => {
      horizontalContainer.appendChild(element);
      document.body.appendChild(horizontalContainer);

      mockRect(element, { left: 400, right: 480 });
      mockRect(horizontalContainer, { left: 0, right: 500 });

      scrollIntoViewHorizontal(element, { padding: 30 });

      expect(horizontalContainer.scrollBy).toHaveBeenCalledWith({
        left: 10, // 480 - 500 + 30 = 10
        behavior: 'smooth',
      });

      document.body.removeChild(horizontalContainer);
    });

    it('respects custom behavior option', () => {
      horizontalContainer.appendChild(element);
      document.body.appendChild(horizontalContainer);

      mockRect(element, { left: 400, right: 500 });
      mockRect(horizontalContainer, { left: 0, right: 450 });

      scrollIntoViewHorizontal(element, { behavior: 'instant' });

      expect(horizontalContainer.scrollBy).toHaveBeenCalledWith({
        left: 90,
        behavior: 'instant',
      });

      document.body.removeChild(horizontalContainer);
    });
  });

  describe('scrollIntoViewVertical', () => {
    it('returns false when no vertical scroll container exists', () => {
      const result = scrollIntoViewVertical(element);
      expect(result).toBe(false);
    });

    it('returns true when vertical scroll container exists', () => {
      verticalContainer.appendChild(element);
      document.body.appendChild(verticalContainer);

      mockRect(element, { top: 100, bottom: 200 });
      mockRect(verticalContainer, { top: 0, bottom: 500 });

      const result = scrollIntoViewVertical(element);
      expect(result).toBe(true);

      document.body.removeChild(verticalContainer);
    });

    it('scrolls down when element is below visible area', () => {
      verticalContainer.appendChild(element);
      document.body.appendChild(verticalContainer);

      mockRect(element, { top: 400, bottom: 500 });
      mockRect(verticalContainer, { top: 0, bottom: 450 }); // Element bottom (500) > container bottom - bottomPadding (450 - 40 = 410)

      scrollIntoViewVertical(element);

      expect(verticalContainer.scrollBy).toHaveBeenCalledWith({
        top: 90, // 500 - 450 + 40 = 90
        behavior: 'smooth',
      });

      document.body.removeChild(verticalContainer);
    });

    it('scrolls up when element is above visible area', () => {
      verticalContainer.appendChild(element);
      document.body.appendChild(verticalContainer);

      mockRect(element, { top: 20, bottom: 120 });
      mockRect(verticalContainer, { top: 50, bottom: 500 }); // Element top (20) < container top (50)

      scrollIntoViewVertical(element);

      expect(verticalContainer.scrollBy).toHaveBeenCalledWith({
        top: -42, // 20 - 50 - 12 = -42 (12 is default topMargin)
        behavior: 'smooth',
      });

      document.body.removeChild(verticalContainer);
    });

    it('does not scroll when element is fully visible', () => {
      verticalContainer.appendChild(element);
      document.body.appendChild(verticalContainer);

      mockRect(element, { top: 100, bottom: 200 });
      mockRect(verticalContainer, { top: 0, bottom: 500 }); // Element well within bounds

      scrollIntoViewVertical(element);

      expect(verticalContainer.scrollBy).not.toHaveBeenCalled();

      document.body.removeChild(verticalContainer);
    });

    it('respects custom bottomPadding option', () => {
      verticalContainer.appendChild(element);
      document.body.appendChild(verticalContainer);

      mockRect(element, { top: 400, bottom: 480 });
      mockRect(verticalContainer, { top: 0, bottom: 500 });

      scrollIntoViewVertical(element, { bottomPadding: 30 });

      expect(verticalContainer.scrollBy).toHaveBeenCalledWith({
        top: 10, // 480 - 500 + 30 = 10
        behavior: 'smooth',
      });

      document.body.removeChild(verticalContainer);
    });

    it('respects custom topMargin option', () => {
      verticalContainer.appendChild(element);
      document.body.appendChild(verticalContainer);

      mockRect(element, { top: 20, bottom: 120 });
      mockRect(verticalContainer, { top: 50, bottom: 500 });

      scrollIntoViewVertical(element, { topMargin: 20 });

      expect(verticalContainer.scrollBy).toHaveBeenCalledWith({
        top: -50, // 20 - 50 - 20 = -50
        behavior: 'smooth',
      });

      document.body.removeChild(verticalContainer);
    });
  });

  describe('scrollIntoViewBoth', () => {
    it('calls native scrollIntoView when no containers found', () => {
      scrollIntoViewBoth(element);

      expect(element.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    });

    it('does not call native scrollIntoView when horizontal container found', () => {
      horizontalContainer.appendChild(element);
      document.body.appendChild(horizontalContainer);

      mockRect(element, { left: 100, right: 200 });
      mockRect(horizontalContainer, { left: 0, right: 500 });

      scrollIntoViewBoth(element);

      expect(element.scrollIntoView).not.toHaveBeenCalled();

      document.body.removeChild(horizontalContainer);
    });

    it('does not call native scrollIntoView when vertical container found', () => {
      verticalContainer.appendChild(element);
      document.body.appendChild(verticalContainer);

      mockRect(element, { top: 100, bottom: 200 });
      mockRect(verticalContainer, { top: 0, bottom: 500 });

      scrollIntoViewBoth(element);

      expect(element.scrollIntoView).not.toHaveBeenCalled();

      document.body.removeChild(verticalContainer);
    });

    it('handles both horizontal and vertical containers', () => {
      // Nest element in vertical container, which is inside horizontal container
      verticalContainer.appendChild(element);
      horizontalContainer.appendChild(verticalContainer);
      document.body.appendChild(horizontalContainer);

      mockRect(element, { top: 100, bottom: 200, left: 100, right: 200 });
      mockRect(verticalContainer, { top: 0, bottom: 500 });
      mockRect(horizontalContainer, { left: 0, right: 500 });

      scrollIntoViewBoth(element);

      // Both containers should be checked, native scrollIntoView should not be called
      expect(element.scrollIntoView).not.toHaveBeenCalled();

      document.body.removeChild(horizontalContainer);
    });

    it('respects custom behavior option in fallback', () => {
      scrollIntoViewBoth(element, { behavior: 'instant' });

      expect(element.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'instant',
        block: 'nearest',
        inline: 'nearest',
      });
    });
  });
});

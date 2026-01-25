/**
 * Scroll utilities for ensuring elements are visible within scroll containers.
 */

export interface ScrollOptions {
  /** Padding from container edges (default: 40) */
  padding?: number;
  /** Top margin for vertical scroll (default: 12) */
  topMargin?: number;
  /** Bottom padding for vertical scroll, accounts for gradient overlays (default: 40) */
  bottomPadding?: number;
  /** Scroll behavior (default: 'smooth') */
  behavior?: ScrollBehavior;
}

const DEFAULT_OPTIONS: Required<ScrollOptions> = {
  padding: 40,
  topMargin: 12,
  bottomPadding: 40,
  behavior: 'smooth',
};

/**
 * Scrolls an element into view horizontally within its scroll container.
 * Finds the nearest horizontal scroll container (.overflow-x-auto) and scrolls if needed.
 * 
 * @param element - The element to scroll into view
 * @param options - Scroll options
 * @returns true if a scroll container was found and handled
 */
export function scrollIntoViewHorizontal(
  element: HTMLElement,
  options: ScrollOptions = {}
): boolean {
  const { padding, behavior } = { ...DEFAULT_OPTIONS, ...options };
  const scrollContainer = element.closest('.overflow-x-auto');
  
  if (!scrollContainer) {
    return false;
  }
  
  const elementRect = element.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  
  // Check if element is to the right of visible area
  if (elementRect.right > containerRect.right - padding) {
    const scrollAmount = elementRect.right - containerRect.right + padding;
    scrollContainer.scrollBy({ left: scrollAmount, behavior });
  }
  // Check if element is to the left of visible area
  else if (elementRect.left < containerRect.left + padding) {
    const scrollAmount = elementRect.left - containerRect.left - padding;
    scrollContainer.scrollBy({ left: scrollAmount, behavior });
  }
  
  return true;
}

/**
 * Scrolls an element into view vertically within its scroll container.
 * Finds the nearest vertical scroll container (.overflow-y-auto) and scrolls if needed.
 * 
 * @param element - The element to scroll into view
 * @param options - Scroll options
 * @returns true if a scroll container was found and handled
 */
export function scrollIntoViewVertical(
  element: HTMLElement,
  options: ScrollOptions = {}
): boolean {
  const { topMargin, bottomPadding, behavior } = { ...DEFAULT_OPTIONS, ...options };
  const scrollContainer = element.closest('.overflow-y-auto');
  
  if (!scrollContainer) {
    return false;
  }
  
  const elementRect = element.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  
  // Check if element is below the visible area (accounting for gradient overlay)
  if (elementRect.bottom > containerRect.bottom - bottomPadding) {
    const scrollAmount = elementRect.bottom - containerRect.bottom + bottomPadding;
    scrollContainer.scrollBy({ top: scrollAmount, behavior });
  }
  // Check if element is above the visible area
  else if (elementRect.top < containerRect.top) {
    const scrollAmount = elementRect.top - containerRect.top - topMargin;
    scrollContainer.scrollBy({ top: scrollAmount, behavior });
  }
  
  return true;
}

/**
 * Scrolls an element into view in both directions.
 * Handles vertical scrolling within a list and horizontal scrolling of the board.
 * Falls back to native scrollIntoView if no scroll containers are found.
 * 
 * @param element - The element to scroll into view
 * @param options - Scroll options
 */
export function scrollIntoViewBoth(
  element: HTMLElement,
  options: ScrollOptions = {}
): void {
  const verticalHandled = scrollIntoViewVertical(element, options);
  const horizontalHandled = scrollIntoViewHorizontal(element, options);
  
  // Fallback to native scrollIntoView if no scroll containers found
  if (!verticalHandled && !horizontalHandled) {
    element.scrollIntoView({ behavior: options.behavior ?? 'smooth', block: 'nearest', inline: 'nearest' });
  }
}

/**
 * URL Utility Functions
 *
 * Shared helpers for URL parsing, validation, and favicon fetching.
 * 
 * SECURITY: These functions are critical for preventing XSS attacks.
 * All user-provided URLs (from import, paste, or manual entry) MUST be
 * validated before being used in href attributes or img src.
 */

/**
 * Protocols that are explicitly blocked for security reasons.
 * - javascript: XSS attacks
 * - data: Can contain executable HTML/JS
 * - vbscript: Legacy XSS vector
 * - file: Local file access
 */
const BLOCKED_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:'];

/**
 * Extract domain from URL for display
 * @param url - URL string (with or without protocol)
 * @returns Domain name without 'www.' prefix, or null if invalid
 */
export function getDomainFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Get favicon URL for a domain using Google's favicon service
 * @param url - URL string (with or without protocol)
 * @returns Google favicon service URL, or null if invalid
 */
export function getFaviconUrl(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    // Google's favicon service - returns higher quality favicons
    return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;
  } catch {
    return null;
  }
}

/**
 * Check if a URL protocol is in the blocked list
 * @param protocol - Protocol string (e.g., 'javascript:')
 * @returns true if the protocol is blocked
 */
function isBlockedProtocol(protocol: string): boolean {
  return BLOCKED_PROTOCOLS.includes(protocol.toLowerCase());
}

/**
 * Validate and sanitize URL for safe rendering in href attributes
 * Only allows http: and https: protocols to prevent XSS via javascript: URLs
 * 
 * SECURITY: This function is critical for preventing XSS attacks.
 * It explicitly blocks dangerous protocols like javascript:, data:, etc.
 * 
 * @param url - URL string (with or without protocol)
 * @returns Safe URL string with protocol, or undefined if invalid/unsafe
 */
export function getSafeHref(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    
    // Explicitly block dangerous protocols
    if (isBlockedProtocol(parsed.protocol)) {
      return undefined;
    }
    
    // Only allow http and https protocols
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    return undefined;
  } catch {
    // If it's not a valid URL, try prepending https://
    try {
      const withProtocol = `https://${url}`;
      const parsed = new URL(withProtocol);
      if (parsed.protocol === 'https:') {
        return withProtocol;
      }
    } catch {
      // Invalid URL
    }
    return undefined;
  }
}

/**
 * Validate and sanitize URL for safe rendering in img src attributes
 * Only allows http: and https: protocols to prevent XSS and data exfiltration.
 * 
 * SECURITY: This function prevents:
 * - XSS via javascript: or data: URIs in img src
 * - Data exfiltration via external image URLs (when loading images, the server
 *   can track the user's IP and when they viewed the card)
 * 
 * Note: External image URLs are still allowed as blocking them would break
 * legitimate use cases. Users should be aware that external images can track them.
 * 
 * @param url - URL string (with or without protocol)
 * @returns Safe URL string, or undefined if invalid/unsafe
 */
export function getSafeImageUrl(url: string): string | undefined {
  // Empty or whitespace-only URLs are invalid
  if (!url || !url.trim()) {
    return undefined;
  }
  
  try {
    const parsed = new URL(url);
    
    // Explicitly block dangerous protocols
    if (isBlockedProtocol(parsed.protocol)) {
      return undefined;
    }
    
    // Only allow http and https protocols for images
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    return undefined;
  } catch {
    // If it doesn't parse as a URL, try with https://
    try {
      const withProtocol = `https://${url}`;
      const parsed = new URL(withProtocol);
      if (parsed.protocol === 'https:') {
        return withProtocol;
      }
    } catch {
      // Invalid URL
    }
    return undefined;
  }
}

/**
 * Normalize URL by adding https:// if no protocol is present
 * @param url - URL string (with or without protocol)
 * @returns URL with protocol
 */
export function normalizeUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

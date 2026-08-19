import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { Components } from 'react-markdown';
import { getSafeHref, getSafeImageUrl } from '../utils/url';

interface MarkdownProps {
  /** Raw markdown source to render. */
  content: string;
  /** Optional extra classes for the prose wrapper. */
  className?: string;
}

/**
 * Custom renderers that sanitize all user-provided URLs.
 *
 * SECURITY: react-markdown does not render raw HTML unless rehype-raw is added,
 * so we intentionally omit it — markup like <script> is rendered as plain text.
 * Links and images are additionally passed through the shared URL validators to
 * block javascript:/data:/etc. protocols (see src/utils/url.ts).
 */
const components: Components = {
  a({ href, children, ...props }) {
    const safeHref = href ? getSafeHref(href) : undefined;
    // If the URL is unsafe, drop the anchor and render its text content only.
    if (!safeHref) {
      return <>{children}</>;
    }
    return (
      <a
        {...props}
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        // Prevent a link click inside a preview from also triggering the
        // surrounding "click to edit" handler.
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </a>
    );
  },
  img({ src, alt, ...props }) {
    const safeSrc = typeof src === 'string' ? getSafeImageUrl(src) : undefined;
    if (!safeSrc) {
      return null;
    }
    return <img {...props} src={safeSrc} alt={alt ?? ''} />;
  },
};

/**
 * Renders markdown as formatted, sanitized HTML using the Trello-style feature
 * set: bold, italic, strikethrough, headings, lists, inline/fenced code,
 * blockquotes, links, autolinked URLs (remark-gfm) and preserved single line
 * breaks (remark-breaks).
 */
export function Markdown({ content, className = '' }: MarkdownProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

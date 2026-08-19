import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders bold text as <strong>', () => {
    const { container } = render(<Markdown content="**bold**" />);
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('bold');
  });

  it('renders italic text as <em>', () => {
    const { container } = render(<Markdown content="_italic_" />);
    expect(container.querySelector('em')?.textContent).toBe('italic');
  });

  it('renders strikethrough (GFM) as <del>', () => {
    const { container } = render(<Markdown content="~~gone~~" />);
    expect(container.querySelector('del')?.textContent).toBe('gone');
  });

  it('renders headings and lists', () => {
    const { container } = render(<Markdown content={'# Title\n\n- one\n- two'} />);
    expect(container.querySelector('h1')?.textContent).toBe('Title');
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders inline code', () => {
    const { container } = render(<Markdown content="run `npm test`" />);
    expect(container.querySelector('code')?.textContent).toBe('npm test');
  });

  it('preserves single line breaks as <br> (remark-breaks)', () => {
    const { container } = render(<Markdown content={'line one\nline two'} />);
    expect(container.querySelector('br')).not.toBeNull();
  });

  it('autolinks bare URLs (GFM)', () => {
    render(<Markdown content="see https://example.com for details" />);
    const link = screen.getByRole('link', { name: 'https://example.com' });
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('opens links in a new tab with safe rel', () => {
    render(<Markdown content="[site](https://example.com)" />);
    const link = screen.getByRole('link', { name: 'site' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not render javascript: links as anchors (XSS prevention)', () => {
    render(<Markdown content="[click](javascript:alert(1))" />);
    // Text is preserved but no live link is emitted.
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('click')).toBeInTheDocument();
  });

  it('does not render raw HTML (XSS prevention)', () => {
    const { container } = render(
      <Markdown content={'<img src=x onerror="alert(1)">'} />
    );
    // Raw HTML is escaped, not parsed into a real element.
    expect(container.querySelector('img')).toBeNull();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardModal } from './CardModal';
import { useBoardStore } from '../store';
import { useCardFocusStore } from '../store/cardFocus';
import type { Card as CardType } from '../types';

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('CardModal - markdown description', () => {
  const now = new Date().toISOString();
  const cardWithDescription: CardType = {
    id: 'card-1',
    listId: 'list-1',
    title: 'Test Card',
    description: '**bold** description',
    position: 0,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    useBoardStore.setState({
      projects: [],
      lists: [],
      cards: [cardWithDescription],
      activeProjectId: null,
      isInitialized: true,
    });
    useCardFocusStore.setState({ focusedId: null, focusType: null });
  });

  it('renders the description as markdown (not a textarea) by default', () => {
    render(<CardModal card={cardWithDescription} onClose={vi.fn()} />);

    // Rendered markdown: bold text present as <strong>, no editing textarea yet.
    const bold = document.querySelector('.prose strong');
    expect(bold?.textContent).toBe('bold');
    expect(screen.queryByPlaceholderText(/markdown supported/i)).toBeNull();
  });

  it('switches to the raw markdown editor when the preview is clicked', async () => {
    const user = userEvent.setup();
    render(<CardModal card={cardWithDescription} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /description, click to edit/i }));

    const textarea = screen.getByPlaceholderText(/markdown supported/i);
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toBe('**bold** description');
  });

  it('shows the editor immediately for a card with an empty description', async () => {
    const user = userEvent.setup();
    const emptyCard = { ...cardWithDescription, description: '' };
    render(<CardModal card={emptyCard} onClose={vi.fn()} isNew />);

    // Expand the description field via its "Add description" button.
    await user.click(screen.getByRole('button', { name: /add description/i }));

    expect(screen.getByPlaceholderText(/markdown supported/i)).toBeInTheDocument();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card } from './Card';
import { useBoardStore } from '../store';
import { useCardFocusStore } from '../store/cardFocus';
import type { Card as CardType } from '../types';

// Mock the link preview hook
vi.mock('../hooks/useLinkPreview', () => ({
  useLinkPreview: () => null,
}));

// Mock scrollIntoView since jsdom doesn't support it
Element.prototype.scrollIntoView = vi.fn();

describe('Card Component - Drag and Drop', () => {
  const now = new Date().toISOString();
  const testCard: CardType = {
    id: 'card-1',
    listId: 'list-1',
    title: 'Test Card',
    description: 'Test description',
    position: 0,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    // Reset stores
    useBoardStore.setState({
      projects: [],
      lists: [],
      cards: [testCard],
      activeProjectId: null,
      isInitialized: true,
    });

    useCardFocusStore.setState({
      focusedId: null,
      focusType: null,
    });
  });

  const renderWithDndContext = (card: CardType) => {
    return render(
      <DndContext>
        <SortableContext items={[card.id]} strategy={verticalListSortingStrategy}>
          <Card card={card} />
        </SortableContext>
      </DndContext>
    );
  };

  it('should render card with title', () => {
    renderWithDndContext(testCard);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  it('should have cursor-grab class for dragging affordance', () => {
    renderWithDndContext(testCard);
    const cardElement = screen.getByText('Test Card').closest('[data-card-id]');
    expect(cardElement).toHaveClass('cursor-grab');
  });

  it('should have data-card-id attribute', () => {
    renderWithDndContext(testCard);
    const cardElement = screen.getByText('Test Card').closest('[data-card-id]');
    expect(cardElement).toHaveAttribute('data-card-id', 'card-1');
  });

  it('should render description indicator when card has description', () => {
    renderWithDndContext(testCard);
    expect(screen.getByTitle('Has description')).toBeInTheDocument();
  });

  it('should not render description indicator when card has no description', () => {
    const cardWithoutDescription = { ...testCard, description: '' };
    renderWithDndContext(cardWithoutDescription);
    expect(screen.queryByTitle('Has description')).not.toBeInTheDocument();
  });

  it('should render with link when card has link', () => {
    const cardWithLink = { ...testCard, link: 'https://example.com/page' };
    renderWithDndContext(cardWithLink);
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('should render due date when card has due date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    // Due dates are stored as YYYY-MM-DD (local date), matching the DatePicker output
    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    const dueDate = `${year}-${month}-${day}`;
    const cardWithDueDate = { ...testCard, dueDate };
    renderWithDndContext(cardWithDueDate);

    // Check that the date is rendered in local time (format varies by locale)
    const expected = new Date(`${dueDate}T00:00:00`).toLocaleDateString();
    const dateElement = screen.getByText(expected);
    expect(dateElement).toBeInTheDocument();
  });

  it('should apply focus styles when card is focused', () => {
    useCardFocusStore.setState({ focusedId: 'card-1', focusType: 'card' });
    
    renderWithDndContext(testCard);
    const cardElement = screen.getByText('Test Card').closest('[data-card-id]');
    
    expect(cardElement).toHaveClass('ring-1');
    expect(cardElement).toHaveClass('ring-glow/50');
  });

  it('should not apply focus styles when card is not focused', () => {
    useCardFocusStore.setState({ focusedId: 'other-card', focusType: 'card' });
    
    renderWithDndContext(testCard);
    const cardElement = screen.getByText('Test Card').closest('[data-card-id]');
    
    expect(cardElement).not.toHaveClass('ring-glow/50');
  });
});

describe('Card Component - Multiple Cards', () => {
  const now = new Date().toISOString();
  const cards: CardType[] = [
    { id: 'card-1', listId: 'list-1', title: 'Card 1', description: '', position: 0, createdAt: now, updatedAt: now },
    { id: 'card-2', listId: 'list-1', title: 'Card 2', description: '', position: 1, createdAt: now, updatedAt: now },
    { id: 'card-3', listId: 'list-1', title: 'Card 3', description: '', position: 2, createdAt: now, updatedAt: now },
  ];

  beforeEach(() => {
    useBoardStore.setState({
      projects: [],
      lists: [],
      cards,
      activeProjectId: null,
      isInitialized: true,
    });

    useCardFocusStore.setState({
      focusedId: null,
      focusType: null,
    });
  });

  it('should render multiple cards in sortable context', () => {
    render(
      <DndContext>
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <Card key={card.id} card={card} />
          ))}
        </SortableContext>
      </DndContext>
    );

    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.getByText('Card 2')).toBeInTheDocument();
    expect(screen.getByText('Card 3')).toBeInTheDocument();
  });

  it('should have unique data-card-id attributes', () => {
    render(
      <DndContext>
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <Card key={card.id} card={card} />
          ))}
        </SortableContext>
      </DndContext>
    );

    const cardElements = document.querySelectorAll('[data-card-id]');
    expect(cardElements.length).toBe(3);
    expect(cardElements[0]).toHaveAttribute('data-card-id', 'card-1');
    expect(cardElements[1]).toHaveAttribute('data-card-id', 'card-2');
    expect(cardElements[2]).toHaveAttribute('data-card-id', 'card-3');
  });
});

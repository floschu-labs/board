import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarIcon, Bars3BottomLeftIcon, LinkIcon } from '@heroicons/react/16/solid';
import type { Card as CardType } from '../types';
import { useFocusedCardId, useCardFocusStore } from '../store/cardFocus';
import { useThemeStore } from '../store/theme';
import { getDomainFromUrl, getFaviconUrl, getSafeHref, getSafeImageUrl } from '../utils/url';
import { getDueDateColor, isDueDatePast } from '../utils/date';
import { scrollIntoViewBoth } from '../utils/scroll';
import { CardModal } from './CardModal';

interface CardProps {
  card: CardType;
  isOpenedByKeyboard?: boolean;
  onModalClose?: () => void;
}

// Cache of failed favicon URLs to avoid re-requesting them
const failedFavicons = new Set<string>();

// Favicon component with error handling - shows LinkIcon fallback on load failure
function Favicon({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(() => failedFavicons.has(url));
  
  if (failed) {
    return <LinkIcon className="w-3.5 h-3.5" />;
  }
  
  return (
    <img 
      src={url} 
      alt="" 
      className={className}
      onError={() => {
        failedFavicons.add(url);
        setFailed(true);
      }}
    />
  );
}

// Static card preview for DragOverlay (no interactivity, no hooks that depend on drag state)
export function CardPreview({ card, dueDateWarningDays = 0, showFavicons = true }: { card: CardType; dueDateWarningDays?: number; showFavicons?: boolean }) {
  const domain = card.link ? getDomainFromUrl(card.link) : null;
  const faviconUrl = card.link && showFavicons ? getFaviconUrl(card.link) : null;
  const safeCoverImageUrl = card.coverImageUrl ? getSafeImageUrl(card.coverImageUrl) : null;

  const dueDateColor = card.dueDate ? getDueDateColor(card.dueDate, dueDateWarningDays) : 'text-text-muted';

  return (
    <div className="bg-bg-tertiary rounded-lg border border-border w-80 opacity-95 rotate-2 shadow-2xl">
      {/* Cover Image - only render if URL is safe */}
      {safeCoverImageUrl && (
        <div className="h-28 w-full overflow-hidden rounded-t-lg relative bg-bg-tertiary">
          <img
            src={safeCoverImageUrl}
            alt=""
            className="w-full h-full object-cover opacity-70"
          />
        </div>
      )}

      <div className="p-3">
        {/* Title */}
        <h4 className="text-sm font-medium text-text-primary mb-1 leading-snug break-words">
          {card.title}
        </h4>

        {/* Footer: description icon, link pill, due date */}
        {(card.description || card.link || card.dueDate) && (
          <div className="flex items-center gap-3 text-xs pt-2">
            {card.description && (
              <Bars3BottomLeftIcon className="w-3.5 h-3.5 text-text-muted" title="Has description" />
            )}
            {card.link && (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-secondary text-text-muted">
                {faviconUrl ? (
                  <Favicon url={faviconUrl} className="w-4 h-4 rounded-sm" />
                ) : (
                  <LinkIcon className="w-3.5 h-3.5" />
                )}
                <span className="truncate max-w-24">{domain}</span>
              </span>
            )}
            {card.dueDate && (
              <span
                className={`flex items-center gap-1.5 ${dueDateColor} ${isDueDatePast(card.dueDate) ? 'line-through' : ''}`}
              >
                <CalendarIcon className="w-3 h-3" />
                {new Date(card.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Card({ card, isOpenedByKeyboard, onModalClose }: CardProps) {
  const [showModal, setShowModal] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const focusedCardId = useFocusedCardId();
  const setFocusedCard = useCardFocusStore((s) => s.setFocusedCard);
  const dueDateWarningDays = useThemeStore((s) => s.dueDateWarningDays);
  const showFavicons = useThemeStore((s) => s.showFavicons);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const isFocused = focusedCardId === card.id;

  // Favicon from Google (only if enabled)
  const faviconUrl = card.link && showFavicons ? getFaviconUrl(card.link) : null;
  
  // Safely validate cover image URL
  const safeCoverImageUrl = card.coverImageUrl ? getSafeImageUrl(card.coverImageUrl) : null;

  // Open modal when triggered by keyboard shortcut
  useLayoutEffect(() => {
    if (isOpenedByKeyboard) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync external trigger to internal state
      setShowModal(true);
    }
  }, [isOpenedByKeyboard]);

  // Measure card height for drag placeholder
  useEffect(() => {
    if (cardRef.current) {
      const height = cardRef.current.offsetHeight;
      if (height > 0 && height !== measuredHeight) {
        setMeasuredHeight(height);
      }
    }
  }, [card, measuredHeight]);

  // Scroll card into view when focused or when card moves to a new list while focused
  useEffect(() => {
    if (isFocused && cardRef.current) {
      scrollIntoViewBoth(cardRef.current);
    }
  }, [isFocused, card.listId]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', card, height: measuredHeight },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const dueDateColor = card.dueDate ? getDueDateColor(card.dueDate, dueDateWarningDays) : 'text-text-muted';
  const domain = card.link ? getDomainFromUrl(card.link) : null;

  const handleClose = () => {
    setShowModal(false);
    onModalClose?.();
  };

  return (
    <>
      <div
        ref={(node) => {
          setNodeRef(node);
          (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        style={{
          ...style,
          opacity: isDragging ? 0 : showModal ? 0 : 1,
          transition: isDragging ? style.transition : 'opacity 0.15s ease-out',
        }}
        data-card-id={card.id}
        {...attributes}
        {...listeners}
        onClick={() => {
          if (!isDragging) {
            setFocusedCard(card.id);
            setShowModal(true);
          }
        }}
        className={`bg-bg-tertiary rounded-lg border cursor-grab active:cursor-grabbing group select-none transition-[border-color,box-shadow] hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] ${
          isFocused 
            ? 'ring-1 ring-glow/50 border-glow/50' 
            : 'border-border hover:border-border-light'
        }`}
      >
        {/* Cover Image - only render if URL is safe */}
        {safeCoverImageUrl && (
            <div className="h-28 w-full overflow-hidden rounded-t-lg relative bg-bg-tertiary">
              <img
                src={safeCoverImageUrl}
                alt=""
                className="w-full h-full object-cover opacity-70"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="p-3">
            {/* Title */}
            <h4 className="text-sm font-medium text-text-primary mb-1 leading-snug break-words">
              {card.title}
            </h4>

            {/* Footer: description icon, link pill, due date */}
            {(card.description || card.link || card.dueDate) && (
              <div className="flex items-center gap-3 text-xs pt-2">
                {card.description && (
                  <Bars3BottomLeftIcon className="w-3.5 h-3.5 text-text-muted" title="Has description" />
                )}
                {card.link && getSafeHref(card.link) && (
                  <a
                    href={getSafeHref(card.link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-secondary hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                  >
                    {faviconUrl ? (
                      <Favicon url={faviconUrl} className="w-4 h-4 rounded-sm" />
                    ) : (
                      <LinkIcon className="w-3.5 h-3.5" />
                    )}
                    <span className="truncate max-w-24">{domain}</span>
                  </a>
                )}
                {card.dueDate && (
                  <span
                    className={`flex items-center gap-1.5 ${dueDateColor} ${isDueDatePast(card.dueDate) ? 'line-through' : ''}`}
                  >
                    <CalendarIcon className="w-3 h-3" />
                    {new Date(card.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

      {showModal && <CardModal card={card} onClose={handleClose} />}
    </>
  );
}

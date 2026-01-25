import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

interface TextTypeProps {
  text: string | string[];
  typingSpeed?: number;
  initialDelay?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
  loop?: boolean;
  className?: string;
  showCursor?: boolean;
  cursorCharacter?: string;
  onComplete?: () => void;
}

export function TextType({
  text,
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = false,
  className = '',
  showCursor = true,
  cursorCharacter = '|',
  onComplete,
}: TextTypeProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  // Memoize textArray to prevent recreation on every render
  const textArray = useMemo(() => Array.isArray(text) ? text : [text], [text]);
  
  // Use refs for animation state to avoid re-renders
  const stateRef = useRef({
    currentCharIndex: 0,
    currentTextIndex: 0,
    isDeleting: false,
    hasStarted: false,
  });

  const handleComplete = useCallback(() => {
    if (!isComplete && onComplete) {
      setIsComplete(true);
      onComplete();
    }
  }, [isComplete, onComplete]);

  useEffect(() => {
    // Guard: Don't start animation if textArray is empty
    if (textArray.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Edge case: complete immediately when no text to animate
      handleComplete();
      return;
    }
    
    let timeout: ReturnType<typeof setTimeout>;
    
    const tick = () => {
      const state = stateRef.current;
      const currentText = textArray[state.currentTextIndex];
      
      // Safety check: ensure currentText exists
      if (!currentText) {
        handleComplete();
        return;
      }
      
      if (!state.hasStarted) {
        // Initial delay
        timeout = setTimeout(() => {
          state.hasStarted = true;
          tick();
        }, initialDelay);
        return;
      }
      
      if (state.isDeleting) {
        if (state.currentCharIndex === 0) {
          state.isDeleting = false;
          
          if (state.currentTextIndex === textArray.length - 1 && !loop) {
            handleComplete();
            return;
          }
          
          state.currentTextIndex = (state.currentTextIndex + 1) % textArray.length;
          timeout = setTimeout(tick, pauseDuration);
        } else {
          state.currentCharIndex--;
          setDisplayedText(currentText.slice(0, state.currentCharIndex));
          timeout = setTimeout(tick, deletingSpeed);
        }
      } else {
        if (state.currentCharIndex < currentText.length) {
          state.currentCharIndex++;
          setDisplayedText(currentText.slice(0, state.currentCharIndex));
          timeout = setTimeout(tick, typingSpeed);
        } else {
          // Finished typing current text
          if (textArray.length === 1 && !loop) {
            handleComplete();
            return;
          }
          
          if (!loop && state.currentTextIndex === textArray.length - 1) {
            handleComplete();
            return;
          }
          
          timeout = setTimeout(() => {
            state.isDeleting = true;
            tick();
          }, pauseDuration);
        }
      }
    };
    
    tick();
    
    return () => clearTimeout(timeout);
  }, [textArray, typingSpeed, deletingSpeed, pauseDuration, initialDelay, loop, handleComplete]);

  return (
    <span className={`inline-block whitespace-pre-wrap ${className}`}>
      <span>{displayedText}</span>
      {showCursor && (
        <span className="ml-0.5 inline-block animate-blink">{cursorCharacter}</span>
      )}
    </span>
  );
}

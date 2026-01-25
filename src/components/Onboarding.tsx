import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheckIcon, ArrowDownTrayIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/16/solid';
import { TextType } from './TextType';
import { useThemeStore, GLOW_COLORS } from '../store/theme';

interface OnboardingProps {
  onComplete: (projectName?: string) => void;
  showProjectNameStep?: boolean;
}

interface InfoSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  visible: boolean;
}

function InfoSection({ icon, title, description, visible }: InfoSectionProps) {
  return (
    <div 
      className={`flex items-start gap-4 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center text-glow">
        {icon}
      </div>
      <div>
        <h3 className="text-text-primary font-medium mb-1">{title}</h3>
        <p className="text-text-secondary text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export function Onboarding({ onComplete, showProjectNameStep = true }: OnboardingProps) {
  const [showContent, setShowContent] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [step, setStep] = useState<'welcome' | 'appearance' | 'projectName'>('welcome');
  const [projectName, setProjectName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const glowColor = useThemeStore((s) => s.glowColor);
  const setGlowColor = useThemeStore((s) => s.setGlowColor);

  const handleTypingComplete = () => {
    // Stagger the content appearance
    setTimeout(() => setShowContent(true), 300);
    setTimeout(() => setShowButton(true), 900);
  };

  const handleContinue = useCallback(() => {
    setStep('appearance');
  }, []);

  const handleAppearanceContinue = useCallback(() => {
    if (showProjectNameStep) {
      setStep('projectName');
    } else {
      onComplete();
    }
  }, [showProjectNameStep, onComplete]);

  const handleFinish = useCallback(() => {
    const name = projectName.trim() || 'My Project';
    onComplete(name);
  }, [projectName, onComplete]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent all keyboard events from propagating to the main app
    // This stops arrow keys from triggering settings menu, etc.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step === 'welcome') {
        handleContinue();
      } else if (step === 'appearance') {
        handleAppearanceContinue();
      } else {
        handleFinish();
      }
    }
  }, [step, handleContinue, handleAppearanceContinue, handleFinish]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus input when step changes to projectName
  useEffect(() => {
    if (step === 'projectName') {
      // Small delay to ensure the input is rendered
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4 p-6 rounded-xl bg-bg-secondary border border-border shadow-2xl">
        {step === 'welcome' ? (
          <>
            {/* Welcome Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-text-primary">
                <span className="inline-flex items-baseline">
                  {/* App icon - inline at start of line */}
                  <svg viewBox="0 0 32 32" className="w-6 h-6 mr-2 self-center" style={{ transform: 'translateY(1px)' }}>
                    <defs>
                      <mask id="b-cutout-onboarding">
                        <rect width="32" height="32" fill="white"/>
                        <text x="16" y="24" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="700" textAnchor="middle" fill="black">b</text>
                      </mask>
                    </defs>
                    <rect width="32" height="32" rx="6" fill="currentColor" className="text-glow" mask="url(#b-cutout-onboarding)"/>
                  </svg>
                  <TextType
                    text="Welcome to board."
                    typingSpeed={60}
                    initialDelay={500}
                    showCursor={true}
                    cursorCharacter="_"
                    onComplete={handleTypingComplete}
                  />
                </span>
              </h1>
            </div>

            {/* Info Sections */}
            <div className="space-y-6 mb-8">
              <InfoSection
                icon={<ShieldCheckIcon className="w-5 h-5" />}
                title="Privacy First"
                description="Your data stays on your device. Nothing is ever sent to a server. Your boards, your business."
                visible={showContent}
              />
              
              <InfoSection
                icon={<ArrowDownTrayIcon className="w-5 h-5" />}
                title="Backup Anytime"
                description="Export your data as a backup file whenever you want. Import it on any device to pick up where you left off."
                visible={showContent}
              />
              
              <InfoSection
                icon={<Cog6ToothIcon className="w-5 h-5" />}
                title="Make It Yours"
                description="Personalize colors, backgrounds, and more in the Settings menu. Your workspace, your style."
                visible={showContent}
              />
            </div>

            {/* Continue Button */}
            <div 
              className={`transition-all duration-500 ${
                showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <button
                onClick={handleContinue}
                className="w-full py-3 px-4 rounded-lg font-medium text-bg-primary bg-glow hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-glow focus:ring-offset-2 focus:ring-offset-bg-secondary"
              >
                Continue
              </button>
              <p className="text-center text-text-muted text-xs mt-3">
                Press <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Enter</kbd> to continue
              </p>
            </div>
          </>
        ) : step === 'appearance' ? (
          <>
            {/* Appearance Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-text-primary mb-2">
                Choose your color
              </h1>
              <p className="text-text-secondary text-sm">
                Pick an accent color for your workspace.
              </p>
            </div>

            {/* Color Selection */}
            <div className="mb-8">
              <div className="flex justify-center gap-3">
                {(Object.entries(GLOW_COLORS) as [keyof typeof GLOW_COLORS, typeof GLOW_COLORS[keyof typeof GLOW_COLORS]][]).map(([key, color]) => (
                  <button
                    key={key}
                    onClick={() => setGlowColor(key)}
                    className="relative w-12 h-12 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-secondary"
                    style={{ 
                      backgroundColor: color.value,
                      boxShadow: glowColor === key ? `0 0 20px ${color.value}` : 'none'
                    }}
                    aria-label={color.name}
                  >
                    {glowColor === key && (
                      <CheckIcon className="absolute inset-0 m-auto w-6 h-6 text-bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <div>
              <button
                onClick={handleAppearanceContinue}
                className="w-full py-3 px-4 rounded-lg font-medium text-bg-primary bg-glow hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-glow focus:ring-offset-2 focus:ring-offset-bg-secondary"
              >
                Continue
              </button>
              <p className="text-center text-text-muted text-xs mt-3">
                Press <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Enter</kbd> to continue
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Project Name Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-text-primary mb-2">
                Name your first project
              </h1>
              <p className="text-text-secondary text-sm">
                You can always rename it later or create more projects.
              </p>
            </div>

            {/* Project Name Input */}
            <div className="mb-6">
              <input
                ref={inputRef}
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Project"
                className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-glow focus:ring-1 focus:ring-glow transition-colors"
                maxLength={100}
              />
            </div>

            {/* Get Started Button */}
            <div>
              <button
                onClick={handleFinish}
                className="w-full py-3 px-4 rounded-lg font-medium text-bg-primary bg-glow hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-glow focus:ring-offset-2 focus:ring-offset-bg-secondary"
              >
                Get Started
              </button>
              <p className="text-center text-text-muted text-xs mt-3">
                Press <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Enter</kbd> to continue
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

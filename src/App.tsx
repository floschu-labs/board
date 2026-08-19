import { useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useBoardStore } from './store';
import { useThemeStore, getGlowColorHex } from './store/theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Board } from './components/Board';
import { ShortcutsBar } from './components/ShortcutsBar';
import { Onboarding } from './components/Onboarding';
import { ImportDropZone } from './components/ImportDropZone';

// Lazy-loaded so the ogl (WebGL) dependency is code-split out of the main bundle
// and only fetched when the matching background effect is actually enabled.
const Aurora = lazy(() => import('./components/Aurora').then((m) => ({ default: m.Aurora })));
const LightRays = lazy(() => import('./components/LightRays').then((m) => ({ default: m.LightRays })));

export default function App() {
  const initialize = useBoardStore((s) => s.initialize);
  const isInitialized = useBoardStore((s) => s.isInitialized);
  const projects = useBoardStore((s) => s.projects);
  const createProject = useBoardStore((s) => s.createProject);

  const backgroundEffect = useThemeStore((s) => s.backgroundEffect);
  const backgroundEffectOpacity = useThemeStore((s) => s.backgroundEffectOpacity);
  const glowColor = useThemeStore((s) => s.glowColor);
  const customGlowColor = useThemeStore((s) => s.customGlowColor);
  const hasSeenOnboarding = useThemeStore((s) => s.hasSeenOnboarding);
  const setHasSeenOnboarding = useThemeStore((s) => s.setHasSeenOnboarding);

  const glowColorHex = getGlowColorHex(glowColor, customGlowColor);
  const hasBackground = backgroundEffect !== 'none';

  // Ref to prevent double-creation of default project in React Strict Mode
  const hasCreatedDefaultProject = useRef(false);

  // Reset the ref when all projects are deleted (e.g., via "Delete All Data")
  useEffect(() => {
    if (projects.length === 0) {
      hasCreatedDefaultProject.current = false;
    }
  }, [projects.length]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-create default project if none exist AND user has already seen onboarding
  // (If they haven't seen onboarding, the project will be created when they complete it)
  useEffect(() => {
    if (isInitialized && projects.length === 0 && hasSeenOnboarding && !hasCreatedDefaultProject.current) {
      hasCreatedDefaultProject.current = true;
      createProject('My Project');
    }
  }, [isInitialized, projects.length, hasSeenOnboarding, createProject]);

  // Handle onboarding completion with optional project name
  const handleOnboardingComplete = useCallback((projectName?: string) => {
    // Only create project if a name is provided (fresh start flow)
    if (projectName && !hasCreatedDefaultProject.current) {
      hasCreatedDefaultProject.current = true;
      createProject(projectName);
    }
    setHasSeenOnboarding(true);
  }, [createProject, setHasSeenOnboarding]);

  if (!isInitialized) {
    return null;
  }

  return (
    <ErrorBoundary>
      {/* Background Effect */}
      {backgroundEffect === 'aurora' && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Suspense fallback={null}>
            <Aurora
              colorStops={['#000000', glowColorHex, '#000000']}
              amplitude={1.0}
              blend={1}
              speed={1}
            />
          </Suspense>
        </div>
      )}
      {backgroundEffect === 'lightRays' && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Suspense fallback={null}>
            <LightRays
              raysColor={glowColorHex}
              raysOrigin="top-center"
              raysSpeed={0.5}
              lightSpread={1.5}
              rayLength={2.5}
              fadeDistance={1.2}
            />
          </Suspense>
        </div>
      )}
      
      {/* Main Content - opacity controlled by slider (100% visibility = 60% bg, 0% = 100% bg) */}
      <div 
        className={`w-full h-full flex flex-col relative z-10 transition-colors duration-300 ${!hasBackground ? 'bg-bg-primary' : ''}`}
        style={hasBackground ? { 
          backgroundColor: `rgb(15 15 15 / ${1 - (backgroundEffectOpacity / 100) * 0.4})` 
        } : undefined}
      >
        <Header />
        <Board keyboardShortcutsEnabled={hasSeenOnboarding} />
        <ShortcutsBar />
      </div>

      {/* Drag a Board backup or Trello export onto the app to import it */}
      <ImportDropZone />

      {/* Onboarding Modal */}
      {!hasSeenOnboarding && (
        <Onboarding 
          onComplete={handleOnboardingComplete}
          showProjectNameStep={projects.length === 0}
        />
      )}
    </ErrorBoundary>
  );
}

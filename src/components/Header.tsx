import { useState, useRef, useCallback, useEffect, Fragment, useLayoutEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  MenuSeparator,
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
  Button,
} from '@headlessui/react';
import { PlusIcon, EllipsisHorizontalIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, TrashIcon, PencilIcon, ChevronDownIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon, CommandLineIcon } from '@heroicons/react/16/solid';
import { useBoardStore } from '../store';
import { useThemeStore, GLOW_COLORS, BACKGROUND_EFFECTS, type BackgroundEffect } from '../store/theme';
import { useCardFocusStore } from '../store/cardFocus';
import { ContextMenu, useContextMenu } from './ContextMenu';
import { ConfirmDialog, useConfirmDialog } from './ConfirmDialog';
import { RenameDialog, useRenameDialog } from './RenameDialog';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { BoardSwitcherDialog } from './BoardSwitcherDialog';
import identityIcon from '../assets/identity-icon.png';
import type { Project } from '../types';
import {
  exportAllData,
  downloadJson,
  parseImportFile,
  validateAndPrepareImport,
} from '../utils/importExport';
import { convertTrelloExport } from '../utils/trelloImport';
import { clearData } from '../storage';

// Helper component to handle menu close - clears focus and blurs to prevent arrow key re-open
function MenuCloseHandler({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wasOpen = useRef(open);
  
  useEffect(() => {
    if (wasOpen.current && !open) {
      onClose();
    }
    wasOpen.current = open;
  }, [open, onClose]);
  
  return null;
}

// Sortable project tab component
function SortableProjectTab({ 
  project, 
  isActive, 
  onClick, 
  onContextMenu,
  tabRef,
}: { 
  project: Project; 
  isActive: boolean; 
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  tabRef?: (el: HTMLButtonElement | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Combine refs
  const combinedRef = (el: HTMLButtonElement | null) => {
    setNodeRef(el);
    tabRef?.(el);
  };

  return (
    <button
      ref={combinedRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`px-3 py-1.5 rounded-md text-sm transition-all whitespace-nowrap cursor-grab active:cursor-grabbing ${
        isActive
          ? 'text-text-primary font-medium hover:bg-bg-tertiary'
          : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
      }`}
    >
      {project.name}
    </button>
  );
}

// Project tab preview for drag overlay
function ProjectTabPreview({ project }: { project: Project }) {
  return (
    <div className="px-3 py-1.5 rounded-md text-sm whitespace-nowrap bg-bg-secondary border border-border shadow-lg text-text-primary font-medium">
      {project.name}
    </div>
  );
}

export function Header() {
  const projects = useBoardStore((s) => s.projects);
  const activeProjectId = useBoardStore((s) => s.activeProjectId);
  const setActiveProject = useBoardStore((s) => s.setActiveProject);
  const createProject = useBoardStore((s) => s.createProject);
  const updateProject = useBoardStore((s) => s.updateProject);
  const deleteProject = useBoardStore((s) => s.deleteProject);
  const moveProject = useBoardStore((s) => s.moveProject);
  const importData = useBoardStore((s) => s.importData);
  const clearAllData = useBoardStore((s) => s.clearAllData);

  const glowColor = useThemeStore((s) => s.glowColor);
  const setGlowColor = useThemeStore((s) => s.setGlowColor);
  const customGlowColor = useThemeStore((s) => s.customGlowColor);
  const setCustomGlowColor = useThemeStore((s) => s.setCustomGlowColor);
  const dueDateWarningDays = useThemeStore((s) => s.dueDateWarningDays);
  const setDueDateWarningDays = useThemeStore((s) => s.setDueDateWarningDays);
  const backgroundEffect = useThemeStore((s) => s.backgroundEffect);
  const setBackgroundEffect = useThemeStore((s) => s.setBackgroundEffect);
  const backgroundEffectOpacity = useThemeStore((s) => s.backgroundEffectOpacity);
  const setBackgroundEffectOpacity = useThemeStore((s) => s.setBackgroundEffectOpacity);
  const showFavicons = useThemeStore((s) => s.showFavicons);
  const setShowFavicons = useThemeStore((s) => s.setShowFavicons);
  const setHasSeenOnboarding = useThemeStore((s) => s.setHasSeenOnboarding);

  const clearFocus = useCardFocusStore((s) => s.clearFocus);

  const [rotation, setRotation] = useState(-6); // Current rotation in degrees
  const [isSpinning, setIsSpinning] = useState(false);
  const [showDueDateWarningDialog, setShowDueDateWarningDialog] = useState(false);
  const [showCustomColorDialog, setShowCustomColorDialog] = useState(false);
  const [tempWarningDays, setTempWarningDays] = useState(dueDateWarningDays);
  const [tempCustomColor, setTempCustomColor] = useState(customGlowColor);
  const [activeProject, setActiveDragProject] = useState<Project | null>(null);
  const [appearanceExpanded, setAppearanceExpanded] = useState(false);
  const [dataExpanded, setDataExpanded] = useState(false);
  const [helpExpanded, setHelpExpanded] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showBoardSwitcher, setShowBoardSwitcher] = useState(false);
  const spinVelocityRef = useRef(0); // Degrees per frame
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trelloFileInputRef = useRef<HTMLInputElement>(null);
  const warningDaysInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [navOffset, setNavOffset] = useState(0);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const project = projects.find((p) => p.id === event.active.id);
    if (project) {
      setActiveDragProject(project);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragProject(null);

    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        moveProject(active.id as string, newIndex);
      }
    }
  };

  // Handle logo click - add spin velocity
  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Add velocity (slower buildup - needs ~20 clicks to reach max speed)
    spinVelocityRef.current = Math.min(spinVelocityRef.current + 3, 60);
    
    if (!isSpinning) {
      setIsSpinning(true);
    }
  }, [isSpinning]);

  // Animation loop for spinning
  useEffect(() => {
    if (!isSpinning) return;
    
    const animate = () => {
      // Apply velocity to rotation
      setRotation(prev => prev + spinVelocityRef.current);
      
      // Apply friction to slow down
      spinVelocityRef.current *= 0.98;
      
      // Stop when velocity is very low
      if (spinVelocityRef.current < 0.5) {
        spinVelocityRef.current = 0;
        setIsSpinning(false);
        // Smoothly return to -6 degrees (handled by CSS transition)
        setRotation(-6);
        return;
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpinning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Calculate nav offset to center the active tab
  useLayoutEffect(() => {
    if (!navRef.current || !activeProjectId) {
      setNavOffset(0);
      return;
    }
    
    const activeTab = tabRefs.current.get(activeProjectId);
    if (!activeTab) {
      setNavOffset(0);
      return;
    }
    
    const navRect = navRef.current.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    
    // Calculate where the center of the active tab is relative to nav's left edge
    const tabCenterInNav = (tabRect.left - navRect.left) + (tabRect.width / 2);
    // Calculate the center of the nav
    const navCenter = navRect.width / 2;
    // The offset needed to center the active tab
    const offset = navCenter - tabCenterInNav;
    
    setNavOffset(offset);
  }, [activeProjectId, projects]);

  // Handle menu close - blur the button so arrow keys don't re-open it
  const handleMenuClose = useCallback(() => {
    clearFocus();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [clearFocus]);

  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const { dialog, showConfirm, hideConfirm, handleConfirm } = useConfirmDialog();
  const { dialog: renameDialog, showRename, hideRename, handleConfirm: handleRenameConfirm } = useRenameDialog();

  const handleNewProject = () => {
    showRename({
      title: 'New Project',
      currentName: '',
      confirmLabel: 'Create',
      onConfirm: (name) => createProject(name),
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseImportFile(file);
      const prepared = validateAndPrepareImport(data, projects);
      importData(prepared);
    } catch (error) {
      alert('Failed to import: ' + (error as Error).message);
    }

    e.target.value = '';
  };

  const handleTrelloFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let trelloData: unknown;
      try {
        trelloData = JSON.parse(text);
      } catch {
        throw new Error('The file is not valid JSON. Make sure you exported the board as JSON from Trello.');
      }
      const boardExport = convertTrelloExport(trelloData);
      const prepared = validateAndPrepareImport(boardExport, projects);
      importData(prepared);
    } catch (error) {
      alert('Failed to import Trello board: ' + (error as Error).message);
    }

    e.target.value = '';
  };

  const handleExportAll = () => {
    const data = exportAllData();
    downloadJson(data, `board-backup-${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleDeleteAll = () => {
    showConfirm({
      title: 'Delete All Data',
      message:
        'Are you sure you want to delete all projects, lists, and cards?\nThis action cannot be undone.',
      confirmLabel: 'Delete All',
      danger: true,
      onConfirm: () => {
        clearAllData();
        clearData();
        // Reset onboarding so user sees it again
        setHasSeenOnboarding(false);
      },
    });
  };

  const handleRenameProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      showRename({
        title: 'Rename Project',
        currentName: project.name,
        onConfirm: (newName) => updateProject(projectId, { name: newName }),
      });
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    showConfirm({
      title: 'Delete Project',
      message: `Are you sure you want to delete "${project?.name}"?\nThis action cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => deleteProject(projectId),
    });
  };

  const handleTabRightClick = (e: React.MouseEvent, projectId: string) => {
    showContextMenu(e, [
      {
        label: 'Rename',
        description: 'Change the project name',
        icon: <PencilIcon className="w-5 h-5" />,
        onClick: () => handleRenameProject(projectId),
      },
      {
        label: 'Delete',
        description: 'Remove this project',
        icon: <TrashIcon className="w-5 h-5" />,
        onClick: () => handleDeleteProject(projectId),
      },
    ]);
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 relative pt-[env(safe-area-inset-top)] pl-[max(env(safe-area-inset-left),1.5rem)] pr-[max(env(safe-area-inset-right),1.5rem)]" style={{ minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
        {/* Left side: Logo */}
        <div className="flex items-center shrink-0">
          <button 
            onClick={handleLogoClick}
            aria-label="Board logo"
            className="flex items-center focus:outline-none"
          >
            {/* Logo icon - tilted design with transparent "b" cutout */}
            <div 
              className="w-8 h-8"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'none' : 'transform 0.3s ease-out',
              }}
            >
              <svg viewBox="0 0 32 32" className="w-full h-full">
                <defs>
                  <mask id="b-cutout">
                    <rect width="32" height="32" fill="white"/>
                    <text x="16" y="24" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="700" textAnchor="middle" fill="black">b</text>
                  </mask>
                </defs>
                <rect width="32" height="32" rx="6" fill="currentColor" className="text-glow" mask="url(#b-cutout)"/>
              </svg>
            </div>
          </button>
        </div>

        {/* Center: All projects with active project centered */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <nav
            ref={navRef}
            className="absolute left-1/2 hidden sm:flex items-center gap-1 transition-transform duration-200"
            style={{
              // Center the nav, then apply offset to center active tab
              transform: `translateX(calc(-50% + ${navOffset}px))`,
            }}
          >
            <SortableContext items={projects.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
              {projects.map((project) => (
                <SortableProjectTab
                  key={project.id}
                  project={project}
                  isActive={project.id === activeProjectId}
                  onClick={(e) => {
                    if (project.id === activeProjectId) {
                      handleTabRightClick(e, project.id);
                    } else {
                      setActiveProject(project.id);
                    }
                  }}
                  onContextMenu={(e) => handleTabRightClick(e, project.id)}
                  tabRef={(el) => {
                    if (el) {
                      tabRefs.current.set(project.id, el);
                    } else {
                      tabRefs.current.delete(project.id);
                    }
                  }}
                />
              ))}
            </SortableContext>

            {/* Add Project Button */}
            <button
              onClick={handleNewProject}
              aria-label="Add project"
              className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </nav>

          <DragOverlay>
            {activeProject && <ProjectTabPreview project={activeProject} />}
          </DragOverlay>
        </DndContext>

        {/* Mobile: board switcher trigger (replaces the horizontal tab row below sm) */}
        <button
          onClick={() => {
            if (projects.length === 0) {
              handleNewProject();
            } else {
              setShowBoardSwitcher(true);
            }
          }}
          aria-label="Switch board"
          className="absolute left-1/2 -translate-x-1/2 sm:hidden flex items-center gap-1 max-w-[60vw] px-3 py-1.5 rounded-md text-sm text-text-primary font-medium hover:bg-bg-tertiary transition-colors"
        >
          <span className="truncate">
            {projects.find((p) => p.id === activeProjectId)?.name ?? 'Add board'}
          </span>
          <ChevronDownIcon className="w-4 h-4 shrink-0 text-text-muted" />
        </button>

        {/* Right side: Settings */}
        <div className="flex items-center shrink-0">
          <Menu>
          {({ open }) => (
            <>
              <MenuCloseHandler open={open} onClose={handleMenuClose} />
              <MenuButton
                aria-label="Settings"
                className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                onKeyDown={(e) => {
                  // Prevent all keyboard interactions from opening the menu
                  // Settings should only be opened via mouse click
                  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                <EllipsisHorizontalIcon className="w-[18px] h-[18px]" />
              </MenuButton>

              <MenuItems
                anchor="bottom end"
                transition
                className="z-50 w-72 origin-top-right rounded-lg bg-bg-secondary border border-border p-2 shadow-xl transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0 focus:outline-none select-none"
                onKeyDown={(e) => {
                  // Prevent arrow key navigation in settings popup
                  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                {/* Appearance Section */}
                <div className="px-3 py-1.5">
                  <button
                    onClick={() => setAppearanceExpanded(!appearanceExpanded)}
                    className="flex items-center justify-between w-full text-xs font-medium text-text-muted uppercase tracking-wide hover:text-text-secondary transition-colors"
                  >
                    <span>Appearance</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${appearanceExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {appearanceExpanded && (
                  <>
                {/* Glow Color Picker */}
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-text-primary mb-1">Glow</div>
                  <div className="text-xs text-text-muted mb-3">Choose your accent color</div>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {(Object.keys(GLOW_COLORS) as Array<keyof typeof GLOW_COLORS>).map((key, index, arr) => (
                      <button
                        key={key}
                        onClick={() => setGlowColor(key)}
                        aria-label={`Set glow color to ${GLOW_COLORS[key].name}`}
                        aria-pressed={glowColor === key}
                        className={`w-5 h-5 rounded-full transition-all ${
                          glowColor === key
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-secondary scale-110'
                            : 'hover:scale-110'
                        }`}
                        style={{
                          backgroundColor: GLOW_COLORS[key].value,
                          marginLeft: index === 0 && glowColor === key ? '4px' : undefined,
                          marginRight: index === arr.length - 1 && glowColor === key ? '4px' : undefined,
                        }}
                        title={GLOW_COLORS[key].name}
                      />
                    ))}
                    {/* Separator */}
                    <div className="w-px h-4 bg-white/20 mx-1" />
                    {/* Custom color button */}
                    <button
                      onClick={() => {
                        setTempCustomColor(customGlowColor);
                        setShowCustomColorDialog(true);
                      }}
                      aria-label="Set custom glow color"
                      aria-pressed={glowColor === 'custom'}
                      className={`w-5 h-5 rounded-full transition-all border border-border overflow-hidden ${
                        glowColor === 'custom'
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-secondary scale-110'
                          : 'hover:scale-110'
                      }`}
                      style={{
                        background: glowColor === 'custom' 
                          ? customGlowColor 
                          : 'conic-gradient(#f9e2af, #fab387, #f5c2e7, #cba6f7, #89b4fa, #a6e3a1, #f9e2af)',
                        marginLeft: glowColor === 'custom' ? '4px' : undefined,
                        marginRight: glowColor === 'custom' ? '4px' : undefined,
                      }}
                      title="Custom color"
                    />
                  </div>
                </div>
                {/* Background Effect Dropdown */}
                <div className="px-3 py-2">
                  <div className="text-left mb-2">
                    <div className="text-sm font-medium text-text-primary">Background Effect</div>
                    <div className="text-xs text-text-muted">Animated background style</div>
                  </div>
                  <div className="flex gap-1">
                    {(Object.keys(BACKGROUND_EFFECTS) as BackgroundEffect[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => setBackgroundEffect(key)}
                        className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
                          backgroundEffect === key
                            ? 'bg-bg-hover text-text-primary border border-border-light'
                            : 'bg-bg-tertiary text-text-muted hover:bg-bg-hover hover:text-text-primary border border-transparent'
                        }`}
                      >
                        {BACKGROUND_EFFECTS[key].name}
                      </button>
                    ))}
                  </div>
                  {/* Opacity Slider - only show when effect is not 'none' */}
                  {backgroundEffect !== 'none' && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-text-muted w-14">Visibility</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={backgroundEffectOpacity}
                        onChange={(e) => setBackgroundEffectOpacity(Number(e.target.value))}
                        className="flex-1 h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-text-muted"
                      />
                      <span className="text-xs text-text-muted w-8 text-right">{backgroundEffectOpacity}%</span>
                    </div>
                  )}
                </div>
                {/* Due Date Warning Days */}
                <div className="px-3 py-2">
                  <button
                    onClick={() => {
                      setTempWarningDays(dueDateWarningDays);
                      setShowDueDateWarningDialog(true);
                    }}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="text-left">
                      <div className="text-sm font-medium text-text-primary">Due Date Warning</div>
                      <div className="text-xs text-text-muted">Highlight upcoming due dates</div>
                    </div>
                    <span className="text-sm text-text-muted">{dueDateWarningDays} days</span>
                  </button>
                </div>
                {/* Favicon Toggle */}
                <div className="px-3 py-2">
                  <button
                    onClick={() => setShowFavicons(!showFavicons)}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="text-left">
                      <div className="text-sm font-medium text-text-primary">Link Favicons</div>
                      <div className="flex items-center gap-1 text-xs text-yellow-500">
                        <ExclamationTriangleIcon className="w-3 h-3 shrink-0" />
                        <span>Sends link domains to Google</span>
                      </div>
                    </div>
                    <div className={`w-9 h-5 rounded-full transition-colors ${showFavicons ? 'bg-glow/80' : 'bg-bg-tertiary'} relative shrink-0 ml-2`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${showFavicons ? 'left-[18px]' : 'left-0.5'}`} />
                    </div>
                  </button>
                </div>
                  </>
                )}
                <MenuSeparator className="my-2 h-px bg-border" />
                {/* Data Section */}
                <div className="px-3 py-1.5">
                  <button
                    onClick={() => setDataExpanded(!dataExpanded)}
                    className="flex items-center justify-between w-full text-xs font-medium text-text-muted uppercase tracking-wide hover:text-text-secondary transition-colors"
                  >
                    <span>Data</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${dataExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {dataExpanded && (
                  <>
                <MenuItem>
                  <button
                    onClick={handleImportClick}
                    className="group flex w-full items-start gap-3 rounded-md px-3 py-2 text-left data-focus:bg-bg-tertiary"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5 text-text-muted mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">Import Backup</span>
                      <span className="text-xs text-text-muted">Load from a JSON file</span>
                    </div>
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={() => trelloFileInputRef.current?.click()}
                    className="group flex w-full items-start gap-3 rounded-md px-3 py-2 text-left data-focus:bg-bg-tertiary"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5 text-text-muted mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">Import from Trello</span>
                      <span className="text-xs text-text-muted">In Trello: Menu → More → Print and export → Export as JSON</span>
                      <span className="text-xs text-text-muted mt-0.5">Imports: lists, cards, due dates, links. Not imported: labels, checklists, members.</span>
                    </div>
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={handleExportAll}
                    className="group flex w-full items-start gap-3 rounded-md px-3 py-2 text-left data-focus:bg-bg-tertiary"
                  >
                    <ArrowUpTrayIcon className="w-5 h-5 text-text-muted mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">Export Backup</span>
                      <span className="text-xs text-text-muted">Download as JSON file</span>
                    </div>
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={handleDeleteAll}
                    className="group flex w-full items-start gap-3 rounded-md px-3 py-2 text-left data-focus:bg-bg-tertiary"
                  >
                    <TrashIcon className="w-5 h-5 text-text-muted mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">Delete All Data</span>
                      <span className="text-xs text-text-muted">Remove all projects and cards</span>
                    </div>
                  </button>
                </MenuItem>
                  </>
                )}
                <MenuSeparator className="my-2 h-px bg-border" />
                {/* Help Section */}
                <div className="px-3 py-1.5">
                  <button
                    onClick={() => setHelpExpanded(!helpExpanded)}
                    className="flex items-center justify-between w-full text-xs font-medium text-text-muted uppercase tracking-wide hover:text-text-secondary transition-colors"
                  >
                    <span>Help</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${helpExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {helpExpanded && (
                  <>
                <MenuItem>
                  <button
                    onClick={() => setShowKeyboardShortcuts(true)}
                    className="group hidden sm:flex w-full items-start gap-3 rounded-md px-3 py-2 text-left data-focus:bg-bg-tertiary"
                  >
                    <CommandLineIcon className="w-5 h-5 text-text-muted mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">Keyboard Shortcuts</span>
                      <span className="text-xs text-text-muted">View all available shortcuts</span>
                    </div>
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={() => setHasSeenOnboarding(false)}
                    className="group flex w-full items-start gap-3 rounded-md px-3 py-2 text-left data-focus:bg-bg-tertiary"
                  >
                    <QuestionMarkCircleIcon className="w-5 h-5 text-text-muted mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">Show Onboarding</span>
                      <span className="text-xs text-text-muted">View the welcome guide again</span>
                    </div>
                  </button>
                </MenuItem>
                  </>
                )}
                <MenuSeparator className="my-2 h-px bg-border" />
                {/* Version */}
                <div className="px-3 py-2 text-center">
                  <a 
                    href="https://github.com/floschu/board" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#f9f9f5] hover:opacity-80 transition-opacity group"
                  >
                    <svg viewBox="0 0 32 32" className="w-4 h-4">
                      <defs>
                        <mask id="b-cutout-version">
                          <rect width="32" height="32" fill="white"/>
                          <text x="16" y="24" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="700" textAnchor="middle" fill="black">b</text>
                        </mask>
                      </defs>
                      <rect width="32" height="32" rx="6" fill="currentColor" className="text-text-muted group-hover:text-glow transition-colors" mask="url(#b-cutout-version)"/>
                    </svg>
                    board v{__APP_VERSION__}
                  </a>
                </div>
                {/* Identity — mirrors the flosch identity footer (florianschuster.at) */}
                <div className="flex justify-center px-3 pt-0.5 pb-1.5">
                  <a
                    href="https://florianschuster.at"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-baseline gap-2 text-[15px] uppercase text-[#f9f9f5] no-underline transition-opacity hover:opacity-80"
                    style={{
                      fontFamily:
                        '"Source Sans 3", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    <img
                      src={identityIcon}
                      alt=""
                      aria-hidden="true"
                      className="w-[1em] h-[1em] self-center"
                    />
                    <span>Florian Schuster</span>
                    <span className="text-[14px] normal-case text-[#8a8580]">Software</span>
                  </a>
                </div>
              </MenuItems>
            </>
          )}
        </Menu>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          className="hidden"
        />
        <input
          ref={trelloFileInputRef}
          type="file"
          accept=".json"
          onChange={handleTrelloFileImport}
          className="hidden"
        />
      </header>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={hideContextMenu}
        />
      )}

      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          danger={dialog.danger}
          onConfirm={handleConfirm}
          onCancel={hideConfirm}
        />
      )}

      {renameDialog && (
        <RenameDialog
          title={renameDialog.title}
          currentName={renameDialog.currentName}
          confirmLabel={renameDialog.confirmLabel}
          onConfirm={handleRenameConfirm}
          onCancel={hideRename}
        />
      )}

      {/* Due Date Warning Days Dialog */}
      <Transition appear show={showDueDateWarningDialog} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowDueDateWarningDialog(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-6">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-xs transform overflow-hidden rounded-2xl bg-bg-secondary border border-border p-6 shadow-2xl transition-all focus:outline-none">
                  <DialogTitle as="h3" className="text-lg font-semibold text-text-primary mb-2">
                    Due Date Warning
                  </DialogTitle>
                  <p className="text-sm text-text-muted mb-4">
                    Cards with due dates within this many days will be highlighted. Set to 0 to only highlight cards due today.
                  </p>
                  <input
                    ref={warningDaysInputRef}
                    type="number"
                    min="0"
                    value={tempWarningDays}
                    onChange={(e) => setTempWarningDays(Math.max(0, parseInt(e.target.value) || 0))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setDueDateWarningDays(tempWarningDays);
                        setShowDueDateWarningDialog(false);
                      } else if (e.key === 'Escape') {
                        setShowDueDateWarningDialog(false);
                      }
                    }}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm text-center focus:outline-none focus:ring-1 focus:ring-glow/50 focus:border-glow/50"
                    autoFocus
                  />
                  <div className="flex gap-3 justify-end mt-6">
                    <Button
                      onClick={() => setShowDueDateWarningDialog(false)}
                      className="px-4 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors text-sm font-medium focus:outline-none focus:ring-1 focus:ring-glow/50"
                    >
                      Cancel
                      <span className="ml-2 text-text-muted text-xs hidden sm:inline">Esc</span>
                    </Button>
                    <Button
                      onClick={() => {
                        setDueDateWarningDays(tempWarningDays);
                        setShowDueDateWarningDialog(false);
                      }}
                      className="px-4 py-2.5 rounded-xl font-medium text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-glow/50 bg-bg-tertiary hover:bg-bg-hover border border-border text-text-primary"
                    >
                      Save
                      <span className="ml-2 text-text-muted text-xs hidden sm:inline">Enter</span>
                    </Button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Custom Color Picker Dialog */}
      <Transition appear show={showCustomColorDialog} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowCustomColorDialog(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-6">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-xs transform overflow-hidden rounded-2xl bg-bg-secondary border border-border p-6 shadow-2xl transition-all focus:outline-none">
                  <DialogTitle as="h3" className="text-lg font-semibold text-text-primary mb-2">
                    Custom Glow Color
                  </DialogTitle>
                  <p className="text-sm text-text-muted mb-4">
                    Pick any color for your accent
                  </p>
                  <div className="flex flex-col items-center gap-4">
                    <input
                      type="color"
                      value={tempCustomColor}
                      onChange={(e) => setTempCustomColor(e.target.value)}
                      className="w-full h-24 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                      style={{ colorScheme: 'dark' }}
                    />
                    <div className="flex items-center gap-2 w-full">
                      <div 
                        className="w-8 h-8 rounded-lg border border-border shrink-0"
                        style={{ backgroundColor: tempCustomColor }}
                      />
                      <input
                        type="text"
                        value={tempCustomColor}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                            setTempCustomColor(value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && /^#[0-9A-Fa-f]{6}$/.test(tempCustomColor)) {
                            setCustomGlowColor(tempCustomColor);
                            setShowCustomColorDialog(false);
                          } else if (e.key === 'Escape') {
                            setShowCustomColorDialog(false);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-glow/50 focus:border-glow/50"
                        placeholder="#ff6b6b"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end mt-6">
                    <Button
                      onClick={() => setShowCustomColorDialog(false)}
                      className="px-4 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors text-sm font-medium focus:outline-none focus:ring-1 focus:ring-glow/50"
                    >
                      Cancel
                      <span className="ml-2 text-text-muted text-xs hidden sm:inline">Esc</span>
                    </Button>
                    <Button
                      onClick={() => {
                        if (/^#[0-9A-Fa-f]{6}$/.test(tempCustomColor)) {
                          setCustomGlowColor(tempCustomColor);
                          setShowCustomColorDialog(false);
                        }
                      }}
                      disabled={!/^#[0-9A-Fa-f]{6}$/.test(tempCustomColor)}
                      className="px-4 py-2.5 rounded-xl font-medium text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-glow/50 bg-bg-tertiary hover:bg-bg-hover border border-border text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                      <span className="ml-2 text-text-muted text-xs hidden sm:inline">Enter</span>
                    </Button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Mobile Board Switcher Dialog */}
      <BoardSwitcherDialog
        isOpen={showBoardSwitcher}
        onClose={() => setShowBoardSwitcher(false)}
        onAddProject={handleNewProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
      />
    </>
  );
}

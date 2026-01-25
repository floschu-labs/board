import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Catppuccin Mocha palette - 5 main accent colors
export const GLOW_COLORS = {
  yellow: { name: 'Yellow', value: '#f9e2af', rgb: '249, 226, 175' },
  peach: { name: 'Peach', value: '#fab387', rgb: '250, 179, 135' },
  pink: { name: 'Pink', value: '#f5c2e7', rgb: '245, 194, 231' },
  blue: { name: 'Blue', value: '#89b4fa', rgb: '137, 180, 250' },
  green: { name: 'Green', value: '#a6e3a1', rgb: '166, 227, 161' },
} as const;

// Background effect options
export const BACKGROUND_EFFECTS = {
  none: { name: 'None', description: 'No background effect' },
  aurora: { name: 'Aurora', description: 'Animated aurora borealis effect' },
  lightRays: { name: 'Light Rays', description: 'Radiating light rays effect' },
} as const;

export type GlowColorKey = keyof typeof GLOW_COLORS | 'custom';
export type BackgroundEffect = keyof typeof BACKGROUND_EFFECTS;

/**
 * Convert hex color to RGB string
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return '249, 226, 175'; // fallback to yellow
}

/**
 * Apply glow color to CSS variables
 */
function applyGlowColor(color: GlowColorKey, customColor?: string) {
  if (color === 'custom' && customColor) {
    document.documentElement.style.setProperty('--glow-color', customColor);
    document.documentElement.style.setProperty('--glow-rgb', hexToRgb(customColor));
  } else if (color !== 'custom' && color in GLOW_COLORS) {
    const colorData = GLOW_COLORS[color as keyof typeof GLOW_COLORS];
    document.documentElement.style.setProperty('--glow-color', colorData.value);
    document.documentElement.style.setProperty('--glow-rgb', colorData.rgb);
  }
}

/**
 * Get the current glow color hex value
 */
export function getGlowColorHex(glowColor: GlowColorKey, customGlowColor: string): string {
  if (glowColor === 'custom') {
    return customGlowColor;
  }
  if (glowColor in GLOW_COLORS) {
    return GLOW_COLORS[glowColor as keyof typeof GLOW_COLORS].value;
  }
  return GLOW_COLORS.yellow.value; // fallback
}

interface ThemeState {
  glowColor: GlowColorKey;
  customGlowColor: string;
  setGlowColor: (color: GlowColorKey) => void;
  setCustomGlowColor: (color: string) => void;
  dueDateWarningDays: number;
  setDueDateWarningDays: (days: number) => void;
  backgroundEffect: BackgroundEffect;
  setBackgroundEffect: (effect: BackgroundEffect) => void;
  backgroundEffectOpacity: number;
  setBackgroundEffectOpacity: (opacity: number) => void;
  showFavicons: boolean;
  setShowFavicons: (show: boolean) => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (seen: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      glowColor: 'yellow',
      customGlowColor: '#ff6b6b',
      setGlowColor: (color) => {
        set({ glowColor: color });
        applyGlowColor(color, get().customGlowColor);
      },
      setCustomGlowColor: (customColor) => {
        set({ customGlowColor: customColor, glowColor: 'custom' });
        applyGlowColor('custom', customColor);
      },
      dueDateWarningDays: 1,
      setDueDateWarningDays: (days) => set({ dueDateWarningDays: Math.max(0, days) }),
      backgroundEffect: 'aurora',
      setBackgroundEffect: (effect) => set({ backgroundEffect: effect }),
      backgroundEffectOpacity: 100,
      setBackgroundEffectOpacity: (opacity) => set({ backgroundEffectOpacity: Math.max(0, Math.min(100, opacity)) }),
      showFavicons: false,
      setShowFavicons: (show) => set({ showFavicons: show }),
      hasSeenOnboarding: false,
      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),
    }),
    {
      name: 'board-theme',
      onRehydrateStorage: () => (state) => {
        // Apply the glow color when rehydrating
        if (state?.glowColor) {
          applyGlowColor(state.glowColor, state.customGlowColor);
        }
        // Migrate old showAuroraBackground to backgroundEffect
        if (state && 'showAuroraBackground' in state) {
          const oldState = state as ThemeState & { showAuroraBackground?: boolean };
          if (oldState.showAuroraBackground === false) {
            state.backgroundEffect = 'none';
          } else {
            state.backgroundEffect = 'aurora';
          }
        }
      },
    }
  )
);

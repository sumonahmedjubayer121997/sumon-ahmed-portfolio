import { create } from 'zustand';
import { prefersReducedMotion } from './device';
import { prerendered } from './hydration';

export type NavTheme = 'light' | 'dark';
export type TransitionPhase = 'idle' | 'out' | 'in';

interface UIState {
  reducedMotion: boolean;
  navTheme: NavTheme;
  activeSection: string | null;
  menuOpen: boolean;
  transition: TransitionPhase;
  /** Active component in the AI Lab (shared by the WebGL scene, labels and pipeline). */
  aiActive: string | null;
  /** Lab mode: physics overlays + HUD (press D). */
  labMode: boolean;
  /** The command palette (⌘K / Ctrl+K). */
  paletteOpen: boolean;
  /** Interface sound (press M). Off by default; see lib/sound.ts. */
  soundOn: boolean;

  setReducedMotion: (value: boolean) => void;
  setNavTheme: (value: NavTheme) => void;
  setActiveSection: (value: string | null) => void;
  setMenuOpen: (value: boolean) => void;
  setTransition: (value: TransitionPhase) => void;
  setAiActive: (value: string | null) => void;
  setLabMode: (value: boolean) => void;
  setPaletteOpen: (value: boolean) => void;
  setSoundOn: (value: boolean) => void;
}

export const useUI = create<UIState>()((set) => ({
  // Hydration must match the prerendered (full-motion) markup; useReducedMotionSync applies the real value.
  reducedMotion: !prerendered && typeof window !== 'undefined' && prefersReducedMotion(),
  navTheme: 'light',
  activeSection: null,
  menuOpen: false,
  transition: 'idle',
  aiActive: null,
  labMode: false,
  paletteOpen: false,
  soundOn: false,

  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setNavTheme: (navTheme) => set({ navTheme }),
  setActiveSection: (activeSection) => set({ activeSection }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setTransition: (transition) => set({ transition }),
  setAiActive: (aiActive) => set({ aiActive }),
  setLabMode: (labMode) => set({ labMode }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setSoundOn: (soundOn) => set({ soundOn }),
}));

/** Non-reactive read for render loops. */
export const ui = () => useUI.getState();

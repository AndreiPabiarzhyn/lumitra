import { create } from 'zustand';

const RECENT_COLORS_KEY = 'lumitra-recent-colors';
const defaultRecentColors = ['#8f7cff', '#5ed7ff', '#f2f5ff', '#ff7bbf'];

const loadRecentColors = () => {
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? parsed.filter((color) => /^#[0-9a-fA-F]{6}$/.test(color)).slice(0, 8) : defaultRecentColors;
  } catch {
    return defaultRecentColors;
  }
};

const saveRecentColors = (colors: string[]) => {
  try {
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(colors));
  } catch {
    // Palette persistence is best-effort; drawing should never fail because storage is unavailable.
  }
};

type ColorState = {
  previousColor: string;
  recentColors: string[];
  pushRecentColor: (color: string) => void;
  setPreviousColor: (color: string) => void;
};

export const useColorStore = create<ColorState>((set) => ({
  previousColor: '#f2f5ff',
  recentColors: loadRecentColors(),
  pushRecentColor: (color) => set((state) => {
    const recentColors = [color, ...state.recentColors.filter((item) => item !== color)].slice(0, 8);
    saveRecentColors(recentColors);

    return {
      previousColor: state.recentColors[0] ?? state.previousColor,
      recentColors,
    };
  }),
  setPreviousColor: (previousColor) => set({ previousColor }),
}));

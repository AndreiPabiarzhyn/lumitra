import { create } from 'zustand';

export type ViewportState = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

type ViewportStore = ViewportState & {
  setViewport: (viewport: ViewportState) => void;
};

export const useViewportStore = create<ViewportStore>((set) => ({
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  setViewport: (viewport) => set(viewport),
}));

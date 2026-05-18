import { create } from 'zustand';

export type GradientType = 'linear' | 'radial' | 'angle' | 'diamond' | 'reflected';
export type GradientBlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';

export type GradientStop = {
  id: string;
  color: string;
  opacity: number;
  position: number;
};

export type GradientState = {
  type: GradientType;
  opacity: number;
  blendAmount: number;
  reverse: boolean;
  blendMode: GradientBlendMode;
  stops: GradientStop[];
  setType: (type: GradientType) => void;
  setOpacity: (opacity: number) => void;
  setBlendAmount: (blendAmount: number) => void;
  setReverse: (reverse: boolean) => void;
  setBlendMode: (blendMode: GradientBlendMode) => void;
  setStartColor: (color: string) => void;
  setEndColor: (color: string) => void;
  swapColors: () => void;
  addStop: () => void;
  updateStop: (id: string, stop: Partial<GradientStop>) => void;
  removeStop: (id: string) => void;
};

const createStopId = () => `stop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const useGradientStore = create<GradientState>((set) => ({
  type: 'linear',
  opacity: 1,
  blendAmount: 1,
  reverse: false,
  blendMode: 'normal',
  stops: [
    { id: 'stop-start', color: '#8f7cff', opacity: 1, position: 0 },
    { id: 'stop-end', color: '#5ed7ff', opacity: 1, position: 1 },
  ],
  setType: (type) => set({ type }),
  setOpacity: (opacity) => set({ opacity }),
  setBlendAmount: (blendAmount) => set({ blendAmount }),
  setReverse: (reverse) => set({ reverse }),
  setBlendMode: (blendMode) => set({ blendMode }),
  setStartColor: (color) => set((state) => {
    const end = state.stops[state.stops.length - 1]?.color ?? '#5ed7ff';

    return {
      opacity: 1,
      blendAmount: 1,
      reverse: false,
      blendMode: 'normal',
      stops: [
        { id: 'stop-start', color, opacity: 1, position: 0 },
        { id: 'stop-end', color: end, opacity: 1, position: 1 },
      ],
    };
  }),
  setEndColor: (color) => set((state) => {
    const start = state.stops[0]?.color ?? '#8f7cff';

    return {
      opacity: 1,
      blendAmount: 1,
      reverse: false,
      blendMode: 'normal',
      stops: [
        { id: 'stop-start', color: start, opacity: 1, position: 0 },
        { id: 'stop-end', color, opacity: 1, position: 1 },
      ],
    };
  }),
  swapColors: () => set((state) => ({
    stops: state.stops.map((stop) => ({ ...stop, position: 1 - stop.position })).sort((a, b) => a.position - b.position),
  })),
  addStop: () => set((state) => ({
    stops: [
      ...state.stops,
      { id: createStopId(), color: '#f2f5ff', opacity: 1, position: 0.5 },
    ].sort((a, b) => a.position - b.position),
  })),
  updateStop: (id, stop) => set((state) => ({
    stops: state.stops
      .map((item) => (item.id === id ? { ...item, ...stop } : item))
      .sort((a, b) => a.position - b.position),
  })),
  removeStop: (id) => set((state) => ({
    stops: state.stops.length <= 2 ? state.stops : state.stops.filter((stop) => stop.id !== id),
  })),
}));

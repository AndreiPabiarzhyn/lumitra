import { create } from 'zustand';

export type FillSettings = {
  tolerance: number;
  contiguous: boolean;
  antiAlias: boolean;
  expandEdges: number;
  sampleAllLayers: boolean;
  pixelPerfect: boolean;
};

type FillState = FillSettings & {
  setTolerance: (tolerance: number) => void;
  setContiguous: (contiguous: boolean) => void;
  setAntiAlias: (antiAlias: boolean) => void;
  setExpandEdges: (expandEdges: number) => void;
  setSampleAllLayers: (sampleAllLayers: boolean) => void;
  setPixelPerfect: (pixelPerfect: boolean) => void;
};

export const useFillStore = create<FillState>((set) => ({
  tolerance: 46,
  contiguous: true,
  antiAlias: true,
  expandEdges: 4,
  sampleAllLayers: false,
  pixelPerfect: false,
  setTolerance: (tolerance) => set({ tolerance }),
  setContiguous: (contiguous) => set({ contiguous }),
  setAntiAlias: (antiAlias) => set({ antiAlias }),
  setExpandEdges: (expandEdges) => set({ expandEdges }),
  setSampleAllLayers: (sampleAllLayers) => set({ sampleAllLayers }),
  setPixelPerfect: (pixelPerfect) => set({ pixelPerfect }),
}));

import { create } from 'zustand';

export type LayerRecord = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  alphaLocked: boolean;
  thumbnail: string;
  hasText?: boolean;
  width: number;
  height: number;
};

type LayerState = {
  layers: LayerRecord[];
  activeLayerId: string;
  createLayer: () => string;
  deleteLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  renameLayer: (id: string, name: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLocked: (id: string) => void;
  toggleLayerAlphaLocked: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  replaceLayers: (layers: LayerRecord[], activeLayerId: string) => void;
};

const createLayerId = () => `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const initialLayer: LayerRecord = {
  id: 'layer-background',
  name: 'Layer 1',
  visible: true,
  opacity: 1,
  locked: false,
  alphaLocked: false,
  thumbnail: '',
  width: 1920,
  height: 1080,
};

export const useLayerStore = create<LayerState>((set, get) => ({
  layers: [initialLayer],
  activeLayerId: initialLayer.id,
  createLayer: () => {
    const id = createLayerId();

    set((state) => ({
      layers: [
        ...state.layers,
        {
          id,
          name: `Layer ${state.layers.length + 1}`,
          visible: true,
          opacity: 1,
          locked: false,
          alphaLocked: false,
          thumbnail: '',
          width: state.layers[0]?.width ?? 1920,
          height: state.layers[0]?.height ?? 1080,
        },
      ],
      activeLayerId: id,
    }));

    return id;
  },
  deleteLayer: (id) => {
    const state = get();

    if (state.layers.length <= 1) {
      return;
    }

    const layers = state.layers.filter((layer) => layer.id !== id);
    const activeLayerId = state.activeLayerId === id
      ? layers[layers.length - 1].id
      : state.activeLayerId;

    set({ layers, activeLayerId });
  },
  setActiveLayer: (activeLayerId) => set({ activeLayerId }),
  renameLayer: (id, name) => set((state) => ({
    layers: state.layers.map((layer) => (
      layer.id === id ? { ...layer, name: name.trim() || layer.name } : layer
    )),
  })),
  toggleLayerVisibility: (id) => set((state) => ({
    layers: state.layers.map((layer) => (
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    )),
  })),
  toggleLayerLocked: (id) => set((state) => ({
    layers: state.layers.map((layer) => (
      layer.id === id ? { ...layer, locked: !layer.locked } : layer
    )),
  })),
  toggleLayerAlphaLocked: (id) => set((state) => ({
    layers: state.layers.map((layer) => (
      layer.id === id ? { ...layer, alphaLocked: !layer.alphaLocked } : layer
    )),
  })),
  setLayerOpacity: (id, opacity) => set((state) => ({
    layers: state.layers.map((layer) => (
      layer.id === id ? { ...layer, opacity } : layer
    )),
  })),
  replaceLayers: (layers, activeLayerId) => set({ layers, activeLayerId }),
}));

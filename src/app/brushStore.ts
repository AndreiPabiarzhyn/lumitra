import { create } from 'zustand';
import { BrushPreset, BrushSettings } from '../engine/brush/BrushSettings';
import { brushPresets } from '../engine/brush/BrushPresets';

export type { BrushPreset, BrushSettings };
export { brushPresets };

type BrushState = BrushSettings & {
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  setOpacity: (opacity: number) => void;
  setStabilizer: (stabilizer: number) => void;
  setPreset: (preset: BrushPreset) => void;
  replaceSettings: (settings: BrushSettings) => void;
};

export const useBrushStore = create<BrushState>((set) => ({
  color: '#8f7cff',
  size: 10,
  opacity: 1,
  stabilizer: 0.25,
  spacing: 0.18,
  softness: 0,
  flow: 1,
  density: 1,
  buildup: 1,
  scatter: 0,
  nibAngle: -38,
  widthVariation: 0.5,
  taper: 0.4,
  inkDensity: 1,
  presetId: 'round',
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),
  setOpacity: (opacity) => set({ opacity }),
  setStabilizer: (stabilizer) => set({ stabilizer }),
  setPreset: (preset) => set({
    presetId: preset.id,
    size: preset.size,
    opacity: preset.opacity,
    stabilizer: preset.stabilizer,
    spacing: preset.spacing,
    softness: preset.softness,
    flow: preset.flow,
    density: preset.density,
    buildup: preset.buildup,
    scatter: preset.scatter,
    nibAngle: preset.nibAngle,
    widthVariation: preset.widthVariation,
    taper: preset.taper,
    inkDensity: preset.inkDensity,
  }),
  replaceSettings: (settings) => set(settings),
}));

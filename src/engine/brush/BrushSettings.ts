export type BrushPresetId =
  | 'round'
  | 'sketchy'
  | 'pencil'
  | 'ink'
  | 'marker'
  | 'airbrush'
  | 'pixel'
  | 'calligraphy';

export type BrushSettings = {
  color: string;
  size: number;
  opacity: number;
  stabilizer: number;
  spacing: number;
  softness: number;
  flow?: number;
  density?: number;
  buildup?: number;
  scatter?: number;
  nibAngle?: number;
  widthVariation?: number;
  taper?: number;
  inkDensity?: number;
  presetId: BrushPresetId;
};

export type BrushPreset = Omit<BrushSettings, 'color' | 'presetId'> & {
  id: BrushPresetId;
  name: string;
};

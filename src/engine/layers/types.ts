export type LayerTransform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

export type LayerSnapshot = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  alphaLocked: boolean;
  width: number;
  height: number;
  thumbnail: string;
  transform: LayerTransform;
  dataUrl: string;
};

export type LayerCreateOptions = {
  id: string;
  name: string;
  width: number;
  height: number;
  visible?: boolean;
  opacity?: number;
  locked?: boolean;
  alphaLocked?: boolean;
  transform?: LayerTransform;
};

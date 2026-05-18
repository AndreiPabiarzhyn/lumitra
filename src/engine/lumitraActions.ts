export type LumitraActions = {
  newProject: (width: number, height: number) => Promise<void>;
  centerCanvas: () => Promise<void>;
  zoomCanvas: (direction: 'in' | 'out') => Promise<void>;
  createLayer: () => Promise<void>;
  duplicateLayer: () => Promise<void>;
  clearLayer: () => Promise<void>;
  deleteLayer: (id: string) => Promise<void>;
  moveLayer: (id: string, direction: 'up' | 'down') => Promise<void>;
  saveProject: () => Promise<void>;
  openProject: () => Promise<void>;
  importImage: () => Promise<void>;
  exportPng: () => Promise<void>;
  restoreAutosave: () => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};

declare global {
  interface Window {
    lumitraActions?: LumitraActions;
  }
}

export {};

import { create } from 'zustand';

export type ToolId =
  | 'brush'
  | 'mirror-brush'
  | 'eraser'
  | 'fill'
  | 'gradient'
  | 'eyedropper'
  | 'text'
  | 'move'
  | 'smudge'
  | 'hand'
  | 'transform'
  | 'line'
  | 'rectangle'
  | 'ellipse';

type ToolState = {
  activeTool: ToolId;
  setActiveTool: (tool: ToolId) => void;
};

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'brush',
  setActiveTool: (activeTool) => set({ activeTool }),
}));

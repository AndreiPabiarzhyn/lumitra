import { create } from 'zustand';

type ProjectAction =
  | { type: 'save' }
  | { type: 'open' }
  | { type: 'import-image' }
  | { type: 'export-png' }
  | { type: 'restore-autosave' }
  | { type: 'undo' }
  | { type: 'redo' };

type ProjectState = {
  pendingAction: ProjectAction | null;
  status: string;
  requestSave: () => void;
  requestOpen: () => void;
  requestImportImage: () => void;
  requestExportPng: () => void;
  requestRestoreAutosave: () => void;
  requestUndo: () => void;
  requestRedo: () => void;
  setStatus: (status: string) => void;
  consumeAction: () => ProjectAction | null;
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  pendingAction: null,
  status: 'Ready',
  requestSave: () => set({ pendingAction: { type: 'save' }, status: 'Saving project' }),
  requestOpen: () => set({ pendingAction: { type: 'open' }, status: 'Opening project' }),
  requestImportImage: () => set({ pendingAction: { type: 'import-image' }, status: 'Importing image' }),
  requestExportPng: () => set({ pendingAction: { type: 'export-png' }, status: 'Exporting PNG' }),
  requestRestoreAutosave: () => set({ pendingAction: { type: 'restore-autosave' }, status: 'Restoring autosave' }),
  requestUndo: () => set({ pendingAction: { type: 'undo' }, status: 'Undo' }),
  requestRedo: () => set({ pendingAction: { type: 'redo' }, status: 'Redo' }),
  setStatus: (status) => set({ status }),
  consumeAction: () => {
    const action = get().pendingAction;
    set({ pendingAction: null });
    return action;
  },
}));

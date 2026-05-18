import { useLayerStore } from '../app/layerStore';
import { useProjectStore } from '../app/projectStore';
import { useToolStore } from '../app/toolStore';
import { useViewportStore } from '../app/viewportStore';

export function StatusBar() {
  const activeTool = useToolStore((state) => state.activeTool);
  const scale = useViewportStore((state) => state.scale);
  const layers = useLayerStore((state) => state.layers);
  const activeLayerId = useLayerStore((state) => state.activeLayerId);
  const activeLayer = layers.find((layer) => layer.id === activeLayerId);
  const projectStatus = useProjectStore((state) => state.status);
  const isDirty = useProjectStore((state) => state.isDirty);
  const lastSavedAt = useProjectStore((state) => state.lastSavedAt);

  return (
    <div className="status-bar">
      <span>{activeTool}</span>
      <span>{Math.round(scale * 100)}%</span>
      <span>{activeLayer?.name ?? 'No layer'}</span>
      <span className={isDirty ? 'status-unsaved' : 'status-saved'}>{isDirty ? 'Unsaved changes' : lastSavedAt ? `Saved ${lastSavedAt}` : 'Saved'}</span>
      <span>{projectStatus}</span>
    </div>
  );
}

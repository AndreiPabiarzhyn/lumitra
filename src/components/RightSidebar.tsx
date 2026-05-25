import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eraser,
  Eye,
  EyeOff,
  FilePlus2,
  FolderOpen,
  GripVertical,
  ImageDown,
  ImagePlus,
  Lock,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  SquareDashedBottom,
  Trash2,
  Type,
  Undo2,
  Unlock,
} from 'lucide-react';
import { useState } from 'react';
import type { DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { useFillStore } from '../app/fillStore';
import { useLayerStore } from '../app/layerStore';
import { useProjectStore } from '../app/projectStore';
import { useSmudgeStore } from '../app/smudgeStore';
import { useToolStore } from '../app/toolStore';
import { ColorPanel } from './ColorPanel';

export function RightSidebar() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(1920);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; placement: 'above' | 'below' } | null>(null);
  const layers = useLayerStore((state) => state.layers);
  const activeLayerId = useLayerStore((state) => state.activeLayerId);
  const createLayer = useLayerStore((state) => state.createLayer);
  const deleteLayer = useLayerStore((state) => state.deleteLayer);
  const setActiveLayer = useLayerStore((state) => state.setActiveLayer);
  const renameLayer = useLayerStore((state) => state.renameLayer);
  const toggleLayerVisibility = useLayerStore((state) => state.toggleLayerVisibility);
  const toggleLayerLocked = useLayerStore((state) => state.toggleLayerLocked);
  const toggleLayerAlphaLocked = useLayerStore((state) => state.toggleLayerAlphaLocked);
  const setLayerOpacity = useLayerStore((state) => state.setLayerOpacity);
  const requestSave = useProjectStore((state) => state.requestSave);
  const requestOpen = useProjectStore((state) => state.requestOpen);
  const requestImportImage = useProjectStore((state) => state.requestImportImage);
  const requestExportPng = useProjectStore((state) => state.requestExportPng);
  const requestRestoreAutosave = useProjectStore((state) => state.requestRestoreAutosave);
  const requestUndo = useProjectStore((state) => state.requestUndo);
  const requestRedo = useProjectStore((state) => state.requestRedo);
  const activeLayer = layers.find((layer) => layer.id === activeLayerId);
  const activeTool = useToolStore((state) => state.activeTool);
  const fill = useFillStore();
  const smudge = useSmudgeStore();
  const visibleLayers = [...layers].reverse();

  const updateDropTarget = (event: DragEvent<HTMLElement>, layerId: string) => {
    const targetLayer = layers.find((layer) => layer.id === layerId);

    if (!dragLayerId || dragLayerId === layerId || targetLayer?.locked) {
      setDropTarget(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY < bounds.top + bounds.height / 2 ? 'above' : 'below';
    setDropTarget({ id: layerId, placement });
  };

  const dropLayer = (event: DragEvent<HTMLElement>, layerId: string) => {
    event.preventDefault();
    const targetLayer = layers.find((layer) => layer.id === layerId);

    if (targetLayer?.locked) {
      setDragLayerId(null);
      setDropTarget(null);
      return;
    }

    if (dragLayerId && dragLayerId !== layerId) {
      const placement = dropTarget?.id === layerId ? dropTarget.placement : 'above';
      void window.lumitraActions?.reorderLayer(dragLayerId, layerId, placement);
    }

    setDragLayerId(null);
    setDropTarget(null);
  };

  const createNewProject = () => {
    void window.lumitraActions?.newProject(canvasWidth, canvasHeight);
    setIsNewProjectOpen(false);
  };

  const newProjectModal = isNewProjectOpen && typeof document !== 'undefined'
    ? createPortal(
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsNewProjectOpen(false)}>
        <div className="new-project-modal" role="dialog" aria-modal="true" aria-label="New project" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <span>New Project</span>
            <strong>{canvasWidth}x{canvasHeight}</strong>
          </div>
          <div className="preset-grid">
            {[
              [512, 512],
              [1024, 1024],
              [1920, 1080],
              [2048, 2048],
            ].map(([width, height]) => (
              <button
                key={`${width}x${height}`}
                type="button"
                className={canvasWidth === width && canvasHeight === height ? 'is-active' : ''}
                onClick={() => {
                  setCanvasWidth(width);
                  setCanvasHeight(height);
                }}
              >
                {width}x{height}
              </button>
            ))}
          </div>
          <div className="size-inputs">
            <label>
              Width
              <input min="64" max="8192" type="number" value={canvasWidth} onChange={(event) => setCanvasWidth(Number(event.target.value))} />
            </label>
            <label>
              Height
              <input min="64" max="8192" type="number" value={canvasHeight} onChange={(event) => setCanvasHeight(Number(event.target.value))} />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={() => setIsNewProjectOpen(false)}>Cancel</button>
            <button type="button" onClick={createNewProject}>Create</button>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
    <aside className="right-sidebar" aria-label="Brush properties">
      <section className="sidebar-window sidebar-actions" aria-label="Project actions">
        <div className="panel-header">
          <span className="brand-lockup">
            <img src="/lumitra-icon.svg" alt="" />
            Lumitra
          </span>
          <strong>Studio</strong>
        </div>

        <div className="primary-save-actions">
          <button
            type="button"
            className="save-project-action"
            title="Save project"
            aria-label="Save project"
            onClick={() => {
              void (window.lumitraActions?.saveProject() ?? Promise.resolve(requestSave()));
            }}
          >
            <Save size={16} />
            <span>Save Project</span>
          </button>
          <button
            type="button"
            className="export-png-action"
            title="Save image as PNG"
            aria-label="Save image as PNG"
            onClick={() => {
              void (window.lumitraActions?.exportPng() ?? Promise.resolve(requestExportPng()));
            }}
          >
            <ImageDown size={16} />
            <span>Save PNG</span>
          </button>
        </div>

        <div className="project-actions">
          <button
            type="button"
            title="New project"
            aria-label="New project"
            onClick={() => setIsNewProjectOpen(true)}
          >
            <FilePlus2 size={16} />
          </button>
          <button
            type="button"
            title="Open project"
            aria-label="Open project"
            onClick={() => {
              void (window.lumitraActions?.openProject() ?? Promise.resolve(requestOpen()));
            }}
          >
            <FolderOpen size={16} />
          </button>
          <button
            type="button"
            title="Import image"
            aria-label="Import image"
            onClick={() => {
              void (window.lumitraActions?.importImage() ?? Promise.resolve(requestImportImage()));
            }}
          >
            <ImagePlus size={16} />
          </button>
          <button
            type="button"
            title="Restore autosave"
            aria-label="Restore autosave"
            onClick={() => {
              void (window.lumitraActions?.restoreAutosave() ?? Promise.resolve(requestRestoreAutosave()));
            }}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            title="Undo"
            aria-label="Undo"
            onClick={() => {
              void (window.lumitraActions?.undo() ?? Promise.resolve(requestUndo()));
            }}
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            title="Redo"
            aria-label="Redo"
            onClick={() => {
              void (window.lumitraActions?.redo() ?? Promise.resolve(requestRedo()));
            }}
          >
            <Redo2 size={16} />
          </button>
        </div>
      </section>

      <section className="sidebar-window sidebar-settings" aria-label="Tool settings">
        <div className="section-title">
          <span>Color</span>
        </div>
        <ColorPanel />

        {activeTool === 'fill' && (
          <div className="tool-settings-block">
            <div className="section-title">
              <span>Fill</span>
            </div>
            <label className="control-row compact">
              <span>Tolerance</span>
              <output>{fill.tolerance}</output>
              <input min="0" max="100" step="1" type="range" value={fill.tolerance} onChange={(event) => fill.setTolerance(Number(event.target.value))} />
            </label>
            <label className="control-row compact">
              <span>Expand edges</span>
              <output>{fill.expandEdges}px</output>
              <input min="0" max="10" step="1" type="range" value={fill.expandEdges} onChange={(event) => fill.setExpandEdges(Number(event.target.value))} />
            </label>
            <div className="toggle-grid">
              <label>
                <input type="checkbox" checked={fill.contiguous} onChange={(event) => fill.setContiguous(event.target.checked)} />
                Contiguous
              </label>
              <label>
                <input type="checkbox" checked={fill.antiAlias} onChange={(event) => fill.setAntiAlias(event.target.checked)} />
                Anti-alias
              </label>
              <label>
                <input type="checkbox" checked={fill.sampleAllLayers} onChange={(event) => fill.setSampleAllLayers(event.target.checked)} />
                Sample all
              </label>
              <label>
                <input type="checkbox" checked={fill.pixelPerfect} onChange={(event) => fill.setPixelPerfect(event.target.checked)} />
                Pixel perfect
              </label>
            </div>
          </div>
        )}

        {activeTool === 'smudge' && (
          <div className="tool-settings-block">
            <div className="section-title">
              <span>Smudge</span>
            </div>
            <label className="control-row compact">
              <span>Strength</span>
              <output>{Math.round(smudge.strength * 100)}%</output>
              <input min="0.05" max="1" step="0.05" type="range" value={smudge.strength} onChange={(event) => smudge.setStrength(Number(event.target.value))} />
            </label>
            <label className="control-row compact">
              <span>Softness</span>
              <output>{Math.round(smudge.softness * 100)}%</output>
              <input min="0" max="1" step="0.05" type="range" value={smudge.softness} onChange={(event) => smudge.setSoftness(Number(event.target.value))} />
            </label>
            <label className="control-row compact">
              <span>Amount</span>
              <output>{Math.round(smudge.amount * 100)}%</output>
              <input min="0.05" max="1" step="0.05" type="range" value={smudge.amount} onChange={(event) => smudge.setAmount(Number(event.target.value))} />
            </label>
            <label className="control-row compact">
              <span>Spacing</span>
              <output>{Math.round(smudge.spacing * 100)}%</output>
              <input min="0.05" max="0.6" step="0.05" type="range" value={smudge.spacing} onChange={(event) => smudge.setSpacing(Number(event.target.value))} />
            </label>
          </div>
        )}

      </section>

      <section className="sidebar-window layers-panel" aria-label="Layers">
        <div className="section-title">
          <span>Layers</span>
          <button
            type="button"
            title="Create layer"
            aria-label="Create layer"
            onClick={() => {
              void (window.lumitraActions?.createLayer() ?? Promise.resolve(createLayer()));
            }}
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="layer-actions">
          <button
            type="button"
            title="Duplicate active layer"
            aria-label="Duplicate active layer"
            disabled={activeLayer?.locked}
            onClick={() => {
              void window.lumitraActions?.duplicateLayer();
            }}
          >
            <Copy size={14} />
            Duplicate
          </button>
          <button
            type="button"
            title="Clear active layer"
            aria-label="Clear active layer"
            disabled={activeLayer?.locked}
            onClick={() => {
              void window.lumitraActions?.clearLayer();
            }}
          >
            <Eraser size={14} />
            Clear
          </button>
        </div>

        <div className="layer-list">
          {visibleLayers.map((layer) => (
            <div
              key={layer.id}
              className={[
                'layer-item',
                layer.hasText ? 'is-text-layer' : 'is-raster-layer',
                layer.locked ? 'is-locked' : '',
                layer.alphaLocked ? 'is-alpha-locked' : '',
                activeLayerId === layer.id ? 'is-active' : '',
                dragLayerId === layer.id ? 'is-dragging' : '',
                dropTarget?.id === layer.id ? `is-drop-${dropTarget.placement}` : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setActiveLayer(layer.id)}
              onDragOver={(event) => {
                if (!dragLayerId || layer.locked) {
                  return;
                }

                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                updateDropTarget(event, layer.id);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDropTarget((target) => (target?.id === layer.id ? null : target));
                }
              }}
              onDrop={(event) => dropLayer(event, layer.id)}
              onDragEnd={() => {
                setDragLayerId(null);
                setDropTarget(null);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActiveLayer(layer.id);
                }
              }}
            >
              <span
                className="layer-drag-handle"
                draggable={!layer.locked}
                title={layer.locked ? 'Layer locked' : 'Drag to reorder'}
                aria-label={layer.locked ? 'Layer locked' : `Drag ${layer.name} to reorder`}
                onClick={(event) => event.stopPropagation()}
                onDragStart={(event) => {
                  if (layer.locked) {
                    event.preventDefault();
                    return;
                  }

                  setDragLayerId(layer.id);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', layer.id);
                }}
              >
                {layer.locked ? <Lock size={13} /> : <GripVertical size={14} />}
              </span>
              <span className="layer-preview">
                {layer.thumbnail && <img src={layer.thumbnail} alt="" />}
                {layer.hasText && (
                  <span className="layer-text-badge" title="Text layer" aria-label="Text layer">
                    <Type size={11} />
                  </span>
                )}
              </span>
              <span className="layer-info">
                <input
                  className="layer-name-input"
                  aria-label={`${layer.name} name`}
                  value={layer.name}
                  disabled={layer.locked}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  onChange={(event) => renameLayer(layer.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                    event.stopPropagation();
                  }}
                />
                <span className="layer-meta">
                  {layer.hasText ? 'Text' : 'Raster'} · {Math.round(layer.opacity * 100)}%
                </span>
                <input
                  aria-label={`${layer.name} opacity`}
                  min="0"
                  max="1"
                  step="0.05"
                  type="range"
                  value={layer.opacity}
                  disabled={layer.locked}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  onDragStart={(event) => event.preventDefault()}
                  onChange={(event) => {
                    setLayerOpacity(layer.id, Number(event.target.value));
                  }}
                />
              </span>
              <span className="layer-controls">
                <span
                  role="button"
                  tabIndex={0}
                  title="Move layer up"
                  aria-disabled={layer.locked}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (layer.locked) {
                      return;
                    }
                    void window.lumitraActions?.moveLayer(layer.id, 'up');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      if (layer.locked) {
                        return;
                      }
                      void window.lumitraActions?.moveLayer(layer.id, 'up');
                    }
                  }}
                >
                  <ChevronUp size={14} />
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  title="Move layer down"
                  aria-disabled={layer.locked}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (layer.locked) {
                      return;
                    }
                    void window.lumitraActions?.moveLayer(layer.id, 'down');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      if (layer.locked) {
                        return;
                      }
                      void window.lumitraActions?.moveLayer(layer.id, 'down');
                    }
                  }}
                >
                  <ChevronDown size={14} />
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }
                  }}
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </span>
                <span
                  className={`alpha-lock-control ${layer.alphaLocked ? 'is-on' : 'is-off'}`}
                  role="button"
                  tabIndex={0}
                  title="Paint only existing pixels"
                  aria-label={`${layer.name}: Paint only existing pixels ${layer.alphaLocked ? 'on' : 'off'}`}
                  aria-disabled={layer.locked}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (layer.locked) {
                      return;
                    }
                    toggleLayerAlphaLocked(layer.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      if (layer.locked) {
                        return;
                      }
                      toggleLayerAlphaLocked(layer.id);
                    }
                  }}
                >
                  <SquareDashedBottom size={14} />
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleLayerLocked(layer.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleLayerLocked(layer.id);
                    }
                  }}
                >
                  {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </span>
                <span
                  className="layer-delete-control"
                  role="button"
                  tabIndex={0}
                  title="Delete layer"
                  aria-disabled={layer.locked}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (window.confirm('Сохрани проект перед удалением слоя. Удалить слой?')) {
                      void (window.lumitraActions?.deleteLayer(layer.id) ?? Promise.resolve(deleteLayer(layer.id)));
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      if (window.confirm('Сохрани проект перед удалением слоя. Удалить слой?')) {
                        void (window.lumitraActions?.deleteLayer(layer.id) ?? Promise.resolve(deleteLayer(layer.id)));
                      }
                    }
                  }}
                >
                  <Trash2 size={14} />
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </aside>
    {newProjectModal}
    </>
  );
}

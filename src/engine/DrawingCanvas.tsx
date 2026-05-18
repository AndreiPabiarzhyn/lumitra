import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { useBrushStore } from '../app/brushStore';
import { useFillStore } from '../app/fillStore';
import { useGradientStore } from '../app/gradientStore';
import { useLayerStore } from '../app/layerStore';
import { useProjectStore } from '../app/projectStore';
import { useSmudgeStore } from '../app/smudgeStore';
import { useTextStore } from '../app/textStore';
import { useToastStore } from '../app/toastStore';
import { useToolStore } from '../app/toolStore';
import { useViewportStore } from '../app/viewportStore';
import { HistoryManager } from './history/HistoryManager';
import './lumitraActions';
import { LayerManager } from './layers/LayerManager';
import { LayerRenderer } from './layers/LayerRenderer';
import { loadAutosave, saveAutosave } from './project/AutosaveStore';
import {
  pickImageFile,
  pickProjectFile,
  readFileAsText,
  saveBlob,
} from './project/download';
import { ProjectService } from './project/ProjectService';
import { LumitraProject } from './project/types';
import { TextManager } from './text/TextManager';
import { ToolManager } from './tools/ToolManager';
import { ToolPointer } from './tools/Tool';
import { ViewportController } from './viewport/ViewportController';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

const getCenteredViewport = (width: number, height: number) => {
  const leftGutter = 96;
  const rightGutter = 368;
  const topGutter = 88;
  const bottomGutter = 74;
  const workspaceWidth = Math.max(320, window.innerWidth - leftGutter - rightGutter);
  const workspaceHeight = Math.max(260, window.innerHeight - topGutter - bottomGutter);
  const scale = Math.max(0.08, Math.min(1, workspaceWidth / width, workspaceHeight / height) * 0.92);

  return {
    x: leftGutter + (workspaceWidth - width * scale) / 2,
    y: topGutter + (workspaceHeight - height * scale) / 2,
    scale,
    rotation: 0,
  };
};

const getScreenPoint = (event: PointerEvent | WheelEvent, canvas: HTMLCanvasElement) => {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
};

const toToolPointer = (
  event: PointerEvent,
  canvas: HTMLCanvasElement,
  viewport: ViewportController,
): ToolPointer => {
  const screen = getScreenPoint(event, canvas);
  const world = viewport.screenToWorld(screen.x, screen.y);

  return {
    x: world.x,
    y: world.y,
    screenX: screen.x,
    screenY: screen.y,
    pressure: event.pressure || 1,
    time: event.timeStamp || performance.now(),
    shiftKey: event.shiftKey,
    button: event.button,
  };
};

export function DrawingCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const toolManagerRef = useRef<ToolManager | null>(null);
  const layerManagerRef = useRef<LayerManager | null>(null);
  const layerRendererRef = useRef<LayerRenderer | null>(null);
  const viewportRef = useRef<ViewportController | null>(null);
  const historyRef = useRef<HistoryManager | null>(null);
  const projectServiceRef = useRef<ProjectService | null>(null);
  const textManagerRef = useRef<TextManager | null>(null);
  const brushRef = useRef(useBrushStore.getState());
  const fillRef = useRef(useFillStore.getState());
  const gradientRef = useRef(useGradientStore.getState());
  const smudgeRef = useRef(useSmudgeStore.getState());
  const textSettingsRef = useRef(useTextStore.getState());
  const layerStateRef = useRef(useLayerStore.getState());
  const isTextEditingRef = useRef(false);

  useEffect(() => useBrushStore.subscribe((brush) => {
    brushRef.current = brush;
  }), []);

  useEffect(() => useFillStore.subscribe((fill) => {
    fillRef.current = fill;
  }), []);

  useEffect(() => useGradientStore.subscribe((gradient) => {
    gradientRef.current = gradient;
  }), []);

  useEffect(() => useSmudgeStore.subscribe((smudge) => {
    smudgeRef.current = smudge;
  }), []);

  useEffect(() => useTextStore.subscribe((text) => {
    textSettingsRef.current = text;
    textManagerRef.current?.applySettingsToActive(text, (id) => layerManagerRef.current?.getLayer(id));
  }), []);

  useEffect(() => useLayerStore.subscribe((layers) => {
    layerStateRef.current = layers;
    layerManagerRef.current?.sync(layers.layers, layers.activeLayerId);
    layerRendererRef.current?.sync(layerManagerRef.current?.getLayers() ?? []);
    window.dispatchEvent(new CustomEvent('lumitra-active-layer-changed', { detail: layers.activeLayerId }));
  }), []);

  useEffect(() => useToolStore.subscribe((state) => {
    toolManagerRef.current?.setActiveTool(state.activeTool);
  }), []);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return undefined;
    }

    const app = new Application();
    let destroyed = false;
    let cleanupRuntime: (() => void) | null = null;

    const syncLayerStoreFromManager = () => {
      const manager = layerManagerRef.current;

      if (!manager) {
        return;
      }

      const textManager = textManagerRef.current;
      const records = manager.toRecords().map((record) => ({
        ...record,
        hasText: textManager?.hasTextInLayer(record.id) ?? false,
      }));
      useLayerStore.getState().replaceLayers(records, manager.getActiveLayerId());
    };

    const resize = () => {
      app.renderer.resize(window.innerWidth, window.innerHeight);
    };

    const createProject = (): LumitraProject | null => {
      const manager = layerManagerRef.current;
      const service = projectServiceRef.current;
      const viewport = viewportRef.current;

      if (!manager || !service || !viewport) {
        return null;
      }

      return service.createProject(
        manager.getActiveLayerId(),
        {
          color: brushRef.current.color,
          size: brushRef.current.size,
          opacity: brushRef.current.opacity,
          stabilizer: brushRef.current.stabilizer,
          spacing: brushRef.current.spacing,
          softness: brushRef.current.softness,
          presetId: brushRef.current.presetId,
        },
        gradientRef.current,
        viewport.getState(),
      );
    };

    const notify = (message: string, tone: 'info' | 'success' | 'warning' = 'info') => {
      useProjectStore.getState().setStatus(message);
      useToastStore.getState().pushToast(message, tone);
    };

    let autosaveDebounce: number | null = null;

    const autosaveNow = async () => {
      const project = createProject();

      if (project) {
        await saveAutosave(project);
      }
    };

    const scheduleAutosave = () => {
      if (autosaveDebounce !== null) {
        window.clearTimeout(autosaveDebounce);
      }

      autosaveDebounce = window.setTimeout(() => {
        autosaveDebounce = null;
        void autosaveNow();
      }, 900);
    };

    const markDirty = (message?: string) => {
      useProjectStore.getState().markDirty();
      scheduleAutosave();
      if (message) {
        notify(message);
      }
    };

    const restoreProject = async (project: LumitraProject) => {
      const manager = layerManagerRef.current;
      const renderer = layerRendererRef.current;

      if (!manager || !renderer || project.format !== 'lumitra-project') {
        return;
      }

      useBrushStore.getState().replaceSettings(project.brush);
      if (project.gradient) {
        useGradientStore.setState({
          type: project.gradient.type,
          opacity: project.gradient.opacity,
          blendAmount: project.gradient.blendAmount,
          reverse: project.gradient.reverse,
          blendMode: project.gradient.blendMode,
          stops: project.gradient.stops,
        });
      }
      textManagerRef.current?.restore(project.textObjects ?? []);
      await manager.restoreSnapshots(project.layers, project.activeLayerId);
      manager.getLayers().forEach((layer) => {
        if ((project.textObjects ?? []).some((object) => object.layerId === layer.id)) {
          textManagerRef.current?.renderLayer(layer);
        }
      });
      renderer.setCanvasFrame(project.metadata.width, project.metadata.height);
      renderer.sync(manager.getLayers());
      useLayerStore.getState().replaceLayers(manager.toRecords(), project.activeLayerId);
      viewportRef.current?.setState(project.viewport ?? getCenteredViewport(project.metadata.width, project.metadata.height));
      historyRef.current?.clear();
      historyRef.current?.capture();
    };

    const newProject = async (width: number, height: number) => {
      const manager = layerManagerRef.current;
      const renderer = layerRendererRef.current;
      const viewport = viewportRef.current;
      const history = historyRef.current;

      if (!manager || !renderer || !viewport || !history) {
        return;
      }

      if (!window.confirm('Сохрани проект перед созданием нового файла. Создать новый файл?')) {
        useProjectStore.getState().setStatus('New project cancelled');
        return;
      }

      manager.reset(width, height);
      textManagerRef.current?.restore([]);
      renderer.setCanvasFrame(width, height);
      renderer.sync(manager.getLayers());
      viewport.setState(getCenteredViewport(width, height));
      history.clear();
      history.capture();
      syncLayerStoreFromManager();
      useProjectStore.getState().markSaved();
      notify(`New project ${width}x${height}`, 'success');
    };

    const centerCanvas = async () => {
      const manager = layerManagerRef.current;
      const viewport = viewportRef.current;

      if (!manager || !viewport) {
        return;
      }

      const size = manager.getSize();
      viewport.setState(getCenteredViewport(size.width, size.height));
      notify('Canvas centered');
    };

    const zoomCanvas = async (direction: 'in' | 'out') => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const state = viewport.getState();
      viewport.setState({
        ...state,
        scale: state.scale * (direction === 'in' ? 1.12 : 0.88),
      });
      notify(`Zoom ${Math.round(viewport.getState().scale * 100)}%`);
    };

    const createLayer = async () => {
      const manager = layerManagerRef.current;

      if (!manager) {
        return;
      }

      historyRef.current?.capture();
      manager.createEmptyLayer();
      layerRendererRef.current?.sync(manager.getLayers());
      syncLayerStoreFromManager();
      markDirty('Layer created');
    };

    const duplicateLayer = async () => {
      const manager = layerManagerRef.current;

      if (!manager) {
        return;
      }

      historyRef.current?.capture();
      const layer = manager.duplicateActiveLayer();
      if (!layer) {
        notify('No active layer', 'warning');
        return;
      }

      layerRendererRef.current?.sync(manager.getLayers());
      syncLayerStoreFromManager();
      markDirty('Layer duplicated');
    };

    const clearLayer = async () => {
      const manager = layerManagerRef.current;

      if (!manager) {
        return;
      }

      historyRef.current?.capture();
      if (manager.clearActiveLayer()) {
        const activeLayer = manager.getActiveLayer();
        if (activeLayer) {
          textManagerRef.current?.clearLayer(activeLayer.id);
        }
        syncLayerStoreFromManager();
        markDirty('Layer cleared');
      } else {
        notify('Active layer locked', 'warning');
      }
    };

    const deleteLayer = async (id: string) => {
      const manager = layerManagerRef.current;

      if (!manager) {
        return;
      }

      historyRef.current?.capture();
      if (manager.deleteLayer(id)) {
        textManagerRef.current?.clearLayer(id);
        layerRendererRef.current?.sync(manager.getLayers());
        syncLayerStoreFromManager();
        markDirty('Layer deleted');
      } else {
        notify('Cannot delete last layer', 'warning');
      }
    };

    const moveLayer = async (id: string, direction: 'up' | 'down') => {
      const manager = layerManagerRef.current;

      if (!manager) {
        return;
      }

      historyRef.current?.capture();
      if (manager.moveLayer(id, direction)) {
        layerRendererRef.current?.sync(manager.getLayers());
        syncLayerStoreFromManager();
        markDirty(direction === 'up' ? 'Layer moved up' : 'Layer moved down');
      } else {
        notify('Layer already at edge', 'warning');
      }
    };

    const saveProject = async () => {
      const project = createProject();

      if (!project) {
        return;
      }

      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      await saveBlob(blob, 'lumitra-project.lumitra', [
        {
          description: 'Lumitra Project',
          accept: { 'application/json': ['.lumitra'] },
        },
      ]);
      useProjectStore.getState().markSaved();
      notify('Project saved', 'success');
      await saveAutosave(project);
    };

    const openProject = async () => {
      const file = await pickProjectFile();

      if (!file) {
        return;
      }

      await restoreProject(JSON.parse(await readFileAsText(file)) as LumitraProject);
      useProjectStore.getState().markSaved();
      notify('Project opened', 'success');
    };

    const importImage = async () => {
      const file = await pickImageFile();
      const manager = layerManagerRef.current;

      if (!file || !manager) {
        return;
      }

      historyRef.current?.capture();
      const layer = manager.createEmptyLayer();
      layer.name = file.name.replace(/\.[^.]+$/, '') || 'Imported image';

      await layer.drawImageFile(file);
      layerRendererRef.current?.sync(manager.getLayers());
      syncLayerStoreFromManager();
      markDirty('Image imported on new layer');
    };

    const restoreHistory = async (direction: 'undo' | 'redo') => {
      const history = historyRef.current;

      if (!history) {
        return;
      }

      const changed = direction === 'undo' ? await history.undo() : await history.redo();

      if (changed) {
        layerRendererRef.current?.sync(layerManagerRef.current?.getLayers() ?? []);
        syncLayerStoreFromManager();
        markDirty(direction === 'undo' ? 'Undo applied' : 'Redo applied');
      } else {
        notify(direction === 'undo' ? 'Nothing to undo' : 'Nothing to redo', 'warning');
      }
    };

    const ensureDrawableLayer = () => {
      const manager = layerManagerRef.current;
      const textManager = textManagerRef.current;

      if (!manager || !textManager) {
        return;
      }

      const activeLayer = manager.getActiveLayer();
      const activeTool = useToolStore.getState().activeTool;
      const shouldProtectTextLayer = [
        'brush',
        'mirror-brush',
        'eraser',
        'fill',
        'gradient',
        'smudge',
        'line',
        'rectangle',
        'ellipse',
      ].includes(activeTool);

      if (!activeLayer || !shouldProtectTextLayer || !textManager.hasTextInLayer(activeLayer.id)) {
        return;
      }

      const layer = manager.createEmptyLayer();
      layerRendererRef.current?.sync(manager.getLayers());
      syncLayerStoreFromManager();
      markDirty(`Text layer protected. Created ${layer.name} for drawing`);
      useToastStore.getState().pushToast('Text layers are protected from drawing', 'warning');
    };

    const exportPng = async () => {
      const service = projectServiceRef.current;

      if (!service) {
        return;
      }

      const blob = await service.exportPngBlob(2);

      if (!blob) {
        notify('Nothing to export', 'warning');
        return;
      }

      await saveBlob(blob, 'lumitra-export.png', [
        {
          description: 'PNG Image',
          accept: { 'image/png': ['.png'] },
        },
      ]);
      notify('PNG exported', 'success');
    };

    const handleProjectAction = () => {
      if (!useProjectStore.getState().pendingAction) {
        return;
      }

      const action = useProjectStore.getState().consumeAction();

      if (!action) {
        return;
      }

      if (action.type === 'save') {
        void saveProject();
      }

      if (action.type === 'open') {
        void openProject();
      }

      if (action.type === 'import-image') {
        void importImage();
      }

      if (action.type === 'export-png') {
        void exportPng();
      }

      if (action.type === 'restore-autosave') {
        void loadAutosave().then((project) => {
          if (project) {
            void restoreProject(project);
            notify('Autosave restored', 'success');
          } else {
            notify('No autosave found', 'warning');
          }
        });
      }

      if (action.type === 'undo') {
        void restoreHistory('undo');
      }

      if (action.type === 'redo') {
        void restoreHistory('redo');
      }
    };

    const pointerDown = (event: PointerEvent) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      event.preventDefault();
      app.canvas.setPointerCapture(event.pointerId);

      if (event.button === 1) {
        toolManagerRef.current?.activateTemporaryHand();
      }

      ensureDrawableLayer();
      toolManagerRef.current?.pointerDown(toToolPointer(event, app.canvas, viewport));
    };

    const pointerMove = (event: PointerEvent) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      event.preventDefault();

      for (const pointerEvent of event.getCoalescedEvents?.() ?? [event]) {
        toolManagerRef.current?.pointerMove(toToolPointer(pointerEvent, app.canvas, viewport));
      }
    };

    const pointerUp = (event: PointerEvent) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      toolManagerRef.current?.pointerUp(toToolPointer(event, app.canvas, viewport));
      app.canvas.releasePointerCapture(event.pointerId);
      toolManagerRef.current?.restorePreviousTool();
      if (!['hand', 'move'].includes(useToolStore.getState().activeTool)) {
        useProjectStore.getState().markDirty();
        scheduleAutosave();
      }
    };

    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const screen = getScreenPoint(event, app.canvas);
      viewport.zoomAt(screen.x, screen.y, event.deltaY);
    };

    const keyDown = (event: KeyboardEvent) => {
      if (isTextEditingRef.current) {
        return;
      }

      const key = event.key.toLowerCase();
      const isUndoKey = event.code === 'KeyZ' || key === 'z' || key === 'я';
      const isRedoKey = event.code === 'KeyY' || key === 'y' || key === 'н';

      if ((event.ctrlKey || event.metaKey) && isUndoKey) {
        event.preventDefault();
        void restoreHistory(event.shiftKey ? 'redo' : 'undo');
        return;
      }

      if ((event.ctrlKey || event.metaKey) && isRedoKey) {
        event.preventDefault();
        void restoreHistory('redo');
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        toolManagerRef.current?.activateTemporaryHand();
      }

      if (event.key === '[' || event.key === ']') {
        const current = useBrushStore.getState().size;
        const delta = event.shiftKey ? 10 : 1;
        useBrushStore.getState().setSize(
          Math.min(160, Math.max(1, current + (event.key === ']' ? delta : -delta))),
        );
      }
    };

    const keyUp = (event: KeyboardEvent) => {
      if (isTextEditingRef.current) {
        return;
      }

      if (event.code === 'Space') {
        toolManagerRef.current?.restorePreviousTool();
      }
    };

    const textEditing = (event: Event) => {
      isTextEditingRef.current = Boolean((event as CustomEvent<boolean>).detail);
    };

    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!useProjectStore.getState().isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = 'Сохрани проект перед закрытием.';
    };

    void app.init({
      antialias: true,
      autoDensity: true,
      backgroundAlpha: 0,
      preference: 'webgl',
      powerPreference: 'high-performance',
      resolution: window.devicePixelRatio || 1,
      resizeTo: window,
    }).then(() => {
      if (destroyed) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      app.canvas.className = 'drawing-canvas';
      host.appendChild(app.canvas);

      const manager = new LayerManager(CANVAS_WIDTH, CANVAS_HEIGHT, syncLayerStoreFromManager);
      const renderer = new LayerRenderer(app.stage);
      const initialViewport = getCenteredViewport(CANVAS_WIDTH, CANVAS_HEIGHT);
      const viewport = new ViewportController(renderer.viewport, initialViewport, (state) => (
        useViewportStore.getState().setViewport(state)
      ));
      const history = new HistoryManager(manager);
      const textManager = new TextManager();
      const service = new ProjectService(manager, textManager);

      layerManagerRef.current = manager;
      layerRendererRef.current = renderer;
      viewportRef.current = viewport;
      historyRef.current = history;
      projectServiceRef.current = service;
      textManagerRef.current = textManager;

      manager.sync(layerStateRef.current.layers, layerStateRef.current.activeLayerId);
      renderer.sync(manager.getLayers());
      syncLayerStoreFromManager();
      history.capture();

      void loadAutosave().then((project) => {
        if (!project || destroyed) {
          return;
        }

        void restoreProject(project).then(() => {
          useProjectStore.getState().markSaved();
          notify('Cached project restored', 'success');
        });
      }).catch(() => {
        notify('Autosave cache unavailable', 'warning');
      });

      toolManagerRef.current = new ToolManager({
        app,
        overlay: renderer.overlay,
        layers: manager,
        text: textManager,
        history,
        viewport,
        getBrushSettings: () => brushRef.current,
        getFillSettings: () => fillRef.current,
        getGradientSettings: () => gradientRef.current,
        getSmudgeSettings: () => smudgeRef.current,
        getTextSettings: () => textSettingsRef.current,
        setBrushColor: (color) => useBrushStore.getState().setColor(color),
        requestLayerSync: syncLayerStoreFromManager,
      }, app.canvas);
      toolManagerRef.current.setActiveTool(useToolStore.getState().activeTool);

      resize();
      app.canvas.dataset.ready = 'true';

      app.canvas.addEventListener('pointerdown', pointerDown);
      app.canvas.addEventListener('pointermove', pointerMove);
      app.canvas.addEventListener('pointerup', pointerUp);
      app.canvas.addEventListener('pointercancel', pointerUp);
      app.canvas.addEventListener('wheel', wheel, { passive: false });
      window.addEventListener('resize', resize);
      window.addEventListener('keydown', keyDown);
      window.addEventListener('keyup', keyUp);
      window.addEventListener('lumitra-text-editing', textEditing);
      window.addEventListener('beforeunload', beforeUnload);
      const unsubscribeProject = useProjectStore.subscribe(handleProjectAction);
      const autosaveTimer = window.setInterval(() => {
        void autosaveNow();
      }, 60000);

      window.lumitraActions = {
        newProject,
        centerCanvas,
        zoomCanvas,
        createLayer,
        duplicateLayer,
        clearLayer,
        deleteLayer,
        moveLayer,
        saveProject,
        openProject,
        importImage,
        exportPng,
        restoreAutosave: async () => {
          const project = await loadAutosave();
          if (project) {
            await restoreProject(project);
            notify('Autosave restored', 'success');
          } else {
            notify('No autosave found', 'warning');
          }
        },
        undo: async () => restoreHistory('undo'),
        redo: async () => restoreHistory('redo'),
      };

      cleanupRuntime = () => {
        unsubscribeProject();
        window.clearInterval(autosaveTimer);
        if (autosaveDebounce !== null) {
          window.clearTimeout(autosaveDebounce);
        }
        app.canvas.removeEventListener('pointerdown', pointerDown);
        app.canvas.removeEventListener('pointermove', pointerMove);
        app.canvas.removeEventListener('pointerup', pointerUp);
        app.canvas.removeEventListener('pointercancel', pointerUp);
        app.canvas.removeEventListener('wheel', wheel);
        window.removeEventListener('resize', resize);
        window.removeEventListener('keydown', keyDown);
        window.removeEventListener('keyup', keyUp);
        window.removeEventListener('lumitra-text-editing', textEditing);
        window.removeEventListener('beforeunload', beforeUnload);
        window.lumitraActions = undefined;
      };
    });

    return () => {
      destroyed = true;
      cleanupRuntime?.();
      toolManagerRef.current?.destroy();
      layerRendererRef.current?.destroy();
      layerManagerRef.current?.clear();
      appRef.current?.destroy(true, { children: true });
      appRef.current = null;
    };
  }, []);

  return <div ref={hostRef} className="canvas-host" />;
}

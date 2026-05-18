import { LayerRecord } from '../../app/layerStore';
import { Layer } from './Layer';
import { LayerCreateOptions, LayerSnapshot } from './types';

export class LayerManager {
  private readonly layers: Layer[] = [];

  private activeLayerId = '';

  constructor(
    private width: number,
    private height: number,
    private readonly onLayerChange: (() => void) | null = null,
  ) {}

  sync(records: LayerRecord[], activeLayerId: string) {
    const ids = new Set(records.map((record) => record.id));

    for (let index = this.layers.length - 1; index >= 0; index -= 1) {
      const layer = this.layers[index];

      if (!ids.has(layer.id)) {
        layer.destroy();
        this.layers.splice(index, 1);
      }
    }

    records.forEach((record, index) => {
      let layer = this.getLayer(record.id);

      if (!layer) {
        layer = this.createLayer({
          id: record.id,
          name: record.name,
          width: record.width || this.width,
          height: record.height || this.height,
          visible: record.visible,
          opacity: record.opacity,
          locked: record.locked,
          alphaLocked: record.alphaLocked,
        });
      }

      layer.name = record.name;
      layer.visible = record.visible;
      layer.opacity = record.opacity;
      layer.locked = record.locked;
      layer.alphaLocked = record.alphaLocked;
      layer.applyDisplayState();
      this.layers.splice(this.layers.indexOf(layer), 1);
      this.layers.splice(index, 0, layer);
    });

    this.activeLayerId = activeLayerId;
  }

  createLayer(options: LayerCreateOptions): Layer {
    const layer = new Layer(options);
    layer.onChange = this.onLayerChange;
    this.layers.push(layer);
    return layer;
  }

  createEmptyLayer(): Layer {
    const layer = this.createLayer({
      id: `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: `Layer ${this.layers.length + 1}`,
      width: this.width,
      height: this.height,
      visible: true,
      opacity: 1,
      locked: false,
    });

    this.activeLayerId = layer.id;
    return layer;
  }

  getLayers(): Layer[] {
    return [...this.layers];
  }

  getActiveLayer(): Layer | null {
    return this.getLayer(this.activeLayerId) ?? null;
  }

  getLayer(id: string): Layer | undefined {
    return this.layers.find((layer) => layer.id === id);
  }

  getActiveLayerId(): string {
    return this.activeLayerId;
  }

  setActiveLayer(id: string) {
    if (this.getLayer(id)) {
      this.activeLayerId = id;
      this.onLayerChange?.();
      return true;
    }

    return false;
  }

  toRecords(): LayerRecord[] {
    return this.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      locked: layer.locked,
      alphaLocked: layer.alphaLocked,
      thumbnail: layer.thumbnail,
      width: layer.canvas.width,
      height: layer.canvas.height,
    }));
  }

  toSnapshots(): LayerSnapshot[] {
    return this.layers.map((layer) => layer.toSnapshot());
  }

  async restoreSnapshots(snapshots: LayerSnapshot[], activeLayerId: string) {
    this.clear();

    const firstSnapshot = snapshots[0];
    if (firstSnapshot) {
      this.width = firstSnapshot.width || this.width;
      this.height = firstSnapshot.height || this.height;
    }

    for (const snapshot of snapshots) {
      const layer = this.createLayer({
        id: snapshot.id,
        name: snapshot.name,
        width: snapshot.width || this.width,
        height: snapshot.height || this.height,
        visible: snapshot.visible,
        opacity: snapshot.opacity,
        locked: snapshot.locked,
        alphaLocked: snapshot.alphaLocked,
        transform: snapshot.transform,
      });

      await layer.restoreDataUrl(snapshot.dataUrl);
    }

    this.activeLayerId = activeLayerId;
  }

  duplicateActiveLayer(): Layer | null {
    const activeLayer = this.getActiveLayer();

    if (!activeLayer) {
      return null;
    }

    const index = this.layers.indexOf(activeLayer);
    const layer = this.createLayer({
      id: `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${activeLayer.name} Copy`,
      width: activeLayer.canvas.width,
      height: activeLayer.canvas.height,
      visible: activeLayer.visible,
      opacity: activeLayer.opacity,
      locked: activeLayer.locked,
      alphaLocked: activeLayer.alphaLocked,
      transform: { ...activeLayer.transform },
    });

    layer.context.drawImage(activeLayer.canvas, 0, 0);
    layer.markDirtyNow();
    this.layers.splice(this.layers.indexOf(layer), 1);
    this.layers.splice(index + 1, 0, layer);
    this.activeLayerId = layer.id;
    return layer;
  }

  clearActiveLayer() {
    const activeLayer = this.getActiveLayer();

    if (!activeLayer || activeLayer.locked) {
      return false;
    }

    activeLayer.clear();
    return true;
  }

  moveLayer(id: string, direction: 'up' | 'down') {
    const index = this.layers.findIndex((layer) => layer.id === id);

    if (index < 0) {
      return false;
    }

    const nextIndex = direction === 'up' ? index + 1 : index - 1;

    if (nextIndex < 0 || nextIndex >= this.layers.length) {
      return false;
    }

    const [layer] = this.layers.splice(index, 1);
    this.layers.splice(nextIndex, 0, layer);
    return true;
  }

  reset(width: number, height: number) {
    this.clear();
    this.width = width;
    this.height = height;
    const base = this.createLayer({
      id: 'layer-background',
      name: 'Layer 1',
      width,
      height,
      visible: true,
      opacity: 1,
      locked: false,
      alphaLocked: false,
    });
    this.activeLayerId = base.id;
  }

  getSize() {
    return { width: this.width, height: this.height };
  }

  clear() {
    this.layers.splice(0).forEach((layer) => layer.destroy());
  }
}

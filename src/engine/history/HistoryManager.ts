import { LayerManager } from '../layers/LayerManager';
import { LayerSnapshot } from '../layers/types';

type HistorySnapshot = {
  activeLayerId: string;
  layers: LayerSnapshot[];
};

export class HistoryManager {
  private undoStack: HistorySnapshot[] = [];

  private redoStack: HistorySnapshot[] = [];

  constructor(private readonly layers: LayerManager) {}

  capture() {
    this.undoStack.push({
      activeLayerId: this.layers.getActiveLayerId(),
      layers: this.layers.toSnapshots(),
    });
    this.redoStack = [];

    if (this.undoStack.length > 30) {
      this.undoStack.shift();
    }
  }

  async undo() {
    const snapshot = this.undoStack.pop();

    if (!snapshot) {
      return false;
    }

    this.redoStack.push({
      activeLayerId: this.layers.getActiveLayerId(),
      layers: this.layers.toSnapshots(),
    });
    await this.layers.restoreSnapshots(snapshot.layers, snapshot.activeLayerId);
    return true;
  }

  async redo() {
    const snapshot = this.redoStack.pop();

    if (!snapshot) {
      return false;
    }

    this.undoStack.push({
      activeLayerId: this.layers.getActiveLayerId(),
      layers: this.layers.toSnapshots(),
    });
    await this.layers.restoreSnapshots(snapshot.layers, snapshot.activeLayerId);
    return true;
  }

  reset() {
    this.undoStack = [];
    this.redoStack = [];
    this.capture();
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

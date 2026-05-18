import { BrushTool } from './BrushTool';

export class EraserTool extends BrushTool {
  override readonly id = 'eraser';

  protected override compositeMode: GlobalCompositeOperation = 'destination-out';
}

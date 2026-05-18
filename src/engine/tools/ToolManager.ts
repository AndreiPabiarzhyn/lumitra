import { ToolId } from '../../app/toolStore';
import { BrushTool } from './BrushTool';
import { EraserTool } from './EraserTool';
import { EyedropperTool } from './EyedropperTool';
import { FillTool } from './FillTool';
import { GradientTool } from './GradientTool';
import { HandTool } from './HandTool';
import { MirrorBrushTool } from './MirrorBrushTool';
import { MoveTool } from './MoveTool';
import { ShapeTool } from './ShapeTools/ShapeTool';
import { SmudgeTool } from './SmudgeTool';
import { TextTool } from './TextTool';
import { Tool, ToolContext, ToolPointer } from './Tool';
import { TransformTool } from './TransformTool';

export class ToolManager {
  private readonly tools: Record<ToolId, Tool>;

  private activeToolId: ToolId = 'brush';

  private previousToolId: ToolId = 'brush';

  private isPointerDown = false;

  constructor(context: ToolContext, private readonly canvas: HTMLCanvasElement) {
    this.tools = {
      brush: new BrushTool(context),
      'mirror-brush': new MirrorBrushTool(context),
      eraser: new EraserTool(context),
      fill: new FillTool(context),
      gradient: new GradientTool(context),
      eyedropper: new EyedropperTool(context),
      text: new TextTool(context),
      move: new MoveTool(context),
      smudge: new SmudgeTool(context),
      hand: new HandTool(context),
      transform: new TransformTool(context),
      line: new ShapeTool(context, 'line'),
      rectangle: new ShapeTool(context, 'rectangle'),
      ellipse: new ShapeTool(context, 'ellipse'),
    };

    this.setActiveTool(this.activeToolId);
  }

  setActiveTool(tool: ToolId) {
    this.activeTool?.onDeactivate?.();
    this.activeToolId = tool;
    this.canvas.style.cursor = this.activeTool.cursor;
    this.activeTool.onActivate?.();
  }

  activateTemporaryHand() {
    if (this.activeToolId === 'hand') {
      return;
    }

    this.previousToolId = this.activeToolId;
    this.setActiveTool('hand');
  }

  restorePreviousTool() {
    if (this.activeToolId === 'hand') {
      this.setActiveTool(this.previousToolId);
    }
  }

  pointerDown(point: ToolPointer) {
    this.isPointerDown = true;
    void this.activeTool.onPointerDown?.(point);
  }

  pointerMove(point: ToolPointer) {
    if (!this.isPointerDown && this.activeToolId !== 'brush' && this.activeToolId !== 'mirror-brush' && this.activeToolId !== 'eraser' && this.activeToolId !== 'smudge' && this.activeToolId !== 'transform' && this.activeToolId !== 'text' && this.activeToolId !== 'move') {
      return;
    }

    void this.activeTool.onPointerMove?.(point);
  }

  pointerUp(point: ToolPointer) {
    this.isPointerDown = false;
    void this.activeTool.onPointerUp?.(point);
  }

  wheel(event: WheelEvent) {
    this.activeTool.onWheel?.(event);
  }

  cancel() {
    this.isPointerDown = false;
    this.activeTool.onCancel?.();
  }

  destroy() {
    Object.values(this.tools).forEach((tool) => {
      tool.onCancel?.();
      tool.destroy?.();
    });
  }

  private get activeTool() {
    return this.tools[this.activeToolId];
  }
}

import { LocateFixed, Minus, Plus } from 'lucide-react';

export function CanvasControls() {
  return (
    <div className="canvas-controls" aria-label="Canvas view controls">
      <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => void window.lumitraActions?.zoomCanvas('out')}>
        <Minus size={15} />
      </button>
      <button type="button" title="Center canvas" aria-label="Center canvas" onClick={() => void window.lumitraActions?.centerCanvas()}>
        <LocateFixed size={15} />
      </button>
      <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => void window.lumitraActions?.zoomCanvas('in')}>
        <Plus size={15} />
      </button>
    </div>
  );
}

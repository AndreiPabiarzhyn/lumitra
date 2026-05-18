import {
  Brush,
  Circle,
  Eraser,
  FlipHorizontal2,
  Hand,
  Highlighter,
  Minus,
  PaintBucket,
  Pipette,
  MousePointer2,
  Square,
  Scan,
  TextCursorInput,
  Waves,
} from 'lucide-react';
import { ToolId, useToolStore } from '../app/toolStore';

const tools: Array<{
  id: ToolId;
  label: string;
  Icon: typeof Brush;
}> = [
  { id: 'brush', label: 'Brush Tool', Icon: Brush },
  { id: 'mirror-brush', label: 'Mirror Brush Tool', Icon: FlipHorizontal2 },
  { id: 'eraser', label: 'Eraser Tool', Icon: Eraser },
  { id: 'fill', label: 'Fill Tool', Icon: PaintBucket },
  { id: 'gradient', label: 'Gradient Tool', Icon: Highlighter },
  { id: 'eyedropper', label: 'Eyedropper Tool', Icon: Pipette },
  { id: 'text', label: 'Text Tool', Icon: TextCursorInput },
  { id: 'move', label: 'Move Tool', Icon: MousePointer2 },
  { id: 'smudge', label: 'Smudge Tool', Icon: Waves },
  { id: 'hand', label: 'Hand Tool', Icon: Hand },
  { id: 'transform', label: 'Transform Tool', Icon: Scan },
  { id: 'line', label: 'Line Tool', Icon: Minus },
  { id: 'rectangle', label: 'Rectangle Tool', Icon: Square },
  { id: 'ellipse', label: 'Ellipse Tool', Icon: Circle },
];

export function LeftToolbar() {
  const activeTool = useToolStore((state) => state.activeTool);
  const setActiveTool = useToolStore((state) => state.setActiveTool);

  return (
    <aside className="left-toolbar" aria-label="Primary tools">
      {tools.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`tool-button ${activeTool === id ? 'is-active' : ''}`}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => setActiveTool(id)}
        >
          <Icon size={18} strokeWidth={1.8} />
        </button>
      ))}
    </aside>
  );
}

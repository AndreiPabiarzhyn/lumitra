import {
  Brush,
  Circle,
  Eraser,
  FlipHorizontal2,
  Hand,
  Minus,
  PaintBucket,
  Pipette,
  MousePointer2,
  Square,
  Scan,
  TextCursorInput,
  Waves,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { ToolId, useToolStore } from '../app/toolStore';

type ToolIcon = ComponentType<{ size?: number; strokeWidth?: number }>;

const GradientIcon: ToolIcon = ({ size = 18, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <defs>
      <linearGradient id="lumitra-gradient-icon" x1="5" y1="19" x2="19" y2="5" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="currentColor" stopOpacity="0.2" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0.95" />
      </linearGradient>
    </defs>
    <rect x="5" y="5" width="14" height="14" rx="3" fill="url(#lumitra-gradient-icon)" />
    <rect x="5" y="5" width="14" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M7.8 16.2 16.2 7.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={strokeWidth} />
  </svg>
);

const tools: Array<{
  id: ToolId;
  label: string;
  Icon: ToolIcon;
}> = [
  { id: 'move', label: 'Move Tool', Icon: MousePointer2 },
  { id: 'brush', label: 'Brush Tool', Icon: Brush },
  { id: 'mirror-brush', label: 'Mirror Brush Tool', Icon: FlipHorizontal2 },
  { id: 'eraser', label: 'Eraser Tool', Icon: Eraser },
  { id: 'fill', label: 'Fill Tool', Icon: PaintBucket },
  { id: 'gradient', label: 'Gradient Tool', Icon: GradientIcon },
  { id: 'eyedropper', label: 'Eyedropper Tool', Icon: Pipette },
  { id: 'text', label: 'Text Tool', Icon: TextCursorInput },
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

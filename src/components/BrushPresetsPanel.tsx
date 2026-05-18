import { Brush, Circle, Highlighter, PenLine, Pencil, SprayCan, Square, Waves } from 'lucide-react';
import { brushPresets, useBrushStore } from '../app/brushStore';

const iconForPreset = (id: string) => {
  if (id === 'round') return Circle;
  if (id === 'sketchy') return Waves;
  if (id === 'pencil') return Pencil;
  if (id === 'ink' || id === 'calligraphy') return PenLine;
  if (id === 'pixel') return Square;
  if (id === 'airbrush') return SprayCan;
  if (id === 'marker') return Highlighter;
  return Brush;
};

export function BrushPresetsPanel() {
  const presetId = useBrushStore((state) => state.presetId);
  const setPreset = useBrushStore((state) => state.setPreset);

  return (
    <div className="brush-presets">
      {brushPresets.map((preset) => {
        const Icon = iconForPreset(preset.id);

        return (
          <button
            key={preset.id}
            className={`brush-preset ${presetId === preset.id ? 'is-active' : ''}`}
            type="button"
            aria-label={`Brush preset ${preset.name}`}
            onClick={() => setPreset(preset)}
          >
            <span className="brush-preset-icon">
              <Icon size={16} strokeWidth={1.8} />
            </span>
            <span className="brush-preset-copy">
              <strong>{preset.name}</strong>
              <span style={{ '--preview-size': `${Math.min(34, Math.max(4, preset.size))}px` } as React.CSSProperties} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

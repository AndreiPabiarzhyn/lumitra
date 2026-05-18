import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Brush, Circle, Highlighter, Italic, Minus, PenLine, Pencil, Plus, SprayCan, Square, Underline, Waves } from 'lucide-react';
import { CSSProperties, PointerEvent, useRef, useState, WheelEvent } from 'react';
import { brushPresets, useBrushStore } from '../app/brushStore';
import { BrushPreset } from '../engine/brush/BrushSettings';
import { useGradientStore } from '../app/gradientStore';
import { useTextStore } from '../app/textStore';
import { useToolStore } from '../app/toolStore';

const gradientTypes = [
  ['linear', 'Linear'],
  ['radial', 'Radial'],
  ['angle', 'Angle'],
  ['diamond', 'Diamond'],
  ['reflected', 'Reflected'],
] as const;

const fontOptions = ['Inter', 'Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New'];

const brushPresetMeta: Record<BrushPreset['id'], { label: string; Icon: typeof Brush }> = {
  round: { label: 'Core brush', Icon: Circle },
  sketchy: { label: 'Dry texture', Icon: Waves },
  pencil: { label: 'Sketching', Icon: Pencil },
  ink: { label: 'Line art', Icon: PenLine },
  marker: { label: 'Build-up', Icon: Highlighter },
  airbrush: { label: 'Soft spray', Icon: SprayCan },
  pixel: { label: 'Pixel art', Icon: Square },
  calligraphy: { label: 'Lettering', Icon: PenLine },
};

export function TopToolbar() {
  const [isGradientTypeOpen, setIsGradientTypeOpen] = useState(false);
  const [isBrushPresetOpen, setIsBrushPresetOpen] = useState(false);
  const [isFontOpen, setIsFontOpen] = useState(false);
  const sizeDragRef = useRef<{ x: number; size: number } | null>(null);
  const activeTool = useToolStore((state) => state.activeTool);
  const size = useBrushStore((state) => state.size);
  const opacity = useBrushStore((state) => state.opacity);
  const presetId = useBrushStore((state) => state.presetId);
  const setSize = useBrushStore((state) => state.setSize);
  const setOpacity = useBrushStore((state) => state.setOpacity);
  const setPreset = useBrushStore((state) => state.setPreset);
  const text = useTextStore();
  const gradient = useGradientStore();
  const updateSize = (nextSize: number) => setSize(Math.min(160, Math.max(1, Math.round(nextSize))));
  const isBrushTool = activeTool === 'brush' || activeTool === 'mirror-brush';
  const isTextTool = activeTool === 'text' || activeTool === 'move';
  const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
  const firstStop = sortedStops[0];
  const lastStop = sortedStops[sortedStops.length - 1];
  const activePreset = brushPresets.find((preset) => preset.id === presetId) ?? brushPresets[0];
  const updateTextSize = (nextSize: number) => text.setFontSize(Math.min(240, Math.max(6, Math.round(nextSize))));
  const stepTextSize = (direction: number, large = false) => updateTextSize(text.fontSize + direction * (large ? 10 : 1));
  const startSizeDrag = (event: PointerEvent<HTMLSpanElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    sizeDragRef.current = { x: event.clientX, size: text.fontSize };
  };
  const moveSizeDrag = (event: PointerEvent<HTMLSpanElement>) => {
    if (!sizeDragRef.current || event.buttons !== 1) {
      return;
    }

    updateTextSize(sizeDragRef.current.size + (event.clientX - sizeDragRef.current.x) / 3);
  };
  const onSizeWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    stepTextSize(event.deltaY > 0 ? -1 : 1, event.shiftKey);
  };

  if (activeTool === 'gradient') {
    return (
      <div className="top-toolbar top-toolbar-gradient" aria-label="Gradient options">
        <span className="top-toolbar-label">Gradient</span>
        <div className="gradient-type-dropdown">
          <span>Type</span>
          <button type="button" className="gradient-type-trigger" onClick={() => setIsGradientTypeOpen((value) => !value)}>
            {gradientTypes.find(([type]) => type === gradient.type)?.[1] ?? 'Linear'}
          </button>
          {isGradientTypeOpen && (
            <div className="gradient-type-menu" role="menu">
              {gradientTypes.map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  className={gradient.type === type ? 'is-active' : ''}
                  onClick={() => {
                    gradient.setType(type);
                    setIsGradientTypeOpen(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {firstStop && (
          <label className="top-field top-color-field">
            <span>Start</span>
            <input
              className="top-color-input"
              title="Start color"
              aria-label="Start color"
              type="color"
              value={firstStop.color}
              onChange={(event) => gradient.setStartColor(event.target.value)}
            />
          </label>
        )}
        {lastStop && (
          <label className="top-field top-color-field">
            <span>End</span>
            <input
              className="top-color-input"
              title="End color"
              aria-label="End color"
              type="color"
              value={lastStop.color}
              onChange={(event) => gradient.setEndColor(event.target.value)}
            />
          </label>
        )}
      </div>
    );
  }

  if (isBrushTool) {
    return (
      <div className="top-toolbar top-toolbar-brush" aria-label="Brush options">
        <span className="top-toolbar-label">Brush</span>
        <div className="brush-preset-dropdown">
          <span>Type</span>
          <button
            type="button"
            className="brush-preset-trigger"
            aria-expanded={isBrushPresetOpen}
            onClick={() => setIsBrushPresetOpen((value) => !value)}
          >
            <span className={`brush-trigger-mark brush-preview-${activePreset.id}`} />
            <span>{activePreset?.name ?? 'Round'}</span>
          </button>
          {isBrushPresetOpen && (
            <div className="brush-preset-menu brush-library-menu" role="menu">
              <div className="brush-library-header">
                <span>Brush Library</span>
                <strong>{brushPresets.length}</strong>
              </div>
              {brushPresets.map((preset) => {
                const meta = brushPresetMeta[preset.id];
                const Icon = meta.Icon;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`brush-library-button ${presetId === preset.id ? 'is-active' : ''}`}
                    onClick={() => {
                      setPreset(preset);
                      setIsBrushPresetOpen(false);
                    }}
                  >
                    <span className="brush-library-icon">
                      <Icon size={17} strokeWidth={1.9} />
                    </span>
                    <span className="brush-library-content">
                      <span className="brush-library-title">
                        <strong>{preset.name}</strong>
                        <em>{meta.label}</em>
                      </span>
                      <span className={`brush-library-preview brush-preview-${preset.id}`} aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <label className="top-mini-slider">
          <span>Size</span>
          <input min="1" max="160" type="range" value={size} onChange={(event) => updateSize(Number(event.target.value))} />
          <output>{size}px</output>
        </label>
        <label className="top-mini-slider">
          <span>Opacity</span>
          <input min="0.1" max="1" step="0.05" type="range" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} />
          <output>{Math.round(opacity * 100)}%</output>
        </label>
      </div>
    );
  }

  if (isTextTool) {
    return (
      <div className="top-toolbar top-toolbar-text" aria-label="Text options">
        <span className="top-toolbar-label">Text</span>
        <div className="text-tool-group text-font-picker">
          <button type="button" className="font-picker-trigger" aria-expanded={isFontOpen} onClick={() => setIsFontOpen((value) => !value)}>
            <span style={{ fontFamily: text.fontFamily }}>{text.fontFamily}</span>
          </button>
          {isFontOpen && (
            <div className="font-picker-menu" role="menu">
              {fontOptions.map((font) => (
                <button
                  key={font}
                  type="button"
                  className={text.fontFamily === font ? 'is-active' : ''}
                  style={{ fontFamily: font }}
                  onClick={() => {
                    text.setFontFamily(font);
                    setIsFontOpen(false);
                  }}
                >
                  <strong>{font}</strong>
                  <span>{font}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="text-tool-group text-size-control" onWheel={onSizeWheel}>
          <span
            className="size-scrub-label"
            onPointerDown={startSizeDrag}
            onPointerMove={moveSizeDrag}
            onPointerUp={() => {
              sizeDragRef.current = null;
            }}
          >
            Size
          </span>
          <button type="button" aria-label="Decrease text size" onClick={(event) => stepTextSize(-1, event.shiftKey)}>
            <Minus size={13} />
          </button>
          <input
            min="6"
            max="240"
            type="number"
            value={text.fontSize}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                stepTextSize(1, event.shiftKey);
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                stepTextSize(-1, event.shiftKey);
              }
            }}
            onChange={(event) => updateTextSize(Number(event.target.value))}
          />
          <button type="button" aria-label="Increase text size" onClick={(event) => stepTextSize(1, event.shiftKey)}>
            <Plus size={13} />
          </button>
        </div>
        <div className="top-icon-group" aria-label="Text style">
          <button type="button" className={text.bold ? 'is-active' : ''} aria-label="Bold" onClick={() => text.setBold(!text.bold)}>
            <Bold size={14} />
          </button>
          <button type="button" className={text.italic ? 'is-active' : ''} aria-label="Italic" onClick={() => text.setItalic(!text.italic)}>
            <Italic size={14} />
          </button>
          <button type="button" className={text.underline ? 'is-active' : ''} aria-label="Underline" onClick={() => text.setUnderline(!text.underline)}>
            <Underline size={14} />
          </button>
        </div>
        <div className="top-icon-group" aria-label="Text alignment">
          <button type="button" className={text.align === 'left' ? 'is-active' : ''} aria-label="Align left" onClick={() => text.setAlign('left')}>
            <AlignLeft size={14} />
          </button>
          <button type="button" className={text.align === 'center' ? 'is-active' : ''} aria-label="Align center" onClick={() => text.setAlign('center')}>
            <AlignCenter size={14} />
          </button>
          <button type="button" className={text.align === 'right' ? 'is-active' : ''} aria-label="Align right" onClick={() => text.setAlign('right')}>
            <AlignRight size={14} />
          </button>
          <button type="button" className={text.align === 'justify' ? 'is-active' : ''} aria-label="Justify" onClick={() => text.setAlign('justify')}>
            <AlignJustify size={14} />
          </button>
        </div>
        <label className="text-color-button" title="Text color">
          <span style={{ '--text-color': text.color } as CSSProperties} />
          <input type="color" value={text.color} onChange={(event) => text.setColor(event.target.value)} />
        </label>
      </div>
    );
  }

  return (
    <div className="top-toolbar" aria-label="Tool options">
      <span className="top-toolbar-label">Brush size</span>
      <button type="button" aria-label="Decrease brush size" onClick={() => updateSize(size - 1)}>
        <Minus size={14} />
      </button>
      <input
        aria-label="Brush size"
        min="1"
        max="160"
        type="range"
        value={size}
        onChange={(event) => updateSize(Number(event.target.value))}
      />
      <output>{size}px</output>
      <button type="button" aria-label="Increase brush size" onClick={() => updateSize(size + 1)}>
        <Plus size={14} />
      </button>
    </div>
  );
}

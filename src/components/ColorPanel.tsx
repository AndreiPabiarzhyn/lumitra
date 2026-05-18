import { CSSProperties, PointerEvent, useEffect, useMemo, useState } from 'react';
import { useBrushStore } from '../app/brushStore';
import { useColorStore } from '../app/colorStore';
import { useTextStore } from '../app/textStore';
import { useToolStore } from '../app/toolStore';

type Rgb = { r: number; g: number; b: number };
type Hsv = { h: number; s: number; v: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toHexPart = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');

const rgbToHex = ({ r, g, b }: Rgb) => `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}`;

const hexToRgb = (hex: string): Rgb => {
  const normalized = hex.replace('#', '').trim();
  const safe = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '000000';

  return {
    r: Number.parseInt(safe.slice(0, 2), 16),
    g: Number.parseInt(safe.slice(2, 4), 16),
    b: Number.parseInt(safe.slice(4, 6), 16),
  };
};

const hsvToRgb = ({ h, s, v }: Hsv): Rgb => {
  const normalizedHue = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((normalizedHue / 60) % 2) - 1));
  const m = v - c;
  const [rp, gp, bp] = normalizedHue < 60 ? [c, x, 0]
    : normalizedHue < 120 ? [x, c, 0]
      : normalizedHue < 180 ? [0, c, x]
        : normalizedHue < 240 ? [0, x, c]
          : normalizedHue < 300 ? [x, 0, c]
            : [c, 0, x];

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
};

const rgbToHsv = ({ r, g, b }: Rgb): Hsv => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    if (max === bn) h = 60 * ((rn - gn) / delta + 4);
  }

  return {
    h: (h + 360) % 360,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
};

export function ColorPanel() {
  const color = useBrushStore((state) => state.color);
  const opacity = useBrushStore((state) => state.opacity);
  const setColor = useBrushStore((state) => state.setColor);
  const setOpacity = useBrushStore((state) => state.setOpacity);
  const activeTool = useToolStore((state) => state.activeTool);
  const setTextColor = useTextStore((state) => state.setColor);
  const setTextOpacity = useTextStore((state) => state.setOpacity);
  const recentColors = useColorStore((state) => state.recentColors);
  const pushRecentColor = useColorStore((state) => state.pushRecentColor);
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(hexToRgb(color)));
  const hueRgb = useMemo(() => rgbToHex(hsvToRgb({ h: hsv.h, s: 1, v: 1 })), [hsv.h]);

  useEffect(() => {
    setHsv(rgbToHsv(hexToRgb(color)));
  }, [color]);

  const commitHsv = (nextHsv: Hsv) => {
    const nextColor = rgbToHex(hsvToRgb(nextHsv));
    setHsv(nextHsv);
    setColor(nextColor);
    if (activeTool === 'text' || activeTool === 'move') {
      setTextColor(nextColor);
    }
    pushRecentColor(nextColor);
  };

  const commitRgb = (nextRgb: Rgb) => {
    const nextColor = rgbToHex(nextRgb);
    setColor(nextColor);
    if (activeTool === 'text' || activeTool === 'move') {
      setTextColor(nextColor);
    }
    setHsv(rgbToHsv(nextRgb));
    pushRecentColor(nextColor);
  };

  const pickHue = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const h = clamp((event.clientX - rect.left) / rect.width, 0, 1) * 360;
    commitHsv({ ...hsv, h });
  };

  const pickSv = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    commitHsv({
      ...hsv,
      s: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      v: clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1),
    });
  };

  const wheelMarker = {
    '--marker-x': `${(hsv.h / 360) * 100}%`,
    '--marker-y': '50%',
  } as CSSProperties;

  const svMarker = {
    '--marker-x': `${hsv.s * 100}%`,
    '--marker-y': `${(1 - hsv.v) * 100}%`,
    '--hue-color': hueRgb,
  } as CSSProperties;

  return (
    <div className="color-panel">
      <div className="color-picker-grid">
        <div
          className="sv-square"
          style={svMarker}
          onPointerDown={pickSv}
          onPointerMove={(event) => event.buttons === 1 && pickSv(event)}
        >
          <span className="picker-marker sv-marker" />
        </div>
        <div
          className="hue-slider"
          style={wheelMarker}
          onPointerDown={pickHue}
          onPointerMove={(event) => event.buttons === 1 && pickHue(event)}
        >
          <span className="picker-marker hue-marker" />
        </div>
      </div>

      <div className="color-preview-row">
        <span className="color-preview" style={{ '--preview': color } as CSSProperties} />
        <input
          aria-label="HEX color"
          value={color}
          onChange={(event) => {
            const value = event.target.value.startsWith('#') ? event.target.value : `#${event.target.value}`;
            setColor(value);
            if (activeTool === 'text' || activeTool === 'move') {
              setTextColor(value);
            }
            if (/^#[0-9a-fA-F]{6}$/.test(value)) {
              pushRecentColor(value);
            }
          }}
        />
      </div>

      <label className="control-row compact">
        <span>Alpha</span>
        <output>{Math.round(opacity * 100)}%</output>
        <input
          min="0.05"
          max="1"
          step="0.05"
          type="range"
          value={opacity}
          onChange={(event) => {
            const value = Number(event.target.value);
            setOpacity(value);
            if (activeTool === 'text' || activeTool === 'move') {
              setTextOpacity(value);
            }
          }}
        />
      </label>

      <div className="recent-colors">
        {recentColors.map((recent) => (
          <button
            key={recent}
            type="button"
            aria-label={`Recent color ${recent}`}
            style={{ '--swatch': recent } as CSSProperties}
            onClick={() => commitRgb(hexToRgb(recent))}
          />
        ))}
      </div>
    </div>
  );
}

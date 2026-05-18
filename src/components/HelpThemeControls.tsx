import { Keyboard, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const hotkeys = [
  ['Ctrl/Cmd + Z', 'Undo'],
  ['Ctrl/Cmd + Shift + Z', 'Redo'],
  ['Ctrl/Cmd + Y', 'Redo'],
  ['[ / ]', 'Brush size'],
  ['Shift + [ / ]', 'Brush size x10'],
  ['Shift while drawing', 'Straight brush stroke'],
  ['Space', 'Temporary hand / pan'],
  ['Mouse wheel', 'Zoom to cursor'],
  ['Enter', 'Apply text/transform'],
  ['Esc', 'Cancel / clear selection'],
  ['Delete / Backspace', 'Delete selected text object'],
];

export function HelpThemeControls() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const helpModal = isHelpOpen && typeof document !== 'undefined'
    ? createPortal(
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsHelpOpen(false)}>
        <div className="hotkeys-modal" role="dialog" aria-modal="true" aria-label="Hotkeys" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <span>Hotkeys</span>
            <strong>Lumitra</strong>
          </div>
          <div className="hotkeys-list">
            {hotkeys.map(([shortcut, description]) => (
              <div className="hotkey-row" key={shortcut}>
                <kbd>{shortcut}</kbd>
                <span>{description}</span>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button type="button" onClick={() => setIsHelpOpen(false)}>Close</button>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      <div className="help-theme-controls" aria-label="Help and theme">
        <button type="button" title="Hotkeys" aria-label="Hotkeys" onClick={() => setIsHelpOpen(true)}>
          <Keyboard size={15} />
        </button>
        <button
          type="button"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
      {helpModal}
    </>
  );
}

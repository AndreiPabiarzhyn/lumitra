import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToolStore } from '../app/toolStore';

export function TransformActionBar() {
  const activeTool = useToolStore((state) => state.activeTool);
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    const onState = (event: Event) => {
      setHasSelection(Boolean((event as CustomEvent<boolean>).detail));
    };

    window.addEventListener('lumitra-transform-state', onState);
    return () => window.removeEventListener('lumitra-transform-state', onState);
  }, []);

  useEffect(() => {
    if (activeTool !== 'transform') {
      setHasSelection(false);
    }
  }, [activeTool]);

  if (activeTool !== 'transform' || !hasSelection) {
    return null;
  }

  return (
    <div className="transform-action-bar" aria-label="Transform actions">
      <span>Transform preview</span>
      <button type="button" className="apply" onClick={() => window.dispatchEvent(new Event('lumitra-transform-apply'))}>
        <Check size={15} />
        Apply
      </button>
      <button type="button" className="cancel" onClick={() => window.dispatchEvent(new Event('lumitra-transform-cancel'))}>
        <X size={15} />
        Cancel
      </button>
    </div>
  );
}

import { Layer } from '../layers/Layer';
import { ViewportController } from '../viewport/ViewportController';
import { TextObject, textObjectFont } from './TextObject';

type OverlayCallbacks = {
  onInput: (content: string, caret: number) => void;
  onCommit: () => void;
};

const layerLocalToWorld = (layer: Layer, point: { x: number; y: number }) => {
  const cos = Math.cos(layer.transform.rotation);
  const sin = Math.sin(layer.transform.rotation);
  const scaledX = point.x * layer.transform.scaleX;
  const scaledY = point.y * layer.transform.scaleY;

  return {
    x: layer.transform.x + scaledX * cos - scaledY * sin,
    y: layer.transform.y + scaledX * sin + scaledY * cos,
  };
};

export class TextEditOverlay {
  private readonly element = document.createElement('textarea');

  private callbacks: OverlayCallbacks | null = null;

  constructor() {
    this.element.className = 'text-edit-overlay';
    this.element.spellcheck = false;
    this.element.wrap = 'soft';
    this.element.addEventListener('input', this.input);
    this.element.addEventListener('keydown', this.keydown);
    this.element.addEventListener('blur', this.blur);
  }

  start(
    object: TextObject,
    layer: Layer,
    viewport: ViewportController,
    canvas: HTMLCanvasElement,
    callbacks: OverlayCallbacks,
  ) {
    this.callbacks = callbacks;
    this.element.value = object.content;
    this.applyStyle(object, layer, viewport, canvas);

    if (!this.element.isConnected) {
      document.body.appendChild(this.element);
    }

    this.element.focus({ preventScroll: true });
    this.element.selectionStart = object.content.length;
    this.element.selectionEnd = object.content.length;
  }

  stop() {
    if (this.element.isConnected) {
      this.element.remove();
    }

    this.callbacks = null;
  }

  destroy() {
    this.stop();
    this.element.removeEventListener('input', this.input);
    this.element.removeEventListener('keydown', this.keydown);
    this.element.removeEventListener('blur', this.blur);
  }

  private applyStyle(object: TextObject, layer: Layer, viewport: ViewportController, canvas: HTMLCanvasElement) {
    const canvasRect = canvas.getBoundingClientRect();
    const state = viewport.getState();
    const world = layerLocalToWorld(layer, { x: object.x, y: object.y });
    const scale = state.scale * layer.transform.scaleX * object.scaleX;
    const screenX = canvasRect.left + state.x + world.x * state.scale;
    const screenY = canvasRect.top + state.y + world.y * state.scale;

    this.element.style.left = `${screenX}px`;
    this.element.style.top = `${screenY}px`;
    this.element.style.width = `${Math.max(80, object.width * scale)}px`;
    this.element.style.height = `${Math.max(32, object.height * scale)}px`;
    this.element.style.color = object.color;
    this.element.style.font = textObjectFont({ ...object, fontSize: object.fontSize * scale });
    this.element.style.lineHeight = `${object.lineHeight}`;
    this.element.style.letterSpacing = `${object.letterSpacing * scale}px`;
    this.element.style.textAlign = object.align === 'justify' ? 'left' : object.align;
    this.element.style.opacity = `${object.opacity}`;
    this.element.style.transform = `rotate(${object.rotation + layer.transform.rotation}rad)`;
  }

  private input = () => {
    this.callbacks?.onInput(this.element.value, this.element.selectionStart ?? this.element.value.length);
  };

  private keydown = (event: KeyboardEvent) => {
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      this.element.blur();
    }
  };

  private blur = () => {
    this.callbacks?.onCommit();
  };
}

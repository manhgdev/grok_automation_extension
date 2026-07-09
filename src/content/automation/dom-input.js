/**
 * Native DOM input helpers — avoid chrome.debugger CDP where possible
 * so Flow sees in-page events instead of DevTools synthetic input.
 */

const MOD_CTRL = 2;
const MOD_ALT = 1;
const MOD_META = 4;
const MOD_SHIFT = 8;

function getEventTarget(element) {
  if (!element) return document.activeElement || document.body;
  return element;
}

function jitteredPoint(rect, xBias = 0.5, yBias = 0.5) {
  const spread = 0.18;
  const x = rect.left + rect.width * (xBias + (Math.random() - 0.5) * spread);
  const y = rect.top + rect.height * (yBias + (Math.random() - 0.5) * spread);
  return { x, y };
}

function pointerClickAt(element, xBias = 0.5, yBias = 0.5) {
  const target = getEventTarget(element);
  target.scrollIntoView?.({ block: 'center', inline: 'nearest' });
  const rect = target.getBoundingClientRect();
  const { x, y } = jitteredPoint(rect, xBias, yBias);
  const base = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
  };
  const pointerBase = {
    ...base,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
  };
  target.dispatchEvent(new PointerEvent('pointerover', { ...pointerBase, buttons: 0 }));
  target.dispatchEvent(new MouseEvent('mouseover', { ...base, buttons: 0 }));
  target.dispatchEvent(new PointerEvent('pointerenter', { ...pointerBase, buttons: 0 }));
  target.dispatchEvent(new MouseEvent('mouseenter', { ...base, buttons: 0 }));
  target.dispatchEvent(new PointerEvent('pointermove', { ...pointerBase, buttons: 0 }));
  target.dispatchEvent(new MouseEvent('mousemove', { ...base, buttons: 0 }));
  target.dispatchEvent(new PointerEvent('pointerdown', { ...pointerBase, buttons: 1 }));
  target.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons: 1, button: 0 }));
  target.focus?.({ preventScroll: true });
  target.dispatchEvent(new PointerEvent('pointerup', { ...pointerBase, buttons: 0 }));
  target.dispatchEvent(new MouseEvent('mouseup', { ...base, buttons: 0, button: 0 }));
  target.dispatchEvent(new MouseEvent('click', { ...base, buttons: 0, button: 0 }));
}

export function nativeFocusElement(element) {
  const target = getEventTarget(element);
  if (!target) return false;
  try {
    pointerClickAt(target, 0.5, 0.5);
    return true;
  } catch {
    try {
      target.focus?.();
      target.click?.();
      return true;
    } catch {
      return false;
    }
  }
}

export function nativeClickElement(element, xBias = 0.25, yBias = 0.5) {
  const target = getEventTarget(element);
  if (!target) return false;
  try {
    target.scrollIntoView?.({ block: 'center', inline: 'nearest' });
    if (typeof target.click === 'function') {
      target.click();
      return true;
    }
    pointerClickAt(target, xBias, yBias);
    return true;
  } catch {
    try {
      pointerClickAt(target, xBias, yBias);
      return true;
    } catch {
      return false;
    }
  }
}

function modifierFlags(modifiers = 0) {
  return {
    ctrlKey: !!(modifiers & MOD_CTRL),
    altKey: !!(modifiers & MOD_ALT),
    metaKey: !!(modifiers & MOD_META),
    shiftKey: !!(modifiers & MOD_SHIFT),
  };
}

export function nativeDispatchKey(element, key, code, keyCode, modifiers, text) {
  const target = getEventTarget(element);
  const mods = modifierFlags(modifiers);
  const keyInit = {
    key,
    code,
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
    ...mods,
  };
  if (text !== undefined) {
    keyInit.key = text;
    keyInit.text = text;
  }
  try {
    target.dispatchEvent(new KeyboardEvent('keydown', keyInit));
    if (key.length === 1 || text) {
      target.dispatchEvent(new KeyboardEvent('keypress', keyInit));
    }
    target.dispatchEvent(new KeyboardEvent('keyup', keyInit));
    return true;
  } catch {
    return false;
  }
}

export function nativeClearEditable(element) {
  const target = getEventTarget(element);
  if (!target) return false;
  target.focus?.();
  try {
    if (target.isContentEditable) {
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      if (document.execCommand('delete', false, null)) return true;
      target.textContent = '';
      target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
      return true;
    }
    if ('value' in target) {
      target.value = '';
      target.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
  } catch {
    // fall through
  }
  return nativeDispatchKey(target, 'a', 'KeyA', 65, MOD_CTRL) &&
    nativeDispatchKey(target, 'Backspace', 'Backspace', 8, 0);
}

function insertTextChunk(target, text) {
  target.focus?.();

  try {
    target.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text,
      }),
    );
  } catch {
    // ignore
  }

  let inserted = false;
  try {
    inserted = document.execCommand('insertText', false, text);
  } catch {
    inserted = false;
  }

  if (!inserted) {
    const selection = window.getSelection();
    if (!selection) return false;
    if (!selection.rangeCount) {
      const range = document.createRange();
      if (target.isContentEditable) {
        range.selectNodeContents(target);
        range.collapse(false);
      } else {
        return false;
      }
      selection.addRange(range);
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  try {
    target.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
    );
  } catch {
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return true;
}

export async function nativeInsertText(element, text, options = {}) {
  const target = getEventTarget(element);
  if (!target || !text) return !text;
  const chunkSize = Math.max(0, options.chunkChars ?? 0);
  const chunkDelayMs = Math.max(0, options.chunkDelayMs ?? 40);
  try {
    if (chunkSize > 0 && text.length > chunkSize) {
      let offset = 0;
      while (offset < text.length) {
        const piece = text.slice(offset, offset + chunkSize);
        if (!insertTextChunk(target, piece)) return false;
        offset += piece.length;
        if (offset < text.length && chunkDelayMs > 0) {
          await new Promise((r) => setTimeout(r, chunkDelayMs * (0.7 + Math.random() * 0.6)));
        }
      }
      return true;
    }
    return insertTextChunk(target, text);
  } catch {
    return false;
  }
}

// input.js — one pointer-event implementation for mouse, touch, and stylus.
//
// Replaces the parallel mouse/touch handlers the games grew independently.
// Pointer Events are supported everywhere these games ship (iOS 13+, Chrome 55+),
// so there is no need to maintain two code paths that drift apart.
//
// Recognises tap, drag, swipe, and hold, and reports positions already converted
// into the game's logical coordinate space.

import { BALANCE } from './config.js';

/**
 * @param {HTMLElement} el  Usually the canvas.
 * @param {object} handlers
 * @param {(p:Point)=>void} [handlers.onDown]
 * @param {(p:Point)=>void} [handlers.onMove]
 * @param {(p:Point)=>void} [handlers.onUp]
 * @param {(p:Point)=>void} [handlers.onTap]
 * @param {(dir:'up'|'down'|'left'|'right', p:Point)=>void} [handlers.onSwipe]
 * @param {(p:Point)=>void} [handlers.onHold]
 * @param {object} [opts]
 * @param {()=>{scale:number,offsetX:number,offsetY:number}} [opts.transform]
 *        Maps CSS pixels into logical units. Defaults to identity.
 */
export function createInput(el, handlers = {}, opts = {}) {
  const cfg = BALANCE.input;
  const transform = opts.transform || (() => ({ scale: 1, offsetX: 0, offsetY: 0 }));

  let active = null; // { id, startX, startY, startTime, lastX, lastY, moved, holdTimer }

  const toLogical = (clientX, clientY) => {
    const rect = el.getBoundingClientRect();
    const { scale, offsetX, offsetY } = transform();
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  };

  const clearHold = () => {
    if (active?.holdTimer) {
      clearTimeout(active.holdTimer);
      active.holdTimer = null;
    }
  };

  const onPointerDown = (e) => {
    // Ignore secondary touches; these are single-pointer games.
    if (active !== null) return;
    // Only left button for mouse; any touch/pen contact.
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    el.setPointerCapture?.(e.pointerId);
    const p = toLogical(e.clientX, e.clientY);
    active = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      holdTimer: null,
    };

    if (handlers.onHold) {
      active.holdTimer = setTimeout(() => {
        if (active && !active.moved) handlers.onHold(toLogical(active.lastX, active.lastY));
      }, cfg.holdSeconds * 1000);
    }

    handlers.onDown?.(p);
    // Stop the browser turning a drag into a scroll or a pull-to-refresh.
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!active || e.pointerId !== active.id) return;
    active.lastX = e.clientX;
    active.lastY = e.clientY;

    const dx = e.clientX - active.startX;
    const dy = e.clientY - active.startY;
    if (!active.moved && Math.hypot(dx, dy) > cfg.tapMaxMovePx) {
      active.moved = true;
      clearHold();
    }

    handlers.onMove?.(toLogical(e.clientX, e.clientY));
    e.preventDefault();
  };

  const finish = (e) => {
    if (!active || e.pointerId !== active.id) return;
    clearHold();

    const p = toLogical(e.clientX, e.clientY);
    const dx = e.clientX - active.startX;
    const dy = e.clientY - active.startY;
    const dist = Math.hypot(dx, dy);
    const duration = (performance.now() - active.startTime) / 1000;

    handlers.onUp?.(p);

    if (dist >= cfg.swipeMinPx && handlers.onSwipe) {
      const dir = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');
      handlers.onSwipe(dir, p);
    } else if (dist <= cfg.tapMaxMovePx && duration <= cfg.tapMaxSeconds) {
      handlers.onTap?.(p);
    }

    el.releasePointerCapture?.(active.id);
    active = null;
    e.preventDefault();
  };

  const onPointerCancel = (e) => {
    if (!active || e.pointerId !== active.id) return;
    clearHold();
    handlers.onUp?.(toLogical(e.clientX, e.clientY));
    active = null;
  };

  // passive:false is required — these handlers call preventDefault to suppress
  // scroll/zoom/pull-to-refresh during play.
  const listenerOpts = { passive: false };
  el.addEventListener('pointerdown', onPointerDown, listenerOpts);
  el.addEventListener('pointermove', onPointerMove, listenerOpts);
  el.addEventListener('pointerup', finish, listenerOpts);
  el.addEventListener('pointercancel', onPointerCancel, listenerOpts);

  // Belt-and-braces: some Android browsers still synthesise gestures.
  const blockGesture = (e) => e.preventDefault();
  el.addEventListener('contextmenu', blockGesture);
  el.addEventListener('dragstart', blockGesture);

  return {
    /** Remove every listener. Call on unmount — these games remount on replay. */
    destroy() {
      clearHold();
      el.removeEventListener('pointerdown', onPointerDown, listenerOpts);
      el.removeEventListener('pointermove', onPointerMove, listenerOpts);
      el.removeEventListener('pointerup', finish, listenerOpts);
      el.removeEventListener('pointercancel', onPointerCancel, listenerOpts);
      el.removeEventListener('contextmenu', blockGesture);
      el.removeEventListener('dragstart', blockGesture);
      active = null;
    },
    isActive: () => active !== null,
  };
}

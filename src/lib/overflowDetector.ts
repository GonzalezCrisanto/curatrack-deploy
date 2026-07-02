/**
 * Dev-only overflow detector.
 * Highlights any element that:
 *  - causes horizontal page overflow (scrollWidth > viewport)
 *  - has an internal scrollbar (scrollHeight/scrollWidth > clientHeight/clientWidth
 *    AND its computed `overflow` is auto/scroll/overlay).
 *
 * Renders a small floating badge at the top-right with the count and a
 * list of selectors. Click an item to scroll the offender into view.
 *
 * Activated automatically in dev. Can be toggled at runtime via:
 *   window.__overflowDetector.toggle()
 *   window.__overflowDetector.disable()
 */

type Offender = {
  el: HTMLElement;
  reasons: string[];
};

const STYLE_ID = 'overflow-detector-style';
const PANEL_ID = 'overflow-detector-panel';
const HIGHLIGHT_ATTR = 'data-overflow-offender';

function describe(el: HTMLElement) {
  const id = el.id ? `#${el.id}` : '';
  const cls = (el.className && typeof el.className === 'string')
    ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
    : '';
  return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 90);
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    [${HIGHLIGHT_ATTR}] {
      outline: 2px dashed hsl(0 84% 60%) !important;
      outline-offset: -2px !important;
      background-image: linear-gradient(135deg, hsl(0 84% 60% / 0.08) 25%, transparent 25%, transparent 50%, hsl(0 84% 60% / 0.08) 50%, hsl(0 84% 60% / 0.08) 75%, transparent 75%) !important;
      background-size: 12px 12px !important;
    }
    #${PANEL_ID} {
      position: fixed;
      top: 8px;
      right: 8px;
      z-index: 2147483647;
      max-width: 360px;
      max-height: 60vh;
      overflow: auto;
      font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
      background: hsl(0 0% 8% / 0.95);
      color: hsl(0 0% 98%);
      border: 1px solid hsl(0 84% 60%);
      border-radius: 8px;
      padding: 8px 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    }
    #${PANEL_ID} header {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; margin-bottom: 6px;
      font-weight: 600; color: hsl(0 84% 75%);
    }
    #${PANEL_ID} button {
      background: transparent; color: inherit; border: 1px solid hsl(0 0% 30%);
      border-radius: 4px; padding: 1px 6px; cursor: pointer; font: inherit;
    }
    #${PANEL_ID} ul { list-style: none; margin: 0; padding: 0; }
    #${PANEL_ID} li {
      padding: 4px 0; border-top: 1px solid hsl(0 0% 18%);
      cursor: pointer;
    }
    #${PANEL_ID} li:first-child { border-top: 0; }
    #${PANEL_ID} li:hover { color: hsl(0 84% 75%); }
    #${PANEL_ID} .reason { color: hsl(45 90% 70%); font-size: 11px; }
  `;
  document.head.appendChild(s);
}

function clearHighlights() {
  document.querySelectorAll(`[${HIGHLIGHT_ATTR}]`).forEach(el => {
    el.removeAttribute(HIGHLIGHT_ATTR);
  });
}

function findOffenders(): Offender[] {
  const results: Offender[] = [];
  const viewportW = document.documentElement.clientWidth;

  // 1) Horizontal page overflow on <html>
  if (document.documentElement.scrollWidth > viewportW + 1) {
    // Find which descendants stick out past viewport width.
    const all = document.body.querySelectorAll<HTMLElement>('*');
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.right > viewportW + 1 && rect.width > 0 && rect.width <= viewportW * 2) {
        results.push({ el, reasons: [`overflow-x: ${Math.round(rect.right - viewportW)}px past viewport`] });
        if (results.length > 12) break;
      }
    }
  }

  // 2) Internal scrollers (auto/scroll containers actually scrolling)
  const all = document.body.querySelectorAll<HTMLElement>('*');
  for (const el of all) {
    if (el.id === PANEL_ID) continue;
    const cs = getComputedStyle(el);
    const oy = cs.overflowY;
    const ox = cs.overflowX;
    const scrollableY = (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      el.scrollHeight - el.clientHeight > 1;
    const scrollableX = (ox === 'auto' || ox === 'scroll' || ox === 'overlay') &&
      el.scrollWidth - el.clientWidth > 1;
    if (scrollableY || scrollableX) {
      // Skip dialogs and known intentional scrollers (table, dialog content, etc.)
      const role = el.getAttribute('role');
      if (role === 'dialog' || el.closest('[role="dialog"]')) continue;
      if (el.hasAttribute('data-intentional-scroll') || el.closest('[data-intentional-scroll]')) continue;
      results.push({
        el,
        reasons: [
          scrollableY ? `internal scroll-y (${el.scrollHeight - el.clientHeight}px)` : '',
          scrollableX ? `internal scroll-x (${el.scrollWidth - el.clientWidth}px)` : '',
        ].filter(Boolean),
      });
      if (results.length > 24) break;
    }
  }

  return results;
}

function renderPanel(offenders: Offender[]) {
  let panel = document.getElementById(PANEL_ID);
  if (!offenders.length) {
    panel?.remove();
    clearHighlights();
    return;
  }
  if (!panel) {
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    document.body.appendChild(panel);
  }
  panel.innerHTML = `
    <header>
      <span>⚠ Overflow detector — ${offenders.length}</span>
      <button data-action="hide">×</button>
    </header>
    <ul></ul>
  `;
  const ul = panel.querySelector('ul')!;
  clearHighlights();
  offenders.forEach((o, i) => {
    o.el.setAttribute(HIGHLIGHT_ATTR, String(i));
    const li = document.createElement('li');
    li.innerHTML = `<div>${describe(o.el)}</div><div class="reason">${o.reasons.join(' • ')}</div>`;
    li.addEventListener('click', () => {
      o.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    ul.appendChild(li);
  });
  panel.querySelector('[data-action="hide"]')?.addEventListener('click', () => {
    panel?.remove();
    clearHighlights();
  });
}

let rafId: number | null = null;
let observer: MutationObserver | null = null;
let resizeHandler: (() => void) | null = null;
let enabled = false;

function scan() {
  if (!enabled) return;
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    rafId = null;
    const offenders = findOffenders();
    renderPanel(offenders);
  });
}

function enable() {
  if (enabled) return;
  enabled = true;
  injectStyle();
  observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  resizeHandler = () => scan();
  window.addEventListener('resize', resizeHandler);
  setTimeout(scan, 200);
}

function disable() {
  enabled = false;
  observer?.disconnect();
  observer = null;
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  resizeHandler = null;
  document.getElementById(PANEL_ID)?.remove();
  clearHighlights();
}

export function initOverflowDetector() {
  if (typeof window === 'undefined') return;
  if (!import.meta.env.DEV) return;
  enable();
  (window as unknown as { __overflowDetector: unknown }).__overflowDetector = {
    enable,
    disable,
    toggle: () => (enabled ? disable() : enable()),
    scan,
  };
}

/**
 * Svelte action: shrink the font size until no single word sticks out of its box,
 * so text only wraps between words ("de badkamer"), never inside one ("badkame-r").
 * With `items` (a selector) all matching children get one shared size, so a row of
 * answer tiles stays even. Only when even `min` px does not fit may a word break
 * (class `fit-break`). Pass the text as `key` so the fit is redone when it changes.
 */
export interface FitOptions {
  min?: number;
  /** With `items`: shrink together down to this size, below it only the ones that still stick out. */
  shared?: number;
  items?: string;
  key?: string;
}

export function fitText(node: HTMLElement, opts: FitOptions = {}) {
  let options = opts;
  let lastWidth = -1;

  const targets = () => (options.items ? [...node.querySelectorAll<HTMLElement>(options.items)] : [node]);
  const overflows = (el: HTMLElement) => el.scrollWidth > el.clientWidth + 1;

  function fit() {
    const els = targets();
    if (!els.length) return;
    const min = options.min ?? 14;
    for (const el of els) {
      el.classList.remove('fit-break');
      el.style.fontSize = '';
    }
    const shared = Math.max(min, options.shared ?? min);
    let size = parseFloat(getComputedStyle(els[0]).fontSize);
    while (size > shared && els.some(overflows)) {
      size = Math.max(shared, size - 1);
      for (const el of els) el.style.fontSize = `${size}px`;
    }
    for (const el of els) {
      let own = size;
      while (own > min && overflows(el)) {
        own = Math.max(min, own - 1);
        el.style.fontSize = `${own}px`;
      }
      if (overflows(el)) el.classList.add('fit-break');
    }
  }

  const ro = new ResizeObserver(() => {
    // Only react to width changes; our own font change only alters the height.
    if (node.clientWidth === lastWidth) return;
    lastWidth = node.clientWidth;
    fit();
  });
  ro.observe(node);
  fit();
  document.fonts?.ready.then(fit);

  return {
    update(next: FitOptions = {}) {
      options = next;
      fit();
    },
    destroy() {
      ro.disconnect();
    },
  };
}

/** Length of the longest single word in a set of answers (used to pick the tile layout). */
export function longestWord(texts: string[]): number {
  return Math.max(0, ...texts.flatMap((t) => t.split(/\s+/)).map((w) => w.length));
}

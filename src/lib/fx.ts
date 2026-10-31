// Visual effects: the coin drop into the coin counter (PLAN.md 3.5) and confetti.
import confetti from 'canvas-confetti';

export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function sparkle(x: number, y: number): void {
  const s = document.createElement('div');
  s.className = 'sparkle';
  s.textContent = '✨';
  s.style.left = `${x - 6}px`;
  s.style.top = `${y - 14}px`;
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 800);
}

function bump(el: Element): void {
  el.classList.remove('bounce');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('bounce');
}

/**
 * Coins pop up from `from`, arc and fall into the coin counter (#coin-counter) with a small
 * stagger. `reverse` sends them from the counter to `from` (buying something).
 * Returns the time in ms until the last coin has landed.
 */
export function coinDrop(from: Element | DOMRect | null, count: number, reverse = false): number {
  const counter = document.getElementById('coin-counter');
  if (!counter || !from || count <= 0) return 0;
  if (reducedMotion()) {
    bump(counter);
    return 0;
  }
  const a = from instanceof Element ? from.getBoundingClientRect() : from;
  const b = counter.getBoundingClientRect();
  const target = { x: b.left + b.width / 2 - 14, y: b.top + b.height / 2 - 14 };
  const n = Math.min(15, Math.max(1, count));
  for (let i = 0; i < n; i++) {
    const start = { x: a.left + a.width / 2 - 14 + (Math.random() * 120 - 60), y: a.top + Math.min(20, a.height / 2) };
    const [p0, p1] = reverse ? [target, start] : [start, target];
    const coin = document.createElement('div');
    coin.className = 'flying-coin';
    document.body.appendChild(coin);
    const peak = { x: p0.x + (p1.x - p0.x) * 0.3, y: Math.min(p0.y, p1.y) - 60 - Math.random() * 40 };
    const spin = Math.random() * 540 - 270;
    const anim = coin.animate(
      [
        { transform: `translate(${p0.x}px, ${p0.y}px) scale(0.4) rotate(0deg)`, opacity: 0 },
        { transform: `translate(${p0.x}px, ${p0.y - 24}px) scale(1.1) rotate(${spin / 4}deg)`, opacity: 1, offset: 0.18 },
        { transform: `translate(${peak.x}px, ${peak.y}px) scale(1) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${p1.x}px, ${p1.y}px) scale(0.8) rotate(${spin}deg)`, opacity: 1 },
      ],
      { duration: 750, delay: i * 60, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' },
    );
    anim.onfinish = () => {
      coin.remove();
      if (!reverse) {
        bump(counter);
        if (i === n - 1 || i % 3 === 0) sparkle(target.x + 14, target.y + 14);
      }
    };
  }
  return 750 + (n - 1) * 60;
}

/** Leaves and coins raining down (results). */
export function celebrate(big = false): void {
  if (reducedMotion()) return;
  const colors = ['#2E9E5B', '#FFC233', '#D7F2DF', '#D99A00', '#4BB4E6'];
  confetti({ particleCount: big ? 160 : 80, spread: big ? 100 : 70, origin: { y: 0.35 }, colors, scalar: 1.1, disableForReducedMotion: true });
  if (big) setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors }), 250);
  if (big) setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors }), 400);
}

import { animate, stagger } from 'animejs';

export const isReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Staggered entrance for cards and list items
 */
export function animateEntrance(target: string | HTMLElement | NodeList | HTMLElement[]) {
  if (isReducedMotion()) {
    return;
  }
  try {
    animate(target, {
      opacity: [0, 1],
      y: [16, 0],
      delay: stagger(70),
      duration: 600,
      ease: 'outExpo',
    });
  } catch {
    // fallback if target is not currently in DOM
  }
}

/**
 * Smooth KPI Counter animation
 */
export function animateKpiCount(target: HTMLElement | null, start: number, end: number, prefix = '', suffix = '') {
  if (!target) return;
  if (isReducedMotion()) {
    target.textContent = `${prefix}${end.toLocaleString()}${suffix}`;
    return;
  }

  const obj = { val: start };
  try {
    animate(obj, {
      val: end,
      duration: 700,
      ease: 'outExpo',
      onUpdate: () => {
        target.textContent = `${prefix}${Math.round(obj.val).toLocaleString()}${suffix}`;
      },
    });
  } catch {
    target.textContent = `${prefix}${end.toLocaleString()}${suffix}`;
  }
}

/**
 * Pulsing live dot for active/running machines
 */
export function animateLivePulse(target: string | HTMLElement | NodeList) {
  if (isReducedMotion()) return;
  try {
    animate(target, {
      scale: [1, 1.4, 1],
      opacity: [1, 0.5, 1],
      duration: 1600,
      ease: 'outQuad',
      loop: true,
    });
  } catch {
    // ignore
  }
}

/**
 * Progress fill animation
 */
export function animateProgressFill(target: HTMLElement | null, percentage: number) {
  if (!target) return;
  if (isReducedMotion()) {
    target.style.width = `${percentage}%`;
    return;
  }
  try {
    animate(target, {
      width: [`0%`, `${percentage}%`],
      duration: 550,
      ease: 'outExpo',
    });
  } catch {
    target.style.width = `${percentage}%`;
  }
}

import { flushSync } from "react-dom";

const DURATION = 800;
const EASING = "cubic-bezier(0.76, 0, 0.24, 1)";

export const THEME_STORAGE_KEY = "adminTheme";

export const getStoredTheme = () => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

export const storeTheme = (theme) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage unavailable (private mode): theme just won't persist
  }
};

// Where the reveal starts: the click point, or the centre of the button
// when triggered from the keyboard.
const getOrigin = (event) => {
  if (event && event.clientX && event.clientY) return { x: event.clientX, y: event.clientY };
  const rect = event?.currentTarget?.getBoundingClientRect?.();
  if (rect) return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  return { x: window.innerWidth - 80, y: 40 };
};

// A glowing ring that travels with the edge of the reveal circle
const spawnShockwave = (x, y, radius, toLight) => {
  const ring = document.createElement("div");
  ring.className = `theme-shockwave ${toLight ? "to-light" : "to-dark"}`;
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  document.body.appendChild(ring);
  const size = radius * 2;
  // Same size curve as the clip circle, so the ring sits exactly on its edge
  const anim = ring.animate(
    { width: ["0px", `${size}px`], height: ["0px", `${size}px`] },
    { duration: DURATION, easing: EASING }
  );
  ring.animate({ opacity: [1, 1, 0] }, { duration: DURATION, easing: "linear" });
  anim.onfinish = () => ring.remove();
  anim.oncancel = () => ring.remove();
};

// Fallback for browsers without View Transitions: cross-fade colours
const crossFade = (apply) => {
  const root = document.documentElement;
  root.classList.add("theme-fade");
  apply();
  window.setTimeout(() => root.classList.remove("theme-fade"), 600);
};

/**
 * Switch theme with a circular reveal expanding from the click point.
 * `apply` must perform the actual switch (state update + body class).
 */
export function switchThemeWithTransition(apply, event, toLight) {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    apply();
    return;
  }
  if (typeof document.startViewTransition !== "function") {
    crossFade(apply);
    return;
  }

  const { x, y } = getOrigin(event);
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const root = document.documentElement;

  // Freeze the page's own CSS transitions so the snapshots are crisp
  root.classList.add("theme-switching");

  const transition = document.startViewTransition(() => {
    flushSync(apply);
  });

  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: DURATION, easing: EASING, pseudoElement: "::view-transition-new(root)" }
      );
      root.animate(
        {
          transform: ["scale(1)", "scale(0.94)"],
          filter: ["blur(0px) brightness(1)", `blur(3px) brightness(${toLight ? 1.1 : 0.7})`],
          borderRadius: ["0px", "24px"],
        },
        { duration: DURATION, easing: EASING, pseudoElement: "::view-transition-old(root)" }
      );
      spawnShockwave(x, y, radius, toLight);
    })
    .catch(() => {});

  transition.finished.finally(() => root.classList.remove("theme-switching"));
}

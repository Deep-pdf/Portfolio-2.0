/**
 * ============================================================
 * preloader.js — Functional Website Preloader System
 * ============================================================
 *
 * Logic overview:
 *  1. On page load, scroll is locked and the preloader is fixed
 *     fullscreen with a high z-index (handled in CSS).
 *  2. A minimum display timer of 3 seconds is started immediately.
 *  3. We listen for the window "load" event which fires only after
 *     ALL assets (images, videos, fonts, iframes) have loaded.
 *  4. The preloader is dismissed only when BOTH are true:
 *       a) Minimum 3-second timer has elapsed.
 *       b) window "load" event has fired.
 *  5. Dismissal triggers a smooth cinematic fade-out, then
 *     navigates to boot.html once the animation completes.
 * ============================================================
 */

(function () {
  "use strict";

  /* ── Configuration ─────────────────────────────────────── */
  const MIN_DISPLAY_MS   = 3000;   // Minimum time (ms) preloader must be visible
  const FADE_DURATION_MS = 800;    // Fade-out animation duration (ms) — must match CSS
  const TARGET_PAGE      = "boot.html"; // Page to navigate to after preloader

  /* ── State flags ────────────────────────────────────────── */
  let minTimerDone = false;  // true once MIN_DISPLAY_MS has elapsed
  let pageLoaded   = false;  // true once window "load" event fires

  /* ── Grab the preloader element ─────────────────────────── */
  const preloader = document.getElementById("preloader");

  /* ── Responsiveness: scale Figma frame to viewport ─────── */
  function fitFigmaFrame() {
    const scale = Math.min(
      window.innerWidth  / 1920,
      window.innerHeight / 1080
    );
    document.documentElement.style.setProperty("--frame-scale", scale.toString());
  }
  window.addEventListener("resize", fitFigmaFrame, { passive: true });
  fitFigmaFrame(); // run once immediately

  /* ── Scroll lock helpers ────────────────────────────────── */

  /**
   * lockScroll()
   * Disables page scrolling and blocks pointer events on the
   * document body while the preloader is active.
   */
  function lockScroll() {
    document.body.style.overflow   = "hidden";
    document.body.style.userSelect = "none";
  }

  /**
   * unlockScroll()
   * Restores normal scrolling and pointer interaction after
   * the preloader has been dismissed.
   */
  function unlockScroll() {
    document.body.style.overflow   = "";
    document.body.style.userSelect = "";
  }

  /* ── Preloader dismissal ────────────────────────────────── */

  /**
   * tryDismiss()
   * Called whenever either condition becomes true.
   * Only proceeds when BOTH conditions are satisfied.
   * Triggers the cinematic fade-out transition.
   */
  function tryDismiss() {
    if (!minTimerDone || !pageLoaded) return; // gate — both must be true

    // Kick off CSS fade-out by adding the class
    preloader.classList.add("preloader--fade-out");

    // After the animation completes, restore scroll and navigate
    setTimeout(function () {
      unlockScroll();
      window.location.href = TARGET_PAGE;
    }, FADE_DURATION_MS);
  }

  /* ── Minimum display timer ──────────────────────────────── */

  /**
   * Start the 3-second minimum timer as soon as the script runs
   * (which is deferred to DOMContentLoaded via the script tag position).
   */
  setTimeout(function () {
    minTimerDone = true;
    tryDismiss();
  }, MIN_DISPLAY_MS);

  /* ── Page fully loaded detection ───────────────────────── */

  /**
   * window "load" fires after ALL resources — images, stylesheets,
   * scripts, fonts, iframes, and videos — have finished loading.
   * This is intentionally different from DOMContentLoaded.
   */
  window.addEventListener("load", function () {
    pageLoaded = true;
    tryDismiss();
  });

  /* ── Fallback: if window already loaded before script ran ── */
  // This can happen in rare cases (e.g., cached pages).
  if (document.readyState === "complete") {
    pageLoaded = true;
    tryDismiss();
  }

  /* ── Lock scroll immediately ────────────────────────────── */
  lockScroll();

})(); // IIFE — no global namespace pollution

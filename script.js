function fitFigmaFrame() {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  document.documentElement.style.setProperty("--frame-scale", scale.toString());
}

window.addEventListener("resize", fitFigmaFrame, { passive: true });
fitFigmaFrame();

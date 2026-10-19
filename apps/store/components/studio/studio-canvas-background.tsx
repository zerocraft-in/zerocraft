"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/** A slow CRT grid and scanning beam; deliberately contains no particle layer. */
export default function StudioCanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animation = { phase: 0 };
    let width = 0;
    let height = 0;
    let ratio = 1;

    const draw = () => {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const violetGlow = context.createRadialGradient(width * .48, height * .18, 0, width * .48, height * .18, Math.max(width, height) * .66);
      violetGlow.addColorStop(0, "rgba(118, 63, 184, .09)");
      violetGlow.addColorStop(.55, "rgba(60, 42, 99, .035)");
      violetGlow.addColorStop(1, "rgba(8, 10, 16, 0)");
      context.fillStyle = violetGlow;
      context.fillRect(0, 0, width, height);

      const blueGlow = context.createRadialGradient(width * .82, height * .66, 0, width * .82, height * .66, Math.max(width, height) * .48);
      blueGlow.addColorStop(0, "rgba(35, 99, 183, .045)");
      blueGlow.addColorStop(1, "rgba(8, 10, 16, 0)");
      context.fillStyle = blueGlow;
      context.fillRect(0, 0, width, height);

      const gridStep = width < 720 ? 52 : 44;
      context.lineWidth = 1;
      context.strokeStyle = "rgba(176, 165, 255, .038)";
      context.beginPath();
      for (let x = gridStep / 2; x < width; x += gridStep) {
        context.moveTo(Math.round(x) + .5, 0);
        context.lineTo(Math.round(x) + .5, height);
      }
      for (let y = gridStep / 2; y < height; y += gridStep) {
        context.moveTo(0, Math.round(y) + .5);
        context.lineTo(width, Math.round(y) + .5);
      }
      context.stroke();

      const sweepY = ((animation.phase % 1) * (height + 160)) - 80;
      const beam = context.createLinearGradient(0, sweepY - 55, 0, sweepY + 55);
      beam.addColorStop(0, "rgba(188, 139, 255, 0)");
      beam.addColorStop(.5, "rgba(177, 135, 255, .055)");
      beam.addColorStop(1, "rgba(89, 180, 255, 0)");
      context.fillStyle = beam;
      context.fillRect(0, sweepY - 55, width, 110);

      const edge = context.createLinearGradient(0, 0, width, height);
      edge.addColorStop(0, "rgba(0, 0, 0, .02)");
      edge.addColorStop(.5, "rgba(0, 0, 0, 0)");
      edge.addColorStop(1, "rgba(0, 0, 0, .24)");
      context.fillStyle = edge;
      context.fillRect(0, 0, width, height);
    };

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      draw();
    };

    const ticker = (_time: number, delta: number) => {
      animation.phase = (animation.phase + delta / 22_000) % 1;
      draw();
    };
    const syncMotion = () => {
      gsap.ticker.remove(ticker);
      if (!reduceMotion.matches) gsap.ticker.add(ticker);
      else draw();
    };

    resize();
    syncMotion();
    window.addEventListener("resize", resize, { passive: true });
    reduceMotion.addEventListener("change", syncMotion);
    return () => {
      gsap.ticker.remove(ticker);
      window.removeEventListener("resize", resize);
      reduceMotion.removeEventListener("change", syncMotion);
    };
  }, []);

  return <canvas ref={canvasRef} className="studio-canvas-background" aria-hidden="true" />;
}

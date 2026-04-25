"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#7c6af7", "#4ade80", "#facc15", "#f472b6", "#38bdf8"];
const PARTICLE_COUNT = 60;

interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; alpha: number; rotation: number; rotSpeed: number;
}

interface Props {
  active: boolean;
}

export function Confetti({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;

    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    particles.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: cx, y: cy,
      vx: (Math.random() - 0.5) * 12,
      vy: -(Math.random() * 10 + 4),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 6 + 4,
      alpha: 1,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current = particles.current.filter((p) => p.alpha > 0.05);
      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // gravity
        p.alpha -= 0.018;
        p.rotation += p.rotSpeed;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
      }
      if (particles.current.length > 0) rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", borderRadius: "inherit",
      }}
    />
  );
}

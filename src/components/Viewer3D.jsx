// src/components/Viewer3D.jsx

import { useRef, useEffect, useCallback } from "react";

const COLORS = [
  "#0071E3", "#34C759", "#FF9500", "#FF3B30", "#AF52DE",
  "#FF2D55", "#5AC8FA", "#FFCC00", "#30B0C7", "#A2845E",
];

export default function Viewer3D({ result, items }) {
  const ref = useRef(null);
  const ang = useRef(0);
  const raf = useRef(null);

  const draw = useCallback(() => {
    const c = ref.current;
    if (!c || !result) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = c.width / dpr;
    const H = c.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const box = result.box;
    const maxD = Math.max(box.w, box.h, box.d);
    const sc = Math.min(W, H) * 0.26 / maxD;
    const cx = W / 2, cy = H / 2 + 10;
    const a = ang.current;
    const ca = Math.cos(a), sa = Math.sin(a);
    const tilt = 0.55;
    const ct = Math.cos(tilt), st = Math.sin(tilt);

    function proj(x, y, z) {
      const rx = x * ca - z * sa;
      const rz = x * sa + z * ca;
      return [cx + rx * sc, cy - (y * ct - rz * st) * sc, y * st + rz * ct];
    }

    function drawCube(ox, oy, oz, w, h, d, fill, strokeC, alpha = 1) {
      const v = [
        [ox, oz + d, oy], [ox + w, oz + d, oy],
        [ox + w, oz + d, oy + h], [ox, oz + d, oy + h],
        [ox, oz, oy], [ox + w, oz, oy],
        [ox + w, oz, oy + h], [ox, oz, oy + h],
      ];
      const p = v.map((q) =>
        proj(q[0] - box.w / 2, q[1] - box.d / 2, q[2] - box.h / 2)
      );
      const faces = [
        { i: [4, 5, 1, 0], s: 0.92 },
        { i: [5, 6, 2, 1], s: 0.82 },
        { i: [0, 1, 2, 3], s: 1.0 },
      ];

      ctx.globalAlpha = alpha;
      for (const f of faces) {
        const pts = f.i.map((j) => p[j]);
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        pts.slice(1).forEach((pt) => ctx.lineTo(pt[0], pt[1]));
        ctx.closePath();
        if (fill) {
          const r = parseInt(fill.slice(1, 3), 16);
          const g = parseInt(fill.slice(3, 5), 16);
          const b = parseInt(fill.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${(r * f.s) | 0},${(g * f.s) | 0},${(b * f.s) | 0},${alpha})`;
          ctx.fill();
        }
        ctx.strokeStyle = strokeC || "rgba(0,0,0,0.06)";
        ctx.lineWidth = fill ? 0.5 : 1.2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Back wireframe
    drawCube(0, 0, 0, box.w, box.h, box.d, null, "rgba(0,0,0,0.08)");

    // Sort by depth
    const sorted = [...result.placements].sort((a, b) => {
      const pa = proj(a.px - box.w / 2, a.pz - box.d / 2, a.py - box.h / 2);
      const pb = proj(b.px - box.w / 2, b.pz - box.d / 2, b.py - box.h / 2);
      return pa[2] - pb[2];
    });

    // Draw items
    sorted.forEach((pl) => {
      const idx = items.findIndex((it) => it.id === pl.id);
      drawCube(
        pl.px, pl.py, pl.pz, pl.pw, pl.ph, pl.pd,
        COLORS[idx % COLORS.length],
        "rgba(255,255,255,0.3)",
        0.92
      );
    });

    // Front wireframe
    drawCube(0, 0, 0, box.w, box.h, box.d, null, "rgba(0,0,0,0.12)");

    ang.current += 0.007;
    raf.current = requestAnimationFrame(draw);
  }, [result, items]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    draw();
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={ref}
      style={{
        width: "100%",
        height: 320,
        borderRadius: 20,
        background: "#F5F5F7",
      }}
    />
  );
}

// src/utils/packer.js

/**
 * Standard shipping boxes (dimensions in cm internally)
 */
export const STANDARD_BOXES = [
  { w: 15.24, h: 15.24, d: 15.24 },  // 6×6×6"
  { w: 20.32, h: 20.32, d: 20.32 },  // 8×8×8"
  { w: 25.4,  h: 25.4,  d: 25.4 },   // 10×10×10"
  { w: 30.48, h: 30.48, d: 30.48 },  // 12×12×12"
  { w: 35.56, h: 35.56, d: 35.56 },  // 14×14×14"
  { w: 40.64, h: 40.64, d: 40.64 },  // 16×16×16"
  { w: 45.72, h: 45.72, d: 45.72 },  // 18×18×18"
  { w: 50.8,  h: 50.8,  d: 50.8 },   // 20×20×20"
  { w: 60.96, h: 45.72, d: 45.72 },  // 24×18×18"
  { w: 25.4,  h: 20.32, d: 15.24 },  // 10×8×6"
  { w: 35.56, h: 25.4,  d: 15.24 },  // 14×10×6"
  { w: 45.72, h: 35.56, d: 20.32 },  // 18×14×8"
  { w: 60.96, h: 45.72, d: 15.24 },  // 24×18×6"
  { w: 50.8,  h: 25.4,  d: 25.4 },   // 20×10×10"
  { w: 76.2,  h: 25.4,  d: 25.4 },   // 30×10×10"
];

export const CARRIERS = [
  { name: "FedEx",  factor: 5000 },
  { name: "UPS",    factor: 5000 },
  { name: "DHL",    factor: 5000 },
  { name: "USPS",   factor: 5454 },
];

/**
 * Attempt to pack items into a given box using first-fit decreasing.
 * Returns array of placements or null if items don't fit.
 */
export function tryPack(items, box) {
  const sorted = [...items].sort(
    (a, b) => b.w * b.h * b.d - (a.w * a.h * a.d)
  );
  const placements = [];
  const bw = Math.ceil(box.w),
    bh = Math.ceil(box.h),
    bd = Math.ceil(box.d);
  const grid = new Uint8Array(bw * bh * bd);

  function canPlace(x, y, z, w, h, d) {
    if (x + w > box.w + 0.01 || y + h > box.h + 0.01 || z + d > box.d + 0.01)
      return false;
    for (let i = Math.floor(x); i < Math.ceil(x + w); i++)
      for (let j = Math.floor(y); j < Math.ceil(y + h); j++)
        for (let k = Math.floor(z); k < Math.ceil(z + d); k++) {
          if (i >= bw || j >= bh || k >= bd) return false;
          if (grid[i * bh * bd + j * bd + k]) return false;
        }
    return true;
  }

  function place(x, y, z, w, h, d) {
    for (let i = Math.floor(x); i < Math.ceil(x + w); i++)
      for (let j = Math.floor(y); j < Math.ceil(y + h); j++)
        for (let k = Math.floor(z); k < Math.ceil(z + d); k++)
          if (i < bw && j < bh && k < bd)
            grid[i * bh * bd + j * bd + k] = 1;
  }

  for (const item of sorted) {
    const rotations = [
      [item.w, item.h, item.d],
      [item.w, item.d, item.h],
      [item.h, item.w, item.d],
      [item.h, item.d, item.w],
      [item.d, item.w, item.h],
      [item.d, item.h, item.w],
    ];
    let placed = false;
    for (let z = 0; z < bd && !placed; z++)
      for (let y = 0; y < bh && !placed; y++)
        for (let x = 0; x < bw && !placed; x++)
          for (const [rw, rh, rd] of rotations) {
            if (canPlace(x, y, z, rw, rh, rd)) {
              place(x, y, z, rw, rh, rd);
              placements.push({
                ...item,
                px: x, py: y, pz: z,
                pw: rw, ph: rh, pd: rd,
              });
              placed = true;
              break;
            }
          }
    if (!placed) return null;
  }
  return placements;
}

/**
 * Find the smallest standard box that fits all items.
 */
export function findBestBox(items) {
  let best = null;
  for (const box of STANDARD_BOXES) {
    const result = tryPack(items, box);
    if (result) {
      const boxVol = box.w * box.h * box.d;
      const itemVol = items.reduce((s, i) => s + i.w * i.h * i.d, 0);
      if (!best || boxVol < best.boxVol) {
        best = {
          box,
          placements: result,
          boxVol,
          itemVol,
          efficiency: (itemVol / boxVol) * 100,
        };
      }
    }
  }
  return best;
}

/**
 * Expand items by quantity into individual items.
 */
export function expandItems(items) {
  const out = [];
  items.forEach((item) => {
    for (let q = 0; q < (item.qty || 1); q++) {
      out.push({ ...item, id: item.id * 100 + q });
    }
  });
  return out;
}

/**
 * Calculate volumetric weight for a carrier.
 */
export function calcVolWeight(w, h, d, factor) {
  return (w * h * d) / factor;
}

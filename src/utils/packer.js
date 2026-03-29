// src/utils/packer.js

/**
 * Standard shipping boxes (dimensions in cm)
 */
export const STANDARD_BOXES = [
  { w: 10,    h: 10,    d: 10 },
  { w: 15.24, h: 15.24, d: 15.24 },
  { w: 20.32, h: 20.32, d: 20.32 },
  { w: 25.4,  h: 25.4,  d: 25.4 },
  { w: 30.48, h: 30.48, d: 30.48 },
  { w: 35.56, h: 35.56, d: 35.56 },
  { w: 40.64, h: 40.64, d: 40.64 },
  { w: 45.72, h: 45.72, d: 45.72 },
  { w: 50.8,  h: 50.8,  d: 50.8 },
  { w: 60.96, h: 45.72, d: 45.72 },
  { w: 60.96, h: 60.96, d: 60.96 },
  { w: 76.2,  h: 50.8,  d: 50.8 },
  { w: 25.4,  h: 20.32, d: 10 },
  { w: 25.4,  h: 20.32, d: 15.24 },
  { w: 35.56, h: 25.4,  d: 15.24 },
  { w: 45.72, h: 35.56, d: 20.32 },
  { w: 60.96, h: 45.72, d: 15.24 },
  { w: 40,    h: 15,    d: 15 },
  { w: 50.8,  h: 25.4,  d: 25.4 },
  { w: 76.2,  h: 25.4,  d: 25.4 },
  { w: 90,    h: 20,    d: 20 },
];

/**
 * Carriers: international + LATAM
 */
export const CARRIERS = [
  { name: "FedEx",            factor: 5000, region: "intl" },
  { name: "UPS",              factor: 5000, region: "intl" },
  { name: "DHL",              factor: 5000, region: "intl" },
  { name: "USPS",             factor: 5454, region: "intl" },
  { name: "Mercado Envíos",   factor: 5000, region: "latam" },
  { name: "Correo Argentino", factor: 6000, region: "latam" },
  { name: "Andreani",         factor: 5000, region: "latam" },
  { name: "Estafeta",         factor: 5000, region: "latam" },
  { name: "Servientrega",     factor: 5000, region: "latam" },
  { name: "Correios",         factor: 6000, region: "latam" },
  { name: "Chilexpress",      factor: 5000, region: "latam" },
];

export function getCarriers(region) {
  if (region === "intl") return CARRIERS.filter(c => c.region === "intl");
  if (region === "latam") return CARRIERS.filter(c => c.region === "latam");
  return CARRIERS;
}

export function tryPack(items, box) {
  const sorted = [...items].sort((a, b) => (b.w * b.h * b.d) - (a.w * a.h * a.d));
  const placements = [];
  const bw = Math.ceil(box.w), bh = Math.ceil(box.h), bd = Math.ceil(box.d);
  const grid = new Uint8Array(bw * bh * bd);

  function canPlace(x, y, z, w, h, d) {
    if (x + w > box.w + 0.01 || y + h > box.h + 0.01 || z + d > box.d + 0.01) return false;
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
          if (i < bw && j < bh && k < bd) grid[i * bh * bd + j * bd + k] = 1;
  }

  for (const item of sorted) {
    const rots = [[item.w,item.h,item.d],[item.w,item.d,item.h],[item.h,item.w,item.d],[item.h,item.d,item.w],[item.d,item.w,item.h],[item.d,item.h,item.w]];
    let placed = false;
    for (let z = 0; z < bd && !placed; z++)
      for (let y = 0; y < bh && !placed; y++)
        for (let x = 0; x < bw && !placed; x++)
          for (const [rw, rh, rd] of rots) {
            if (canPlace(x, y, z, rw, rh, rd)) {
              place(x, y, z, rw, rh, rd);
              placements.push({ ...item, px: x, py: y, pz: z, pw: rw, ph: rh, pd: rd });
              placed = true;
              break;
            }
          }
    if (!placed) return null;
  }
  return placements;
}

export function findBestBox(items) {
  let best = null;
  for (const box of STANDARD_BOXES) {
    const res = tryPack(items, box);
    if (res) {
      const bv = box.w * box.h * box.d;
      const iv = items.reduce((s, i) => s + i.w * i.h * i.d, 0);
      if (!best || bv < best.boxVol)
        best = { box, placements: res, boxVol: bv, itemVol: iv, efficiency: (iv / bv) * 100 };
    }
  }
  return best;
}

/**
 * Multi-box: splits items across multiple boxes when they don't fit in one.
 */
export function findMultiBox(items) {
  const single = findBestBox(items);
  if (single) return [single];

  const sorted = [...items].sort((a, b) => (b.w * b.h * b.d) - (a.w * a.h * a.d));
  const boxes = [];
  let remaining = [...sorted];

  while (remaining.length > 0 && boxes.length < 20) {
    let bestResult = null;
    let bestPacked = [];

    const boxesBySize = [...STANDARD_BOXES].sort((a, b) => (b.w * b.h * b.d) - (a.w * a.h * a.d));
    for (const box of boxesBySize) {
      const tryItems = [];
      for (const item of remaining) {
        const test = [...tryItems, item];
        if (tryPack(test, box)) tryItems.push(item);
      }
      if (tryItems.length > 0) {
        const optimal = findBestBox(tryItems);
        if (optimal && (!bestResult || tryItems.length > bestPacked.length ||
          (tryItems.length === bestPacked.length && optimal.efficiency > bestResult.efficiency))) {
          bestResult = optimal;
          bestPacked = tryItems;
        }
      }
      if (tryItems.length === remaining.length) break;
    }

    if (!bestResult || bestPacked.length === 0) {
      const item = remaining.shift();
      const sr = findBestBox([item]);
      if (sr) { boxes.push(sr); }
      else {
        boxes.push({
          box: { w: item.w + 4, h: item.h + 4, d: item.d + 4 },
          placements: [{ ...item, px: 2, py: 2, pz: 2, pw: item.w, ph: item.h, pd: item.d }],
          boxVol: (item.w + 4) * (item.h + 4) * (item.d + 4),
          itemVol: item.w * item.h * item.d,
          efficiency: (item.w * item.h * item.d) / ((item.w + 4) * (item.h + 4) * (item.d + 4)) * 100,
          isCustom: true,
        });
      }
    } else {
      boxes.push(bestResult);
      const ids = new Set(bestPacked.map(i => i.id));
      remaining = remaining.filter(i => !ids.has(i.id));
    }
  }
  return boxes;
}

export function expandItems(items) {
  const out = [];
  items.forEach(i => { for (let q = 0; q < (i.qty || 1); q++) out.push({ ...i, id: i.id * 100 + q }); });
  return out;
}

export function calcVolWeight(w, h, d, factor) {
  return (w * h * d) / factor;
}

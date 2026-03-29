// src/utils/units.js

// Conversion constants
const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.453592;
const LITERS_PER_CUBIC_FOOT = 28.3168;

/**
 * All internal calculations use METRIC (cm, kg).
 * These helpers convert for display and input only.
 */

// ── Display conversions (internal metric → user-facing) ──

export function cmToDisplay(cm, system) {
  if (system === "imperial") return +(cm / CM_PER_INCH).toFixed(1);
  return +cm.toFixed(1);
}

export function kgToDisplay(kg, system) {
  if (system === "imperial") return +(kg / KG_PER_LB).toFixed(1);
  return +kg.toFixed(1);
}

export function volumeToDisplay(cubicCm, system) {
  if (system === "imperial") {
    const cubicFt = cubicCm / (LITERS_PER_CUBIC_FOOT * 1000);
    return +cubicFt.toFixed(2);
  }
  return +(cubicCm / 1000).toFixed(1); // liters
}

// ── Input conversions (user input → internal metric) ──

export function displayToCm(value, system) {
  if (system === "imperial") return +(value * CM_PER_INCH).toFixed(2);
  return +value;
}

export function displayToKg(value, system) {
  if (system === "imperial") return +(value * KG_PER_LB).toFixed(3);
  return +value;
}

// ── Box name formatting ──

export function formatBoxName(box, system) {
  if (system === "imperial") {
    const w = (box.w / CM_PER_INCH).toFixed(0);
    const h = (box.h / CM_PER_INCH).toFixed(0);
    const d = (box.d / CM_PER_INCH).toFixed(0);
    return `${w}×${h}×${d}"`;
  }
  return `${box.w.toFixed(0)}×${box.h.toFixed(0)}×${box.d.toFixed(0)} cm`;
}

// ── Default product dimensions by system ──

export function defaultDimensions(system) {
  if (system === "imperial") {
    return { w: 6, h: 4, d: 3, weight: 1 }; // inches, lbs
  }
  return { w: 15, h: 10, d: 8, weight: 0.5 }; // cm, kg
}

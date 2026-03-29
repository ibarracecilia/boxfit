// src/App.jsx

import { useState, useRef } from "react";
import { translations } from "./i18n/translations";
import {
  cmToDisplay,
  kgToDisplay,
  volumeToDisplay,
  displayToCm,
  displayToKg,
  formatBoxName,
  defaultDimensions,
} from "./utils/units";
import {
  findBestBox,
  expandItems,
  calcVolWeight,
  CARRIERS,
} from "./utils/packer";
import { detectProduct, getPackingTips } from "./utils/ai";
import Viewer3D from "./components/Viewer3D";
import "./App.css";

const COLORS = [
  "#0071E3", "#34C759", "#FF9500", "#FF3B30", "#AF52DE",
  "#FF2D55", "#5AC8FA", "#FFCC00", "#30B0C7", "#A2845E",
];

export default function App() {
  const [lang, setLang] = useState("es");
  const t = translations[lang];
  const sys = t.system; // "metric" | "imperial"

  const [items, setItems] = useState([]);
  const [result, setResult] = useState(null);
  const [aiTips, setAiTips] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [view, setView] = useState("home"); // home | items | result
  const [nextId, setNextId] = useState(1);
  const [detecting, setDetecting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef(null);

  // ── Item CRUD ──
  // Items are stored INTERNALLY in metric (cm, kg) always.
  // Display values are converted on render; input values are converted on change.

  const addManual = () => {
    const def = defaultDimensions(sys);
    // Convert display defaults to internal metric
    setItems((p) => [
      ...p,
      {
        id: nextId,
        name: `Product ${nextId}`,
        w: displayToCm(def.w, sys),
        h: displayToCm(def.h, sys),
        d: displayToCm(def.d, sys),
        weight: displayToKg(def.weight, sys),
        qty: 1,
      },
    ]);
    setNextId((n) => n + 1);
    if (view === "home") setView("items");
  };

  const removeItem = (id) => setItems((p) => p.filter((i) => i.id !== id));

  const updateItem = (id, field, displayValue) => {
    setItems((p) =>
      p.map((item) => {
        if (item.id !== id) return item;
        if (field === "name") return { ...item, name: displayValue };
        if (field === "qty")
          return { ...item, qty: Math.max(1, parseInt(displayValue) || 1) };

        const num = parseFloat(displayValue) || 0.1;
        if (field === "weight") {
          return { ...item, weight: displayToKg(Math.max(0.1, num), sys) };
        }
        // w, h, d
        return { ...item, [field]: displayToCm(Math.max(0.1, num), sys) };
      })
    );
  };

  // ── Photo handling ──

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      const mediaType = file.type || "image/jpeg";
      setPhotoPreview(ev.target.result);
      setDetecting(true);
      if (view === "home") setView("items");

      try {
        // AI returns cm/kg always
        const detected = await detectProduct(base64, mediaType);
        setItems((p) => [
          ...p,
          {
            id: nextId,
            name: detected.name || "Product",
            w: detected.w || 15,
            h: detected.h || 10,
            d: detected.d || 8,
            weight: detected.weight || 0.5,
            qty: 1,
          },
        ]);
        setNextId((n) => n + 1);
      } catch {
        setItems((p) => [
          ...p,
          {
            id: nextId,
            name: "Product",
            w: 15, h: 10, d: 8, weight: 0.5, qty: 1,
          },
        ]);
        setNextId((n) => n + 1);
      }
      setDetecting(false);
      setPhotoPreview(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Optimize ──

  const optimize = () => {
    const exp = expandItems(items);
    const best = findBestBox(exp);
    setResult(best);
    setView("result");
    if (best) {
      setLoadingAi(true);
      setAiTips("");
      getPackingTips(best, exp, lang)
        .then(setAiTips)
        .catch(() =>
          setAiTips(
            lang === "es"
              ? "No se pudo conectar. Los resultados siguen siendo válidos."
              : "Could not connect. Results are still valid."
          )
        )
        .finally(() => setLoadingAi(false));
    }
  };

  // ── Computed values ──

  const expanded = expandItems(items);
  const totalW = expanded.reduce((s, i) => s + (i.weight || 0.5), 0);
  const totalV = expanded.reduce((s, i) => s + i.w * i.h * i.d, 0);
  const totalQty = items.reduce((s, i) => s + (i.qty || 1), 0);

  // ── Render ──

  return (
    <div className="app">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="logo">B</div>
          <span className="brand-name">{t.appName}</span>
        </div>
        <button
          className="lang-toggle"
          onClick={() => setLang((l) => (l === "en" ? "es" : "en"))}
        >
          {t.switchLang}
        </button>
      </nav>

      <main className="main">
        {/* ── HOME ── */}
        {view === "home" && (
          <div className="home fade-up">
            <div className="hero-icon">📦</div>
            <h1 className="hero-title">{t.tagline}</h1>
            <p className="hero-desc">{t.heroDesc}</p>

            <button
              className="btn-primary btn-photo"
              onClick={() => fileRef.current?.click()}
            >
              <CameraIcon />
              {t.addPhoto}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={handlePhoto}
            />
            <p className="photo-hint">{t.photoHint}</p>

            <div className="divider">
              <span>{t.orManual}</span>
            </div>

            <button className="btn-secondary" onClick={addManual}>
              {t.addProduct}
            </button>
          </div>
        )}

        {/* ── ITEMS ── */}
        {view === "items" && (
          <div className="fade-in">
            <div className="section-header">
              <h2>{t.products}</h2>
              <div className="header-actions">
                <button
                  className="btn-primary btn-sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <CameraIcon size={16} />
                  Foto
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={handlePhoto}
                />
                <button className="btn-secondary btn-sm" onClick={addManual}>
                  + Manual
                </button>
              </div>
            </div>

            {detecting && (
              <div className="detecting-card scale-in">
                {photoPreview && (
                  <img src={photoPreview} alt="" className="detect-preview" />
                )}
                <div className="detect-info">
                  <div className="spinner" />
                  <span>{t.detecting}</span>
                </div>
              </div>
            )}

            {items.length === 0 && !detecting && (
              <div className="empty-state">
                <p className="empty-icon">📷</p>
                <p>
                  {t.addPhoto} {t.orManual}
                </p>
              </div>
            )}

            {items.map((item, idx) => (
              <div key={item.id} className="item-card scale-in">
                <div className="item-header">
                  <div
                    className="item-dot"
                    style={{ background: COLORS[idx % COLORS.length] }}
                  />
                  <input
                    type="text"
                    className="item-name"
                    value={item.name}
                    onChange={(e) =>
                      updateItem(item.id, "name", e.target.value)
                    }
                  />
                  <button
                    className="item-remove"
                    onClick={() => removeItem(item.id)}
                  >
                    ×
                  </button>
                </div>
                <div className="item-fields">
                  {[
                    { label: `${t.width} (${t.unit})`, field: "w" },
                    { label: `${t.height} (${t.unit})`, field: "h" },
                    { label: `${t.depth} (${t.unit})`, field: "d" },
                    { label: `${t.weight} (${t.weightUnit})`, field: "weight" },
                    { label: t.qty, field: "qty" },
                  ].map((f) => (
                    <div key={f.field} className="field">
                      <label>{f.label}</label>
                      <input
                        type="number"
                        step={f.field === "qty" ? "1" : "0.1"}
                        value={
                          f.field === "qty"
                            ? item.qty
                            : f.field === "weight"
                            ? kgToDisplay(item.weight, sys)
                            : cmToDisplay(item[f.field], sys)
                        }
                        onChange={(e) =>
                          updateItem(item.id, f.field, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {items.length > 0 && (
              <>
                <div className="summary-grid">
                  <div className="summary-card">
                    <span className="summary-label">{t.totalItems}</span>
                    <span className="summary-value">{totalQty}</span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">{t.totalVolume}</span>
                    <span className="summary-value">
                      {volumeToDisplay(totalV, sys)} {t.volumeUnit}
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">{t.totalWeight}</span>
                    <span className="summary-value">
                      {kgToDisplay(totalW, sys)} {t.weightUnit}
                    </span>
                  </div>
                </div>

                <button className="btn-dark btn-full" onClick={optimize}>
                  {t.optimize} →
                </button>
              </>
            )}
          </div>
        )}

        {/* ── RESULT ── */}
        {view === "result" && result && (
          <div className="fade-up">
            <button
              className="btn-back"
              onClick={() => setView("items")}
            >
              ← {t.editProducts}
            </button>

            <h2 className="section-title">{t.results}</h2>

            {/* 3D Viewer */}
            <div className="viewer-wrapper scale-in">
              <Viewer3D result={result} items={expanded} />
              <div className="viewer-label">
                <span className="viewer-label-sub">{t.bestBox}</span>
                <span className="viewer-label-main">
                  {formatBoxName(result.box, sys)}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="metrics-grid">
              <div className="metric-card">
                <span className="metric-label">{t.efficiency}</span>
                <span
                  className="metric-value"
                  style={{
                    color:
                      result.efficiency > 70
                        ? "#34C759"
                        : result.efficiency > 50
                        ? "#FF9500"
                        : "#FF3B30",
                  }}
                >
                  {result.efficiency.toFixed(0)}%
                </span>
                <span className="metric-sub">{t.spaceUsed}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">{t.dimensions}</span>
                <span className="metric-value metric-value-sm">
                  {formatBoxName(result.box, sys)}
                </span>
              </div>
            </div>

            {/* Carriers */}
            <div className="card">
              <h3>{t.charges}</h3>
              {CARRIERS.map((carrier, i) => {
                const vw = calcVolWeight(
                  result.box.w,
                  result.box.h,
                  result.box.d,
                  carrier.factor
                );
                const billable = Math.max(totalW, vw);
                const isVol = vw > totalW;
                const maxVw = Math.max(
                  ...CARRIERS.map((c) =>
                    calcVolWeight(
                      result.box.w,
                      result.box.h,
                      result.box.d,
                      c.factor
                    )
                  )
                );
                return (
                  <div key={i} className="carrier-row">
                    <span className="carrier-name">{carrier.name}</span>
                    <div className="carrier-bar">
                      <div
                        className="carrier-fill"
                        style={{
                          width: `${Math.min(100, (vw / (maxVw * 1.2)) * 100)}%`,
                          background: isVol ? "#FF9500" : "#34C759",
                        }}
                      />
                    </div>
                    <div className="carrier-info">
                      <span className="carrier-weight">
                        {kgToDisplay(billable, sys)} {t.weightUnit}
                      </span>
                      <span
                        className="carrier-badge"
                        style={{
                          color: isVol ? "#FF9500" : "#34C759",
                          background: isVol
                            ? "rgba(255,149,0,0.1)"
                            : "rgba(52,199,89,0.1)",
                        }}
                      >
                        {isVol ? t.volWeight : t.realWeight}
                      </span>
                    </div>
                  </div>
                );
              })}
              <p className="carrier-note">
                {CARRIERS.some(
                  (c) =>
                    calcVolWeight(
                      result.box.w,
                      result.box.h,
                      result.box.d,
                      c.factor
                    ) > totalW
                )
                  ? t.volNote
                  : t.realNote}
              </p>
            </div>

            {/* AI Tips */}
            <div className="card ai-card">
              <div className="ai-header">
                <div className="ai-badge">AI</div>
                <div>
                  <h3>{t.aiTips}</h3>
                  {loadingAi && (
                    <p className="ai-loading">{t.analyzing}</p>
                  )}
                </div>
              </div>
              {aiTips && <p className="ai-text">{aiTips}</p>}
            </div>

            <button
              className="btn-secondary btn-full"
              onClick={() => {
                setResult(null);
                setView("items");
              }}
            >
              {t.tryAgain}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function CameraIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

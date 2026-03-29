// src/App.jsx — BoxFit v2

import { useState, useRef } from "react";
import { translations } from "./i18n/translations";
import { cmToDisplay, kgToDisplay, volumeToDisplay, displayToCm, displayToKg, formatBoxName, defaultDimensions } from "./utils/units";
import { findBestBox, findMultiBox, expandItems, calcVolWeight, getCarriers } from "./utils/packer";
import { detectProduct, getPackingTips } from "./utils/ai";
import Viewer3D from "./components/Viewer3D";
import "./App.css";

const COLORS = ["#0071E3","#34C759","#FF9500","#FF3B30","#AF52DE","#FF2D55","#5AC8FA","#FFCC00","#30B0C7","#A2845E"];

function CameraIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>;
}

export default function App() {
  const [lang, setLang] = useState("es");
  const t = translations[lang];
  const sys = t.system;

  const [items, setItems] = useState([]);
  const [results, setResults] = useState(null); // array of box results (multi-box)
  const [aiTips, setAiTips] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [view, setView] = useState("home");
  const [nextId, setNextId] = useState(1);
  const [detecting, setDetecting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [carrierRegion, setCarrierRegion] = useState("all");
  const [activeBox, setActiveBox] = useState(0);
  const fileRef = useRef(null);

  // ── Item CRUD ──
  const addManual = () => {
    const def = defaultDimensions(sys);
    setItems(p => [...p, {
      id: nextId, name: `Product ${nextId}`,
      w: displayToCm(def.w, sys), h: displayToCm(def.h, sys),
      d: displayToCm(def.d, sys), weight: displayToKg(def.weight, sys), qty: 1,
    }]);
    setNextId(n => n + 1);
    if (view === "home") setView("items");
  };

  const removeItem = (id) => setItems(p => p.filter(i => i.id !== id));

  const updateItem = (id, f, v) => {
    setItems(p => p.map(item => {
      if (item.id !== id) return item;
      if (f === "name") return { ...item, name: v };
      if (f === "qty") return { ...item, qty: Math.max(1, parseInt(v) || 1) };
      const num = parseFloat(v) || 0.1;
      if (f === "weight") return { ...item, weight: displayToKg(Math.max(0.1, num), sys) };
      return { ...item, [f]: displayToCm(Math.max(0.1, num), sys) };
    }));
  };

  // ── Photo ──
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
        const det = await detectProduct(base64, mediaType);
        setItems(p => [...p, { id: nextId, name: det.name || "Product", w: det.w || 15, h: det.h || 10, d: det.d || 8, weight: det.weight || 0.5, qty: 1 }]);
        setNextId(n => n + 1);
      } catch {
        setItems(p => [...p, { id: nextId, name: "Product", w: 15, h: 10, d: 8, weight: 0.5, qty: 1 }]);
        setNextId(n => n + 1);
      }
      setDetecting(false);
      setPhotoPreview(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Optimize ──
  const optimize = async () => {
    setOptimizing(true);
    // Small delay for animation
    await new Promise(r => setTimeout(r, 1500));

    const exp = expandItems(items);
    const multiResults = findMultiBox(exp);
    setResults(multiResults);
    setActiveBox(0);
    setOptimizing(false);
    setView("result");

    if (multiResults.length > 0) {
      setLoadingAi(true);
      setAiTips("");
      const mainResult = multiResults[0];
      const allItems = multiResults.flatMap(r => r.placements || []);
      try {
        const tips = await getPackingTips(mainResult, allItems, lang);
        setAiTips(multiResults.length > 1
          ? tips + (lang === "es"
            ? `\n\n📦 Nota: Se necesitan ${multiResults.length} cajas para este envío.`
            : `\n\n📦 Note: ${multiResults.length} boxes needed for this shipment.`)
          : tips);
      } catch {
        setAiTips(lang === "es" ? "No se pudo conectar." : "Could not connect.");
      }
      setLoadingAi(false);
    }
  };

  // ── Computed ──
  const expanded = expandItems(items);
  const totalW = expanded.reduce((s, i) => s + (i.weight || 0.5), 0);
  const totalV = expanded.reduce((s, i) => s + i.w * i.h * i.d, 0);
  const totalQty = items.reduce((s, i) => s + (i.qty || 1), 0);
  const carriers = getCarriers(carrierRegion);
  const currentResult = results?.[activeBox];

  return (
    <div className="app">
      {/* Optimizing overlay */}
      {optimizing && (
        <div className="optimizing-overlay">
          <div className="optimizing-icon">📦</div>
          <p className="optimizing-text">{t.packing}</p>
          <div className="optimizing-bar"><div className="optimizing-fill" /></div>
          <div className="loading-dots" style={{ marginTop: 16 }}>
            <span /><span /><span />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="logo">B</div>
          <span className="brand-name">{t.appName}</span>
        </div>
        <button className="lang-toggle" onClick={() => setLang(l => l === "en" ? "es" : "en")}>
          {t.switchLang}
        </button>
      </nav>

      <main className="main">
        {/* HOME */}
        {view === "home" && (
          <div className="home fade-up">
            <div className="hero-icon">📦</div>
            <h1 className="hero-title">{t.tagline}</h1>
            <p className="hero-desc">{t.heroDesc}</p>
            <button className="btn-primary btn-photo" onClick={() => fileRef.current?.click()}>
              <CameraIcon /> {t.addPhoto}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handlePhoto} />
            <p className="photo-hint">{t.photoHint}</p>
            <div className="divider"><span>{t.orManual}</span></div>
            <button className="btn-secondary" onClick={addManual}>{t.addProduct}</button>
          </div>
        )}

        {/* ITEMS */}
        {view === "items" && (
          <div className="fade-in">
            <div className="section-header">
              <h2>{t.products}</h2>
              <div className="header-actions">
                <button className="btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
                  <CameraIcon size={16} /> Foto
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handlePhoto} />
                <button className="btn-secondary btn-sm" onClick={addManual}>+ Manual</button>
              </div>
            </div>

            {detecting && (
              <div className="detecting-card scale-in">
                {photoPreview && <img src={photoPreview} alt="" className="detect-preview" />}
                <div className="detect-info"><div className="spinner" /><span>{t.detecting}</span></div>
              </div>
            )}

            {items.length === 0 && !detecting && (
              <div className="empty-state"><p className="empty-icon">📷</p><p>{t.addPhoto} {t.orManual}</p></div>
            )}

            {items.map((item, idx) => (
              <div key={item.id} className="item-card scale-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="item-header">
                  <div className="item-dot" style={{ background: COLORS[idx % COLORS.length] }} />
                  <input type="text" className="item-name" value={item.name} onChange={e => updateItem(item.id, "name", e.target.value)} />
                  <button className="item-remove" onClick={() => removeItem(item.id)}>×</button>
                </div>
                <div className="item-fields">
                  {[
                    { label: `${t.width} (${t.unit})`, field: "w" },
                    { label: `${t.height} (${t.unit})`, field: "h" },
                    { label: `${t.depth} (${t.unit})`, field: "d" },
                    { label: `${t.weight} (${t.weightUnit})`, field: "weight" },
                    { label: t.qty, field: "qty" },
                  ].map(f => (
                    <div key={f.field} className="field">
                      <label>{f.label}</label>
                      <input type="number" step={f.field === "qty" ? "1" : "0.1"}
                        value={f.field === "qty" ? item.qty : f.field === "weight" ? kgToDisplay(item.weight, sys) : cmToDisplay(item[f.field], sys)}
                        onChange={e => updateItem(item.id, f.field, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {items.length > 0 && (
              <>
                <div className="summary-grid">
                  {[
                    { label: t.totalItems, value: totalQty },
                    { label: t.totalVolume, value: `${volumeToDisplay(totalV, sys)} ${t.volumeUnit}` },
                    { label: t.totalWeight, value: `${kgToDisplay(totalW, sys)} ${t.weightUnit}` },
                  ].map((m, i) => (
                    <div key={i} className="summary-card"><span className="summary-label">{m.label}</span><span className="summary-value">{m.value}</span></div>
                  ))}
                </div>
                <button className="btn-dark btn-full" onClick={optimize}>{t.optimize} →</button>
              </>
            )}
          </div>
        )}

        {/* RESULT */}
        {view === "result" && results && (
          <div className="fade-up">
            <button className="btn-back" onClick={() => setView("items")}>← {t.editProducts}</button>
            <h2 className="section-title">{t.results}</h2>

            {/* Multi-box banner */}
            {results.length > 1 && (
              <div className="multibox-banner scale-in">
                <h3>📦 ×{results.length} — {t.multiBox}</h3>
                <p>{t.multiBoxDesc}</p>
              </div>
            )}

            {/* Box selector tabs (if multi) */}
            {results.length > 1 && (
              <div className="region-tabs" style={{ marginBottom: 20 }}>
                {results.map((_, i) => (
                  <button key={i} className={`region-tab ${activeBox === i ? "active" : ""}`}
                    onClick={() => setActiveBox(i)}>
                    {t.boxN} {i + 1}
                  </button>
                ))}
              </div>
            )}

            {currentResult && (
              <div key={activeBox} className="scale-in">
                {/* 3D */}
                <div className="viewer-wrapper">
                  <Viewer3D result={currentResult} items={currentResult.placements} />
                  <div className="viewer-label">
                    <span className="viewer-label-sub">{results.length > 1 ? `${t.boxN} ${activeBox + 1}` : t.bestBox}</span>
                    <span className="viewer-label-main">
                      {currentResult.isCustom ? t.customBox : formatBoxName(currentResult.box, sys)}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="metrics-grid">
                  <div className="metric-card">
                    <span className="metric-label">{t.efficiency}</span>
                    <span className="metric-value" style={{
                      color: currentResult.efficiency > 70 ? "#34C759" : currentResult.efficiency > 50 ? "#FF9500" : "#FF3B30"
                    }}>{currentResult.efficiency.toFixed(0)}%</span>
                    <span className="metric-sub">{t.spaceUsed}</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">{t.dimensions}</span>
                    <span className="metric-value metric-value-sm">
                      {currentResult.isCustom ? t.customBox : formatBoxName(currentResult.box, sys)}
                    </span>
                    <span className="metric-sub">{(currentResult.placements || []).length} {t.items}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Carrier comparison with region tabs */}
            <div className="card">
              <h3>{t.charges}</h3>
              <div className="region-tabs">
                {[
                  { id: "all", label: t.allCarriers },
                  { id: "intl", label: t.intlCarriers },
                  { id: "latam", label: t.latamCarriers },
                ].map(r => (
                  <button key={r.id} className={`region-tab ${carrierRegion === r.id ? "active" : ""}`}
                    onClick={() => setCarrierRegion(r.id)}>{r.label}</button>
                ))}
              </div>

              {carriers.map((carrier, i) => {
                const box = currentResult?.box;
                if (!box) return null;
                const vw = calcVolWeight(box.w, box.h, box.d, carrier.factor);
                const itemW = (currentResult.placements || []).reduce((s, it) => s + (it.weight || 0.5), 0);
                const billable = Math.max(itemW, vw);
                const isVol = vw > itemW;
                const maxVw = Math.max(...carriers.map(c => calcVolWeight(box.w, box.h, box.d, c.factor)));
                return (
                  <div key={carrier.name} className="carrier-row" style={{ animationDelay: `${i * 0.05}s` }}>
                    <span className="carrier-name">{carrier.name}</span>
                    <div className="carrier-bar">
                      <div className="carrier-fill" style={{
                        width: `${Math.min(100, (vw / (maxVw * 1.2)) * 100)}%`,
                        background: isVol ? "#FF9500" : "#34C759",
                      }} />
                    </div>
                    <div className="carrier-info">
                      <span className="carrier-weight">{kgToDisplay(billable, sys)} {t.weightUnit}</span>
                      <span className="carrier-badge" style={{
                        color: isVol ? "#FF9500" : "#34C759",
                        background: isVol ? "rgba(255,149,0,.1)" : "rgba(52,199,89,.1)",
                      }}>{isVol ? t.volWeight : t.realWeight}</span>
                    </div>
                  </div>
                );
              })}

              <p className="carrier-note">
                {currentResult && carriers.some(c => calcVolWeight(currentResult.box.w, currentResult.box.h, currentResult.box.d, c.factor) >
                  (currentResult.placements || []).reduce((s, it) => s + (it.weight || 0.5), 0))
                  ? t.volNote : t.realNote}
              </p>
            </div>

            {/* AI Tips */}
            <div className="card">
              <div className="ai-header">
                <div className="ai-badge">AI</div>
                <div>
                  <h3>{t.aiTips}</h3>
                  {loadingAi && <p className="ai-loading">{t.analyzing}</p>}
                </div>
              </div>
              {aiTips ? <p className="ai-text">{aiTips}</p> : !loadingAi && (
                <div className="loading-dots"><span /><span /><span /></div>
              )}
            </div>

            <button className="btn-secondary btn-full" onClick={() => { setResults(null); setView("items"); }}>
              {t.tryAgain}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

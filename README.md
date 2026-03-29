# 📦 BoxFit — Snap it. Pack it. Ship it.

AI-powered package optimization tool that detects product dimensions from photos and finds the perfect shipping box instantly.

![BoxFit](https://img.shields.io/badge/BoxFit-v1.0.0-0071E3?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)
![Claude AI](https://img.shields.io/badge/Claude_AI-Powered-D97706?style=for-the-badge)

## 🎯 Problem

E-commerce sellers and businesses lose **15-30% on shipping costs** by using oversized boxes. They don't know:
- What box size fits their products best
- Whether carriers will charge real weight vs volumetric weight
- How to optimize packing for multiple items

## ✨ Features

### 📷 AI Photo Detection
Take a photo of your product and Claude Vision AI automatically detects:
- Product type and name
- Estimated dimensions (width, height, depth)
- Estimated weight

### 📐 3D Packing Optimization
- Real **bin-packing algorithm** that tests all rotations
- Finds the **smallest standard box** that fits all items
- Interactive **3D visualization** with auto-rotation

### 💰 Carrier Cost Comparison
- Side-by-side comparison of **FedEx, UPS, DHL, USPS**
- Shows **real weight vs volumetric weight** per carrier
- Identifies which carrier charges less for your specific package

### 🤖 AI Recommendations
- Personalized **cost-saving tips** based on your packing result
- Carrier selection advice with specific numbers
- Protection and packaging suggestions

### 🌎 Bilingual (EN/ES) with Smart Units
- **English**: inches, pounds, ft³ (US imperial system)
- **Español**: centímetros, kilogramos, litros (metric system)
- Toggle instantly — all values convert automatically

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/boxfit.git
cd boxfit

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
boxfit/
├── public/
├── src/
│   ├── components/
│   │   └── Viewer3D.jsx       # 3D canvas renderer
│   ├── i18n/
│   │   └── translations.js    # EN/ES translations + unit config
│   ├── utils/
│   │   ├── ai.js              # Claude API integration
│   │   ├── packer.js          # Bin-packing algorithm
│   │   └── units.js           # Metric/Imperial conversions
│   ├── App.jsx                # Main application
│   ├── App.css                # Design system (Apple-clean)
│   └── main.jsx               # Entry point
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🧠 How It Works

### Packing Algorithm
Uses a **First-Fit Decreasing (FFD)** 3D bin-packing approach:
1. Sort items by volume (largest first)
2. For each item, try all 6 rotations
3. Find first valid position using 3D grid collision detection
4. Test against 15 standard box sizes
5. Return the smallest box where all items fit

### Unit System
All internal calculations use **metric (cm, kg)**. The conversion layer handles display:
- `cmToDisplay(value, system)` → converts for UI
- `displayToCm(value, system)` → converts user input back to metric
- Box names format automatically: `12×12×12"` vs `30×30×30 cm`

### AI Integration
- **Photo detection**: Sends image to Claude Vision API, returns dimensions in cm/kg
- **Packing tips**: Sends optimization results to Claude, receives carrier-specific advice

## 🔧 Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite 5 | Build tool |
| Canvas API | 3D rendering |
| Claude API | Vision + text AI |

## 📄 License

MIT — use it, modify it, ship it.

---

Built with 🤖 Claude AI

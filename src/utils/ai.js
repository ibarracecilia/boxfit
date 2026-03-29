// src/utils/ai.js

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

/**
 * Detect product from photo using Claude Vision.
 * Always returns dimensions in cm and weight in kg (internal metric).
 */
export async function detectProduct(base64, mediaType, apiKey) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `You are a product dimension estimator for shipping optimization. Look at this product photo and estimate its real-world dimensions in CENTIMETERS and weight in KILOGRAMS.

If there's a reference object (hand, credit card, coin, pen, ruler), use it for accurate scale estimation. If not, identify the product type and use your knowledge of typical dimensions.

Respond ONLY in valid JSON (no markdown, no backticks, no explanation):
{"name":"short product name (2-3 words in English)","w":width_cm,"h":height_cm,"d":depth_cm,"weight":weight_kg}

Be practical and realistic. Round dimensions to nearest integer. Weight to 1 decimal.`,
            },
          ],
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.content?.map((b) => b.text || "").join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

/**
 * Get AI packing recommendations.
 */
export async function getPackingTips(result, expandedItems, lang, apiKey) {
  const tw = expandedItems
    .reduce((s, i) => s + (i.weight || 0.5), 0)
    .toFixed(1);
  const box = result.box;
  const vws = [
    { n: "FedEx", v: ((box.w * box.h * box.d) / 5000).toFixed(1) },
    { n: "UPS", v: ((box.w * box.h * box.d) / 5000).toFixed(1) },
    { n: "DHL", v: ((box.w * box.h * box.d) / 5000).toFixed(1) },
    { n: "USPS", v: ((box.w * box.h * box.d) / 5454).toFixed(1) },
  ];

  const useLang = lang === "es" ? "Spanish" : "English";
  const useUnits =
    lang === "en"
      ? "Use inches and pounds in your response."
      : "Use centimeters and kilograms in your response.";

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You're a logistics packaging expert. Give 3 SHORT actionable tips in ${useLang}. ${useUnits}

Box: ${box.w.toFixed(1)}×${box.h.toFixed(1)}×${box.d.toFixed(1)} cm
Items: ${expandedItems.length} packed | Efficiency: ${result.efficiency.toFixed(1)}%
Real weight: ${tw} kg
Volumetric weights: ${vws.map((v) => `${v.n}: ${v.v}kg`).join(", ")}

Tips about: cost savings, protection, best carrier choice. Be specific with numbers. 2 lines max per tip. No intro text, just numbered tips.`,
        },
      ],
    }),
  });

  const data = await res.json();
  return data.content?.map((b) => b.text || "").join("") || "";
}

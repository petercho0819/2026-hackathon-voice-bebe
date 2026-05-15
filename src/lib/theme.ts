export const LIGHT = {
  bg:           "#f9fafb",
  card:         "#ffffff",
  cardAlt:      "#f8fafc",
  subtleBg:     "#f3f4f6",
  border:       "#e5e7eb",
  borderLight:  "#f3f4f6",
  text1:        "#111827",
  text2:        "#374151",
  text3:        "#6b7280",
  text4:        "#9ca3af",
  text5:        "#b0b7c3",
  inputBg:      "#ffffff",
  inputBorder:  "#e5e7eb",
  navBg:        "#ffffff",
  navBorder:    "#e5e7eb",
  headerBg:     "#ffffff",
  headerBorder: "#f3f4f6",
  segBg:        "#e5e7eb",
  segActive:    "#ffffff",
  overlayBg:    "rgba(0,0,0,0.45)",
  shadow:       "rgba(0,0,0,0.07)",
} as const;

export const DARK = {
  bg:           "#0f172a",
  card:         "#1e293b",
  cardAlt:      "#162032",
  subtleBg:     "#1e293b",
  border:       "#334155",
  borderLight:  "#1e293b",
  text1:        "#f1f5f9",
  text2:        "#e2e8f0",
  text3:        "#94a3b8",
  text4:        "#64748b",
  text5:        "#475569",
  inputBg:      "#1e293b",
  inputBorder:  "#334155",
  navBg:        "#1e293b",
  navBorder:    "#334155",
  headerBg:     "#1e293b",
  headerBorder: "#334155",
  segBg:        "#0f172a",
  segActive:    "#1e293b",
  overlayBg:    "rgba(0,0,0,0.65)",
  shadow:       "rgba(0,0,0,0.3)",
} as const;

export interface Theme {
  bg: string; card: string; cardAlt: string; subtleBg: string;
  border: string; borderLight: string;
  text1: string; text2: string; text3: string; text4: string; text5: string;
  inputBg: string; inputBorder: string;
  navBg: string; navBorder: string;
  headerBg: string; headerBorder: string;
  segBg: string; segActive: string;
  overlayBg: string; shadow: string;
}

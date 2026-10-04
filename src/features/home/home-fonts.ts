import { Cormorant_Garamond } from "next/font/google";

/**
 * Display serif for the homepage hero and homepage section titles only.
 * Self-hosted by next/font (no request to Google at runtime), swap + metric-adjusted fallback
 * so it never blocks rendering or shifts layout.
 */
export const homeDisplayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-home-display",
  adjustFontFallback: true,
});

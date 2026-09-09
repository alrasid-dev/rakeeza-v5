import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        moj: {
          green: "#006C35",
          light: "#e6f2eb",
          gold: "#C5A059",
        },
      },
      fontFamily: {
        arabic: [
          "var(--font-noto-naskh)",
          "Traditional Arabic",
          "Sakkal Majalla",
          "Tahoma",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;

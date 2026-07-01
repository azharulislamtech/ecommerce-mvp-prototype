import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],

  theme: {
    extend: {
      screens: {
        xs: "430px"
      },
      colors: {
        brand: {
          50: "#f8fafc",
          100: "#eef2f7",
          700: "#1d4ed8",
          900: "#0f172a"
        },
        accent: {
          amber: "#f59e0b",
          green: "#10b981"
        }
      },
      boxShadow: {
        soft: "0 14px 40px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 따뜻하고 부드러운 팔레트 (부모 대상, 유치하지 않게)
        cream: "#FDF8F3",
        warmwhite: "#FFFDFB",
        primary: {
          DEFAULT: "#F0885A", // 따뜻한 코랄/오렌지
          soft: "#FBE3D6",
          dark: "#D96A3D",
        },
        accent: {
          DEFAULT: "#7BA69A", // 차분한 세이지 그린
          soft: "#E3EEEA",
        },
        ink: {
          DEFAULT: "#3A342F",
          soft: "#6B635B",
          faint: "#A79E95",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "1.25rem",
        "2xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 4px 20px -4px rgba(180, 140, 110, 0.18)",
        card: "0 2px 12px -2px rgba(180, 140, 110, 0.14)",
      },
      maxWidth: {
        app: "480px",
      },
    },
  },
  plugins: [],
};

export default config;

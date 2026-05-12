import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#026f17",
                "primary-hover": "#015a12",
                accent: "#f59e0b",
                "accent-hover": "#d97706",
                danger: "#ef4444",
                success: "#026f17",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            borderRadius: {
                '3xl': '24px',
            },
            boxShadow: {
                'premium': '0 10px 30px -15px rgba(2, 111, 23, 0.15)',
            }
        },
    },
    plugins: [],
};

export default config;
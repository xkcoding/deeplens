import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/**
 * DeepLens Tailwind CSS Preset
 *
 * Orange warm-tone design system for Manus-inspired agentic desktop app.
 * Tech stack: React + Tailwind CSS + shadcn/ui + Tauri
 */
const deeplensPreset: Partial<Config> = {
  darkMode: "class",
  theme: {
    extend: {
      // ─── Colors ──────────────────────────────────────────────
      colors: {
        primary: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
          950: "#431407",
          DEFAULT: "#F97316",
        },
        secondary: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
          DEFAULT: "#F59E0B",
        },
        neutral: {
          0: "#FFFFFF",
          50: "#FAFAF9",
          100: "#F5F5F4",
          200: "#E7E5E4",
          300: "#D6D3D1",
          400: "#A8A29E",
          500: "#78716C",
          600: "#57534E",
          700: "#44403C",
          800: "#292524",
          850: "#1F1E1D",
          900: "#1C1917",
          950: "#0C0A09",
        },
        success: {
          DEFAULT: "#16A34A",
          light: "#4ADE80",
          bg: "#F0FDF4",
          "bg-dark": "#052E16",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#FBBF24",
          bg: "#FFFBEB",
          "bg-dark": "#422006",
        },
        error: {
          DEFAULT: "#DC2626",
          light: "#F87171",
          bg: "#FEF2F2",
          "bg-dark": "#450A0A",
        },
        info: {
          DEFAULT: "#2563EB",
          light: "#60A5FA",
          bg: "#EFF6FF",
          "bg-dark": "#172554",
        },
        agent: {
          idle: "#A8A29E",
          exploring: "#F97316",
          waiting: "#FBBF24",
          generating: "#F97316",
          indexing: "#2563EB",
          ready: "#16A34A",
          error: "#DC2626",
        },
      },

      // ─── Typography ──────────────────────────────────────────
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans SC",
          "PingFang SC",
          "Microsoft YaHei",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Noto Sans Mono",
          "SF Mono",
          "monospace",
        ],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
      },

      // ─── Spacing ─────────────────────────────────────────────
      spacing: {
        "0.5": "2px",
        "1": "4px",
        "1.5": "6px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
      },

      // ─── Border Radius ───────────────────────────────────────
      borderRadius: {
        none: "0px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        full: "9999px",
      },

      // ─── Box Shadow ──────────────────────────────────────────
      boxShadow: {
        xs: "0 1px 2px rgba(28, 25, 23, 0.05)",
        sm: "0 1px 3px rgba(28, 25, 23, 0.08), 0 1px 2px rgba(28, 25, 23, 0.04)",
        md: "0 4px 6px rgba(28, 25, 23, 0.07), 0 2px 4px rgba(28, 25, 23, 0.04)",
        lg: "0 10px 15px rgba(28, 25, 23, 0.08), 0 4px 6px rgba(28, 25, 23, 0.04)",
        xl: "0 20px 25px rgba(28, 25, 23, 0.08), 0 8px 10px rgba(28, 25, 23, 0.03)",
        "glow-primary": "0 0 20px rgba(249, 115, 22, 0.15)",
        "glow-success": "0 0 12px rgba(22, 163, 74, 0.2)",
        inner: "inset 0 2px 4px rgba(28, 25, 23, 0.06)",
        // Dark mode shadows
        "dark-xs": "0 1px 2px rgba(0, 0, 0, 0.2)",
        "dark-sm":
          "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
        "dark-md":
          "0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)",
        "dark-lg":
          "0 10px 15px rgba(0, 0, 0, 0.35), 0 4px 6px rgba(0, 0, 0, 0.2)",
        "dark-xl":
          "0 20px 25px rgba(0, 0, 0, 0.4), 0 8px 10px rgba(0, 0, 0, 0.2)",
      },

      // ─── Z-Index Scale ───────────────────────────────────────
      zIndex: {
        base: "0",
        raised: "10",
        dropdown: "20",
        sticky: "30",
        overlay: "40",
        modal: "50",
        popover: "60",
        toast: "70",
        tooltip: "80",
        max: "99",
      },

      // ─── Transition ──────────────────────────────────────────
      transitionDuration: {
        instant: "75ms",
        fast: "150ms",
        normal: "250ms",
        slow: "350ms",
        slower: "500ms",
      },
      transitionTimingFunction: {
        default: "cubic-bezier(0.4, 0, 0.2, 1)",
        in: "cubic-bezier(0.4, 0, 1, 1)",
        out: "cubic-bezier(0, 0, 0.2, 1)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
      },

      // ─── Keyframe Animations ─────────────────────────────────
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "pulse-orange": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(249, 115, 22, 0.4)",
          },
          "50%": {
            boxShadow: "0 0 0 8px rgba(249, 115, 22, 0)",
          },
        },
        "pulse-amber": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "flow-gradient": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        "skeleton-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        spin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "bounce-dot": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 250ms ease-out",
        "fade-out": "fade-out 200ms ease-in",
        "slide-up": "slide-up 250ms cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-down": "slide-down 250ms cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in": "scale-in 250ms cubic-bezier(0.22, 1, 0.36, 1)",
        "pulse-orange": "pulse-orange 2s ease-in-out infinite",
        "pulse-amber": "pulse-amber 1.5s ease-in-out infinite",
        "flow-gradient": "flow-gradient 3s linear infinite",
        "skeleton-shimmer": "skeleton-shimmer 1.5s ease-in-out infinite",
        spin: "spin 1s linear infinite",
        "bounce-dot": "bounce-dot 0.6s ease-in-out infinite alternate",
      },

      // ─── Layout ──────────────────────────────────────────────
      width: {
        "panel-nav": "240px",
        "panel-nav-collapsed": "48px",
        "panel-divider": "4px",
      },
      height: {
        header: "48px",
        "chat-widget": "360px",
      },
      minWidth: {
        "panel-nav": "200px",
        "panel-flow": "360px",
        "panel-artifact": "400px",
      },
      maxWidth: {
        "panel-nav": "320px",
        "settings-dialog": "640px",
      },

      // ─── Screens (Desktop breakpoints) ───────────────────────
      screens: {
        compact: "800px",
        standard: "1024px",
        wide: "1280px",
        ultrawide: "1536px",
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        // Skeleton shimmer background
        ".bg-skeleton": {
          background:
            "linear-gradient(90deg, var(--tw-skeleton-base) 25%, var(--tw-skeleton-shine) 50%, var(--tw-skeleton-base) 75%)",
          backgroundSize: "200% 100%",
          "--tw-skeleton-base": "#E7E5E4",
          "--tw-skeleton-shine": "#F5F5F4",
        },
        ".dark .bg-skeleton": {
          "--tw-skeleton-base": "#44403C",
          "--tw-skeleton-shine": "#57534E",
        },
        // Agent flow gradient background
        ".bg-flow-gradient": {
          background:
            "linear-gradient(90deg, #F97316, #FB923C, #FDBA74, #FB923C, #F97316)",
          backgroundSize: "200% 100%",
        },
        // Thought stream left border variants
        ".border-l-thought": {
          borderLeftWidth: "3px",
          borderImage: "linear-gradient(to bottom, #FB923C, #EA580C) 1",
        },
        ".border-l-tool": {
          borderLeftWidth: "3px",
          borderLeftColor: "#2563EB",
        },
        ".border-l-success": {
          borderLeftWidth: "3px",
          borderLeftColor: "#16A34A",
        },
        ".border-l-error": {
          borderLeftWidth: "3px",
          borderLeftColor: "#DC2626",
        },
        ".border-l-warning": {
          borderLeftWidth: "3px",
          borderLeftColor: "#D97706",
        },
      });
    }),
  ],
};

export default deeplensPreset;

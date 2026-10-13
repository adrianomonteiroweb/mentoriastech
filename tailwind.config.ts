import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', ...fontFamily.sans],
        mono: ['var(--font-geist-mono)', ...fontFamily.mono],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        // Tokens semanticos do Portal de Vagas (definidos em app/globals.css,
        // dentro de [data-portal="jobs"]). Substituem a cor crua do Tailwind
        // que estava espalhada pelos cards — varias sem variante dark:, que
        // liam mal no tema claro.
        //
        // Fora do portal estas variaveis nao existem: usar `bg-job-remote-bg`
        // em outra pagina nao pinta nada. E proposital, para a paleta do portal
        // nao vazar para o resto do site.
        job: {
          remote: 'hsl(var(--job-remote))',
          'remote-bg': 'hsl(var(--job-remote-bg))',
          hybrid: 'hsl(var(--job-hybrid))',
          'hybrid-bg': 'hsl(var(--job-hybrid-bg))',
          onsite: 'hsl(var(--job-onsite))',
          'onsite-bg': 'hsl(var(--job-onsite-bg))',
          international: 'hsl(var(--job-international))',
          'international-bg': 'hsl(var(--job-international-bg))',
          highlight: 'hsl(var(--job-highlight))',
          'highlight-bg': 'hsl(var(--job-highlight-bg))',
          warning: 'hsl(var(--job-warning))',
          'warning-bg': 'hsl(var(--job-warning-bg))',
          like: 'hsl(var(--job-like))',
          'like-bg': 'hsl(var(--job-like-bg))',
          area: 'hsl(var(--job-area))',
          'area-bg': 'hsl(var(--job-area-bg))',
          new: 'hsl(var(--job-new))',
          'new-bg': 'hsl(var(--job-new-bg))',
        },
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config

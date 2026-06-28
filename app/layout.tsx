import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'

import './globals.css'
import { PWARegister } from '@/components/pwa-register'
import { InstallPrompt } from '@/components/install-prompt'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeColorMeta, ThemeToggle } from '@/components/theme-toggle'
import { SITE_URL } from '@/lib/site'

const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const _jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MentoriasTech | Mentorias em Tecnologia',
    template: '%s | MentoriasTech',
  },
  description:
    'Plataforma de mentorias em desenvolvimento de software e carreira em tecnologia. Ferramentas de IA grátis para currículo e carreira. Conecte-se. Cresça. Transforme.',
  manifest: '/manifest.json',
  applicationName: 'MentoriasTech',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MentoriasTech',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
  formatDetection: {
    telephone: false,
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'MentoriasTech',
    url: SITE_URL,
    title: 'MentoriasTech | Mentorias em Tecnologia',
    description:
      'Mentorias em tech e ferramentas de IA grátis para currículo e carreira.',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${_inter.variable} ${_jetbrains.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="mentoriastech-theme"
        >
          <ThemeColorMeta />
          {children}
          <ThemeToggle />
          <PWARegister />
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import 'react-phone-number-input/style.css'
import './globals.css'
import { PWARegister } from '@/components/pwa-register'
import { InstallPrompt } from '@/components/install-prompt'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeColorMeta, ThemeToggle } from '@/components/theme-toggle'
import { SITE_URL } from '@/lib/site'

const _geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const _geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

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
    { media: '(prefers-color-scheme: dark)', color: '#1a2a44' },
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
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4937617018904097"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${_geistSans.variable} ${_geistMono.variable} font-sans antialiased`}>
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

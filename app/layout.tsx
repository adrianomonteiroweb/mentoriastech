import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'

import './globals.css'
import { PWARegister } from '@/components/pwa-register'
import { InstallPrompt } from '@/components/install-prompt'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeColorMeta, ThemeToggle } from '@/components/theme-toggle'

const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const _jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: 'Adriano Monteiro | Software, RPA e Mentoria Tech',
  description:
    'Mentoria em desenvolvimento de software, automações RPA e carreira em tecnologia.',
  manifest: '/manifest.json',
  applicationName: 'Adriano Mentoria',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Adriano Mentoria',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
  formatDetection: {
    telephone: false,
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
          storageKey="adriano-theme"
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

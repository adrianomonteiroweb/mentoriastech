import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import 'react-phone-number-input/style.css'
import './globals.css'
import { PWARegister } from '@/components/pwa-register'
import { InstallPrompt } from '@/components/install-prompt'
import { CookieConsent } from '@/components/cookie-consent'
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
        {/*
          JSON-LD renderizado no body (padrão do Next.js), não no <head>: em React
          19 o <script async> do AdSense é "hoisted" e reordena o <head> na
          hidratação, desalinhando estes <script type="application/ld+json"> (gerava
          hydration mismatch type="application/ld+json" vs type={null}).
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "MentoriasTech",
              url: SITE_URL,
              logo: `${SITE_URL}/icons/icon.svg`,
              description:
                "Plataforma de mentorias em desenvolvimento de software e carreira em tecnologia.",
              sameAs: [
                "https://www.linkedin.com/company/mentoriastech",
                "https://www.instagram.com/mentoriastech/",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "MentoriasTech",
              url: SITE_URL,
            }),
          }}
        />
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
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  )
}

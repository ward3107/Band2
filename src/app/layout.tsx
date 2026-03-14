import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { VoiceProvider } from "@/contexts/VoiceContext";
import { GamificationProvider } from "@/contexts/GamificationContext";
import { DifficultWordsProvider } from "@/contexts/DifficultWordsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SentryProvider, SentryErrorBoundary } from "@/components/SentryProvider";

// Font families for different languages
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Inter font for landing page
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vocabulary Band II - Israeli English Curriculum",
  description: "Learn English vocabulary for grades 7-9 with translations in Hebrew and Arabic",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get('language')?.value ?? 'en';
  const lang = (['en', 'he', 'ar'] as const).includes(langCookie as 'en' | 'he' | 'ar') ? langCookie : 'en';
  const dir = lang === 'en' ? 'ltr' : 'rtl';

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <SentryErrorBoundary>
          <AuthProvider>
            <SentryProvider>
              <LanguageProvider>
                <AccessibilityProvider>
                  <ProgressProvider>
                    <VoiceProvider>
                      <GamificationProvider>
                        <DifficultWordsProvider>
                  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                    {/* Header */}
                    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm overflow-hidden">
                      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center h-16 min-w-0">
                          <div className="flex items-center min-w-0">
                          </div>
                        </div>
                      </div>
                    </header>

                    {/* Main Content */}
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                      {children}
                    </main>
                  </div>
                        </DifficultWordsProvider>
                      </GamificationProvider>
                    </VoiceProvider>
                  </ProgressProvider>
                </AccessibilityProvider>
              </LanguageProvider>
            </SentryProvider>
          </AuthProvider>
        </SentryErrorBoundary>
      </body>
    </html>
  );
}

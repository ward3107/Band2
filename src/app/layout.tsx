import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Heebo, Cairo } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { VoiceProvider } from "@/contexts/VoiceContext";
import { GamificationProvider } from "@/contexts/GamificationContext";
import { DifficultWordsProvider } from "@/contexts/DifficultWordsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SentryProvider, SentryErrorBoundary } from "@/components/SentryProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Font families for different languages
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Hebrew font
const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

// Arabic font
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${heebo.variable} ${cairo.variable} antialiased`}
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
                        <div className="flex items-center justify-between h-16 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-2xl shrink-0">📚</span>
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
      Vocaband
                            </h1>
                          </div>
                          <div className="shrink-0 ml-2">
                            <LanguageSwitcher />
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

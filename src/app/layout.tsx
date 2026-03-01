import type { Metadata } from "next";
import { Geist, Geist_Mono, Heebo, Cairo } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { VoiceProvider } from "@/contexts/VoiceContext";
import { GamificationProvider } from "@/contexts/GamificationContext";
import { DifficultWordsProvider } from "@/contexts/DifficultWordsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import VoiceSelector from "@/components/VoiceSelector";

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
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${heebo.variable} ${cairo.variable} antialiased`}
        suppressHydrationWarning
      >
        <LanguageProvider>
          <AccessibilityProvider>
            <AuthProvider>
              <ProgressProvider>
                <VoiceProvider>
                  <GamificationProvider>
                    <DifficultWordsProvider>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
              {/* Header */}
              <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📚</span>
                      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        Vocab Band II
                      </h1>
                    </div>
                    <div className="flex items-center gap-2">
                      <VoiceSelector />
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
            </AuthProvider>
          </AccessibilityProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

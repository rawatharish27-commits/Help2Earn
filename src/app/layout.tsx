import type { Metadata, Viewport } from "next";
import { Poppins, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Help2Earn | Madad karo, kamaao! | Local Help Network",
  description: "India's #1 hyper-local help marketplace. Madad karke roz ₹1000-₹2000 tak kamaao. Ghar par bekaar pade samaan se lekar free time dene tak — sab kaam aa sakta hai. Sirf ₹49/month.",
  keywords: [
    "help2earn",
    "help to earn",
    "madad karo kamao",
    "local help",
    "nearby help",
    "resource rent",
    "local income",
    "earn locally",
    "community help",
    "India marketplace",
    "hyper-local",
    "roz ki kamai",
    "daily earning",
    "part time job",
    "side income"
  ],
  authors: [{ name: "Help2Earn Team" }],
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "Help2Earn | Madad karo, kamaao!",
    description: "Madad karke roz ₹1000-₹2000 tak kamaane ka mauka. Sirf ₹49/month shuru karo!",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Help2Earn | Madad karo, kamaao!",
    description: "Local Resource → Local Income → Local Help",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${notoSansDevanagari.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}

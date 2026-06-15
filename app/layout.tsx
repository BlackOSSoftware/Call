import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lead Calling CRM",
  description: "Mobile-first lead calling CRM for Android",
  applicationName: "Lead Calling CRM",
  appleWebApp: {
    capable: true,
    title: "Lead Calling CRM",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#09090B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full overflow-hidden">
      <body
        className={`${sans.variable} h-full max-h-[100dvh] overflow-hidden antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Assistant, Heebo, Rubik } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { STRINGS } from "@/lib/strings";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: STRINGS.appName,
  description: STRINGS.subtitle,
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: STRINGS.appName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#FF2D2D",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${rubik.variable} ${heebo.variable} ${assistant.variable}`}
    >
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

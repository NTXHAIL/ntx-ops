import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import { SetupRequired } from "@/components/setup-required";
import { BRAND_NAME, PRODUCT_NAME } from "@/lib/constants";
import { setupSteps } from "@/lib/setup-status";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${PRODUCT_NAME} · ${BRAND_NAME}`,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description:
    "Hail Ops is the internal shop-operations workspace for NTX Hail — hail/PDR estimating, customers, and claims.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const steps = setupSteps();
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${dmSans.className} min-h-full`}>
        {steps ? <SetupRequired steps={steps} /> : children}
      </body>
    </html>
  );
}

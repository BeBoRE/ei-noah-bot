import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "../styles/globals.css"

import { TRPCReactProvider } from "./providers";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "ei Noah",
  description: "Never run out of voice channels again!",
  openGraph: {
    title: "ei Noah",
    description: "Never run out of voice channels again!",
    url: "https://ei.sweaties.net",
    siteName: "ei Noah",
  }
};

export default function Layout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-primary-950 text-primary-50 flex min-h-screen">
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <body className={["font-sans", fontSans.variable, 'flex-1', 'flex'].join(" ")}>
        <TRPCReactProvider>{props.children}</TRPCReactProvider>
      </body>
    </html>
  );
}

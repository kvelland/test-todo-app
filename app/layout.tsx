import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Todos",
  description: "A simple todo app.",
};

export const viewport: Viewport = {
  themeColor: "#fbf6ee",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${instrumentSans.variable}`}>
      <body>
        <div className="backdrop" aria-hidden="true">
          <span className="blob blob--peach" />
          <span className="blob blob--sage" />
          <span className="blob blob--butter" />
          <span className="blob blob--sky" />
        </div>
        {children}
      </body>
    </html>
  );
}

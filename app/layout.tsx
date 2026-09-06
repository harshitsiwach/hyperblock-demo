import type { Metadata } from "next";
import { Figtree, Inter, JetBrains_Mono } from "next/font/google";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import { SolanaProvider } from "@/app/providers/solana-provider";
import { ThemeProvider } from "@/app/providers/theme-provider";

const figtree = Figtree({ subsets: ["latin"], display: "swap", variable: "--font-figtree" });
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono-base" });

export const metadata: Metadata = {
  title: "Hyperblock",
  description: "Ten-second directional price plays powered by MagicBlock",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${figtree.variable} ${inter.variable} ${jetbrainsMono.variable}`} data-theme="light" data-tint="orange">
      <body>
        <ThemeProvider>
          <SolanaProvider>{children}</SolanaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

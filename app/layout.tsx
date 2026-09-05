import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import { SolanaProvider } from "@/app/providers/solana-provider";
import { ThemeProvider } from "@/app/providers/theme-provider";

const figtree = Figtree({ subsets: ["latin"], display: "swap", variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Lever",
  description: "Ten-second directional price plays powered by MagicBlock",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={figtree.variable} data-theme="dark" data-tint="sky">
      <body>
        <ThemeProvider>
          <SolanaProvider>{children}</SolanaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

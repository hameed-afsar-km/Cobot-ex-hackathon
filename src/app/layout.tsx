import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Cobot-ex Leaderboard",
  description: "Real-time competition leaderboard platform",
  keywords: ["competition", "leaderboard", "cobot", "robotics"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#090909] text-[#F5F5F5] min-h-screen`}>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#111111',
              border: '1px solid rgba(229, 9, 20, 0.3)',
              color: '#F5F5F5',
            },
          }}
        />
      </body>
    </html>
  );
}

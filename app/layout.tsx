import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PRED FINDER | Apex 匿名プレデター特定DB＆目撃掲示板",
  description:
    "バナーやデスボックスの過去プレデターバッジ（シーズンデザイン・順位ナンバー・両スプ発光・複数シーズン組み合わせ）から匿名プレデターの正体を特定するWebアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-red-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}

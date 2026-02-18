import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiveCity — Пульс города в реальном времени",
  description:
    "Платформа городской навигации с AI. Честные рейтинги, AI-поиск, тепловая карта активности.",
  openGraph: {
    title: "LiveCity",
    description: "Пульс города в реальном времени",
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}

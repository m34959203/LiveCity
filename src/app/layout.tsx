import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiveCity — Живой рейтинг мест",
  description:
    "Платформа, которая ранжирует места на основе пульса соцсетей в реальном времени. Узнай, где хорошо сегодня.",
  keywords: ["livecity", "рейтинг", "рестораны", "карта", "отзывы", "live score"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}

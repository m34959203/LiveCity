"use client";

import Link from "next/link";
import { MapPin, BarChart3, User, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <Link href="/" className="flex items-center gap-2">
        <MapPin className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold tracking-tight">
          Live<span className="text-primary">City</span>
        </span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-6 md:flex">
        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Карта
        </Link>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            Для бизнеса
          </span>
        </Link>
        <Link
          href="/auth/login"
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <User className="h-4 w-4" />
          Войти
        </Link>
      </nav>

      {/* Mobile menu toggle */}
      <button
        className="md:hidden"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className={cn(
            "absolute left-0 right-0 top-14 z-50 border-b border-border bg-card p-4 md:hidden"
          )}
        >
          <nav className="flex flex-col gap-3">
            <Link href="/" className="text-sm" onClick={() => setMenuOpen(false)}>
              Карта
            </Link>
            <Link href="/dashboard" className="text-sm" onClick={() => setMenuOpen(false)}>
              Для бизнеса
            </Link>
            <Link href="/auth/login" className="text-sm" onClick={() => setMenuOpen(false)}>
              Войти
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

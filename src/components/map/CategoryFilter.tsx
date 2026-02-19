"use client";

import { useEffect, useState } from "react";

interface Category {
  slug: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

interface CategoryFilterProps {
  activeCategory: string | null;
  onCategoryChange: (slug: string | null) => void;
}

export function CategoryFilter({
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/95 px-2 py-1.5 shadow-xl backdrop-blur sm:bottom-auto sm:left-3 sm:top-16 sm:translate-x-0 sm:flex-col sm:px-1.5 sm:py-2">
      {/* All button */}
      <button
        onClick={() => onCategoryChange(null)}
        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
          activeCategory === null
            ? "bg-white/10 text-white"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        Все
      </button>

      {categories.map((cat) => (
        <button
          key={cat.slug}
          onClick={() =>
            onCategoryChange(activeCategory === cat.slug ? null : cat.slug)
          }
          title={`${cat.name} (${cat.count})`}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
            activeCategory === cat.slug
              ? "text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          style={
            activeCategory === cat.slug
              ? { backgroundColor: cat.color + "30", color: cat.color }
              : undefined
          }
        >
          <span className="sm:hidden">{cat.name}</span>
          <span className="hidden sm:inline">{cat.name}</span>
        </button>
      ))}
    </div>
  );
}

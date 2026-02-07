"use client";

import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    // TODO: Implement semantic search via API
    console.log("Search:", query);
  };

  return (
    <form onSubmit={handleSearch}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-background px-3 py-2 transition-colors",
          isFocused ? "border-primary" : "border-border"
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Шашлык на природе с детьми..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          title="AI-поиск"
        >
          <Sparkles className="h-3 w-3" />
          Найти
        </button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Опишите, что ищете — ИИ подберет лучшие места
      </p>
    </form>
  );
}

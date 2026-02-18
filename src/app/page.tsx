export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
      <main className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500" />
          <h1 className="text-4xl font-bold tracking-tight">LiveCity</h1>
        </div>
        <p className="max-w-md text-lg text-zinc-400">
          Пульс города в реальном времени. Честные рейтинги, AI-поиск, тепловая
          карта активности.
        </p>
        <div className="mt-4 flex gap-3">
          <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400">
            Live Score
          </span>
          <span className="rounded-full bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-400">
            AI-поиск
          </span>
          <span className="rounded-full bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400">
            Тепловая карта
          </span>
        </div>
        <p className="mt-8 text-sm text-zinc-600">
          Фаза 1 — Фундамент. В разработке.
        </p>
      </main>
    </div>
  );
}

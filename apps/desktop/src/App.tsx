import { QueueView } from "./features/queue/QueueView";
import { ConvertView } from "./features/convert/ConvertView";

export function App() {
  return (
    <div className="min-h-screen bg-slate-100 text-ink">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-5 md:p-8">
        <header className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <img src="/recast.png" alt="Recast logo" className="h-12 w-12 object-contain" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Offline-first</p>
              <h1 className="text-3xl font-semibold text-ink">Recast</h1>
            </div>
          </div>
        </header>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <ConvertView />
          <QueueView />
        </div>
      </main>
    </div>
  );
}

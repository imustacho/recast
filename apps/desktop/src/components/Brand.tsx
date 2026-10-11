import recastLogo from "../../../../assets/recast.png";

export function Brand() {
  return (
    <div className="flex items-center gap-3" aria-label="Recast">
      <img src={recastLogo} alt="" className="h-10 w-10 object-contain" />
      <span className="text-2xl font-bold tracking-tight text-ink dark:text-white">Recast</span>
    </div>
  );
}

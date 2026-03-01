"use client";

export function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-green-500/10 text-green-400 border border-green-500/20">
      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      AI Director Live
    </div>
  );
}

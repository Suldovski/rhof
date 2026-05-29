type BrandLogoProps = {
  variant?: "compact" | "full";
  className?: string;
};

export function BrandLogo({ variant = "full", className = "" }: BrandLogoProps) {
  if (variant === "compact") {
    return (
      <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Bucagrans">
        <path d="M18 26c11 2 22 8 32 19 7 7 14 12 20 14 8 3 17 4 27 2-10 10-21 16-34 17-14 1-26-2-37-10 7-2 13-5 17-8-5-5-11-9-19-12 4-6 7-11 10-14 2-4 5-6 8-8 2-2 4-3 6-4z" fill="#0f3d7a"/>
        <path d="M21 20c12 2 24 9 35 20 8 8 16 13 24 15 9 2 16 2 22 1-8 9-19 14-32 15-15 1-28-2-40-11 8-2 13-5 17-8-5-5-10-9-18-12 4-5 7-10 9-13 3-4 5-5 7-7 2-1 4-2 6-2z" fill="#19539e" opacity="0.88"/>
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-white/95 shadow-sm ring-1 ring-black/5">
        <svg viewBox="0 0 120 120" className="h-14 w-14" role="img" aria-label="Bucagrans">
          <path d="M18 26c11 2 22 8 32 19 7 7 14 12 20 14 8 3 17 4 27 2-10 10-21 16-34 17-14 1-26-2-37-10 7-2 13-5 17-8-5-5-11-9-19-12 4-6 7-11 10-14 2-4 5-6 8-8 2-2 4-3 6-4z" fill="#0f3d7a"/>
          <path d="M21 20c12 2 24 9 35 20 8 8 16 13 24 15 9 2 16 2 22 1-8 9-19 14-32 15-15 1-28-2-40-11 8-2 13-5 17-8-5-5-10-9-18-12 4-5 7-10 9-13 3-4 5-5 7-7 2-1 4-2 6-2z" fill="#19539e" opacity="0.88"/>
        </svg>
      </div>
      <div className="leading-none">
        <div className="font-black tracking-[0.18em] text-[#123d77]">BUCAGRANS</div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#66728a]">
          Construtora de Obras LTDA
        </div>
      </div>
    </div>
  );
}
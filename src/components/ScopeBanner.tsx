// Persistent, always-visible guardrail banner. This tool is a personal
// proof-of-concept on synthetic data — never a validated or GMP-qualified system,
// and never a quality decision. A human reviews everything.

export function ScopeBanner() {
  return (
    <div className="bg-brand-900 text-brand-50 text-xs sm:text-[13px]">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-2 justify-center text-center leading-snug">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full bg-brand-300 shrink-0"
        />
        <span>
          <span className="font-semibold">Synthetic demonstration data</span>
          <span className="opacity-80"> · Personal proof-of-concept · </span>
          <span className="font-semibold">Not validated / not GMP-qualified</span>
          <span className="opacity-80"> · Human-in-the-loop — no batch or release decisions</span>
        </span>
      </div>
    </div>
  );
}

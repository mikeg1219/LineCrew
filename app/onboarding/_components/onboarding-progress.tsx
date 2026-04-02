type Props = {
  currentStep: 1 | 2 | 3;
  title: string;
};

export function OnboardingProgress({ currentStep, title }: Props) {
  const pct = (currentStep / 3) * 100;
  const steps: Array<{ n: 1 | 2 | 3; label: string }> = [
    { n: 1, label: "Account" },
    { n: 2, label: "Verify" },
    { n: 3, label: "Profile" },
  ];
  return (
    <div className="mb-6 space-y-3 sm:mb-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Step {currentStep} of 3 - {title}
      </p>
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {steps.map((s) => (
          <span
            key={s.n}
            className={s.n === currentStep ? "text-blue-700" : undefined}
          >
            {s.n < currentStep ? `${s.label} ✓` : s.label}
          </span>
        ))}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

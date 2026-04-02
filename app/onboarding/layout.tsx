export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="linecrew-zone-marketing-page relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.18),transparent_52%)]"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[100dvh] flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="linecrew-card-marketing w-full max-w-lg p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

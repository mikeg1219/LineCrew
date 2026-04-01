/**
 * All `/auth/*` routes share a full-viewport column. Individual pages set the hero
 * gradient (`linecrew-bg-hero`) or other treatment — keeps verify / reset aligned with `/auth`.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white">{children}</div>
  );
}

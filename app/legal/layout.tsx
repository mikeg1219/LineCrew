/**
 * Public legal center — soft blue→teal wash over white (marketing family, not dashboard slate).
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="linecrew-bg-marketing flex min-h-full flex-col">{children}</div>
  );
}

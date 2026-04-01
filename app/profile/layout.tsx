import { AuthenticatedAppShell } from "@/components/authenticated-app-shell";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}

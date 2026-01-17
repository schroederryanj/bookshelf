export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Override admin layout - no sidebar for login page
  return <>{children}</>;
}

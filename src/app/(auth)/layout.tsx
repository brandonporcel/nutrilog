export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-surface text-on-surface selection:bg-primary/20">
      {children}
    </div>
  );
}

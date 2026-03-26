type AppShellCardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function AppShellCard({
  children,
  className = "",
}: AppShellCardProps) {
  return (
    <div
      className={`rounded-[32px] border border-black/5 bg-white/80 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
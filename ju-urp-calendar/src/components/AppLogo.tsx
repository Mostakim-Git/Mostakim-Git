export function AppLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <img src="/logo.png" alt="CaCa" width={size} height={size} className={`rounded-[22%] shadow-md ${className}`} style={{ width: size, height: size }} />;
}

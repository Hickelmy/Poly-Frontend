import logo from '@/assets/logo.png';

interface PolysLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function PolysLogo({ size = 'md', showText = true, className = '' }: PolysLogoProps) {
  const iconH = { sm: 'h-8', md: 'h-10', lg: 'h-14' }[size];
  const titleSize = { sm: 'text-base', md: 'text-xl', lg: 'text-3xl' }[size];
  const subSize = { sm: 'text-[8px]', md: 'text-[10px]', lg: 'text-xs' }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={logo}
        alt="Polys"
        className={`${iconH} w-auto object-contain flex-shrink-0`}
        draggable={false}
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={`${titleSize} font-black text-slate-900 dark:text-white tracking-[0.12em] uppercase`}
            style={{ fontFamily: "'Cinzel', 'Palatino Linotype', serif" }}
          >
            POLYS
          </span>
          <span
            className={`${subSize} text-slate-500 dark:text-slate-400 tracking-[0.08em] mt-0.5`}
            style={{ fontFamily: "'Cinzel', 'Palatino Linotype', serif" }}
          >
            Melhoria Comunitária
          </span>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { cn } from "@/lib/utils";

type ProgressBarSize = 'sm' | 'md' | 'lg';
type ProgressBarColor = 'teal' | 'blue' | 'green' | 'orange' | 'purple';

interface ProgressBarProps {
  current: number;
  target: number;
  showValues?: boolean;
  showPercentage?: boolean;
  size?: ProgressBarSize;
  color?: ProgressBarColor;
  label?: string;
  className?: string;
}

export default function ProgressBar({
  current,
  target,
  showValues = true,
  showPercentage = true,
  size = "md",
  color = "teal",
  label,
  className
}: ProgressBarProps) {
  const percentage = Math.min((current / target) * 100, 100);

  const sizeClasses: Record<ProgressBarSize, string> = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4"
  };

  const colorClasses: Record<ProgressBarColor, string> = {
    teal: "from-teal-500 to-emerald-500",
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    orange: "from-orange-500 to-amber-500",
    purple: "from-purple-500 to-pink-500",
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {(label || showValues) && (
        <div className="flex justify-between items-center text-sm">
          {label && (
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {label}
            </span>
          )}
          {showValues && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatCurrency(current)}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400">
                {formatCurrency(target)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className={cn(
        "w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden",
        sizeClasses[size]
      )}>
        <div
          className={cn(
            "h-full bg-gradient-to-r rounded-full transition-all duration-500 ease-out",
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showPercentage && (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
          {percentage.toFixed(0)}% alcançado
        </p>
      )}
    </div>
  );
}

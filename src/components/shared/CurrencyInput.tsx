import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps {
  value?: number | string;
  onChange?: (value: number | string) => void;
  placeholder?: string;
  className?: string;
  [key: string]: any;
}

export default function CurrencyInput({ value, onChange, placeholder = '0,00', className = '', ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');

  const formatCurrency = (num: number | string): string => {
    if (!num && num !== 0) return '';

    const numValue = typeof num === 'string' ? parseFloat(num.replace(/[^\d]/g, '')) / 100 : num;
    if (isNaN(numValue)) return '';

    return numValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseCurrency = (str: string): number => {
    if (!str) return 0;
    const digits = str.replace(/[^\d]/g, '');
    if (!digits) return 0;
    return parseFloat(digits) / 100;
  };

  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numValue)) {
        setDisplayValue(formatCurrency(numValue));
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    const digits = inputValue.replace(/[^\d]/g, '');

    if (digits === '') {
      setDisplayValue('');
      onChange && onChange('');
      return;
    }

    const numValue = parseFloat(digits) / 100;

    const formatted = formatCurrency(numValue);
    setDisplayValue(formatted);

    onChange && onChange(numValue);
  };

  const handleBlur = () => {
    if (displayValue && !displayValue.includes(',')) {
      const numValue = parseCurrency(displayValue);
      setDisplayValue(formatCurrency(numValue));
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`pl-10 ${className}`}
        {...props}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

/**
 * Componente de input para valores monetários com formatação automática
 * Formata automaticamente enquanto o usuário digita, começando pelos centavos
 */
export default function CurrencyInput({ value, onChange, placeholder = '0,00', className = '', ...props }) {
  const [displayValue, setDisplayValue] = useState('');

  // Converte número para formato de exibição (ex: 1234.56 -> "1.234,56")
  const formatCurrency = (num) => {
    if (!num && num !== 0) return '';
    
    // Garante que é um número
    const numValue = typeof num === 'string' ? parseFloat(num.replace(/[^\d]/g, '')) / 100 : num;
    if (isNaN(numValue)) return '';
    
    // Formata com 2 casas decimais
    return numValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Converte string formatada para número (ex: "1.234,56" -> 1234.56)
  const parseCurrency = (str) => {
    if (!str) return 0;
    // Remove tudo exceto dígitos
    const digits = str.replace(/[^\d]/g, '');
    if (!digits) return 0;
    // Divide por 100 para ter centavos
    return parseFloat(digits) / 100;
  };

  // Inicializa o valor formatado
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

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Remove tudo exceto dígitos
    const digits = inputValue.replace(/[^\d]/g, '');
    
    if (digits === '') {
      setDisplayValue('');
      onChange && onChange('');
      return;
    }

    // Converte para número (em centavos)
    const numValue = parseFloat(digits) / 100;
    
    // Formata para exibição
    const formatted = formatCurrency(numValue);
    setDisplayValue(formatted);
    
    // Chama onChange com o valor numérico (sem formatação)
    onChange && onChange(numValue);
  };

  const handleBlur = () => {
    // Garante que sempre tem 2 casas decimais ao perder o foco
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


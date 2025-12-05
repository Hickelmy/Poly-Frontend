import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  // Project statuses
  proposed: { label: "Proposto", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  voting: { label: "Em Votação", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  funding: { label: "Financiando", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  funded: { label: "Financiado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  in_progress: { label: "Em Execução", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  completed: { label: "Concluído", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  
  // Payment/Order statuses
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  confirmed: { label: "Confirmado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  paid: { label: "Pago", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  shipped: { label: "Enviado", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  delivered: { label: "Entregue", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  cancelled: { label: "Cancelado", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  refunded: { label: "Reembolsado", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  failed: { label: "Falhou", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  
  // Service booking statuses
  requested: { label: "Solicitado", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  accepted: { label: "Aceito", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  
  // Refund statuses
  approved: { label: "Aprovado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  processed: { label: "Processado", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },

  // Active/Inactive
  active: { label: "Ativo", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  inactive: { label: "Inativo", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

export default function StatusBadge({ status, size = "default", className }) {
  const config = statusConfig[status] || { label: status, color: "bg-slate-100 text-slate-700" };
  
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        config.color,
        size === "sm" && "text-xs px-2 py-0.5",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
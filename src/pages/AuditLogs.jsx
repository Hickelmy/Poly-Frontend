import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Shield, Clock, Database } from 'lucide-react';

export default function AuditLogs() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            Auditoria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Database className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Em Desenvolvimento
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              O sistema de auditoria está sendo desenvolvido. Em breve você poderá 
              visualizar todas as ações sensíveis realizadas na plataforma, como 
              logins, mudanças de permissão e configurações.
            </p>
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
              <Clock className="w-4 h-4" />
              <span>Previsão: Próxima atualização</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

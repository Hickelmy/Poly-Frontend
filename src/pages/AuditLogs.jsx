import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

// Dados fictícios por enquanto
const MOCK_LOGS = [
  {
    id: '1',
    type: 'login',
    actor: 'admin@polys.local',
    description: 'Login realizado',
    createdAt: '2025-12-03 00:12',
  },
  {
    id: '2',
    type: 'user_update',
    actor: 'admin@polys.local',
    description: 'Permissões do usuário teste@email.com atualizadas',
    createdAt: '2025-12-03 00:20',
  },
];

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
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Aqui você poderá visualizar ações sensíveis realizadas na plataforma
            (logins, mudanças de permissão, configurações, etc).
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_LOGS.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {log.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.actor}</TableCell>
                  <TableCell className="text-sm">{log.description}</TableCell>
                  <TableCell className="text-xs text-slate-500">{log.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="text-xs text-slate-400">
            Esta tela usa dados de exemplo. Depois podemos ligar essa listagem ao backend
            usando uma tabela de auditoria no Prisma.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}



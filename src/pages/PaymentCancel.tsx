import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, Home, ShoppingBag } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Pagamento Cancelado
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Você cancelou o processo de pagamento. Nenhum valor foi cobrado.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Se você mudou de ideia, pode tentar novamente a qualquer momento.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => navigate(createPageUrl('Store'))}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Continuar Comprando
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('Dashboard'))}
            >
              <Home className="w-4 h-4 mr-2" />
              Voltar para o Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

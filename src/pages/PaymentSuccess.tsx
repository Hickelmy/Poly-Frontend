import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Package, Home } from 'lucide-react';
import { toast } from 'sonner';
import { polysApi } from '@/api/polysClient';
import { createPageUrl } from '../utils';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const paymentId = searchParams.get('payment_id');
  const sessionId = searchParams.get('session_id');
  const status = searchParams.get('status');

  useEffect(() => {
    if (status === 'approved' || paymentId || sessionId) {
      toast.success('Obrigado pela sua compra! 🎉', {
        description: 'Seu pedido foi confirmado e será processado em breve.',
        duration: 5000,
      });
    } else if (status === 'pending') {
      toast.info('Pagamento pendente', {
        description: 'Seu pagamento está sendo processado. Você receberá uma confirmação em breve.',
      });
    } else if (status === 'rejected') {
      toast.error('Pagamento recusado', {
        description: 'Não foi possível processar seu pagamento. Tente novamente.',
      });
    }
    setLoading(false);
  }, [status, paymentId, sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardContent className="pt-8 pb-8 text-center">
          {loading ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Package className="w-8 h-8 text-teal-600 dark:text-teal-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-300">Processando...</p>
            </div>
          ) : status === 'approved' || paymentId || sessionId ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Pagamento Confirmado!
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Obrigado pela sua compra! Seu pedido foi confirmado e será processado em breve.
                Você receberá um email com os detalhes do pedido.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={() => navigate(createPageUrl('MyOrders'))}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Ver Meus Pedidos
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl('Store'))}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Voltar para a Loja
                </Button>
              </div>
            </>
          ) : status === 'pending' ? (
            <>
              <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Pagamento Pendente
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Seu pagamento está sendo processado. Você receberá uma confirmação por email assim que for aprovado.
              </p>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() => navigate(createPageUrl('MyOrders'))}
              >
                Ver Meus Pedidos
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Pagamento Não Processado
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Não foi possível processar seu pagamento. Por favor, tente novamente.
              </p>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() => navigate(createPageUrl('Store'))}
              >
                Voltar para a Loja
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

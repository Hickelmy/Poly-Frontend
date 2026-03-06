import React, { useState } from 'react';
import { polysApi } from '@/api/polysClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, CreditCard, QrCode, FileText, Loader2, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from "sonner";
import ProgressBar from '../shared/ProgressBar';

export default function DonationModal({ open, onClose, project, user }) {
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [isSubscription, setIsSubscription] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  
  // Estados para o fluxo de pagamento PIX
  const [paymentStep, setPaymentStep] = useState('form'); // 'form' | 'pix_generated' | 'success'
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();

  const MIN_DONATION_AMOUNT = 20;
  const predefinedAmounts = [20, 50, 100, 250, 500];

  // Mutation para criar pagamento PIX via Abacate Pay
  const pixMutation = useMutation({
    mutationFn: async () => {
      const donationAmount = amount === 'custom' ? parseFloat(customAmount) : parseFloat(amount);
      
      if (!donationAmount || donationAmount <= 0) {
        throw new Error('Valor inválido');
      }

      if (donationAmount < MIN_DONATION_AMOUNT) {
        throw new Error(`O valor mínimo para doação é R$ ${MIN_DONATION_AMOUNT.toFixed(2)}`);
      }

      // Cria pagamento via Abacate Pay
      const result = await polysApi.paymentGateway.createPixPayment({
        amount: donationAmount,
        project_id: project.id,
        project_title: project.title,
        anonymous: anonymous,
      });

      return result;
    },
    onSuccess: (data) => {
      if (data.payment_url) {
        setPixData(data);
        setPaymentStep('pix_generated');
        toast.success('PIX gerado com sucesso!', {
          description: 'Escaneie o QR Code ou copie o código para pagar',
        });
      }
    },
    onError: (error) => {
      // Verifica se o usuário é gestor ou administrador
      const userRole = user?.user_role || user?.role || 'usuario';
      const isManagerOrAdmin = ['gestor', 'administrador', 'manager', 'admin', 'administrator'].includes(userRole?.toLowerCase() || '');
      
      let errorDescription = 'Tente novamente.';
      if (error.message?.includes('Token do Abacate Pay não configurado') || error.message?.includes('configure o token')) {
        // Só mostra mensagem sobre token não configurado para managers/gerentes
        if (isManagerOrAdmin) {
          errorDescription = 'Configure o token do Abacate Pay em Configurações > API Tokens.';
        } else {
          errorDescription = 'Entre em contato com o suporte.';
        }
      } else if (error.message) {
        errorDescription = error.message;
      }
      
      toast.error('Erro ao gerar PIX', {
        description: errorDescription,
      });
    },
  });

  // Mutation para pagamentos simulados (cartão/boleto)
  const donationMutation = useMutation({
    mutationFn: async () => {
      const donationAmount = amount === 'custom' ? parseFloat(customAmount) : parseFloat(amount);
      
      if (!donationAmount || donationAmount <= 0) {
        throw new Error('Valor inválido');
      }

      if (donationAmount < MIN_DONATION_AMOUNT) {
        throw new Error(`O valor mínimo para doação é R$ ${MIN_DONATION_AMOUNT.toFixed(2)}`);
      }

      // Calculate commission (10% default)
      const commission = donationAmount * 0.10;

      // Create payment record
      const payment = await polysApi.entities.ProjectPayment.create({
        project_id: project.id,
        user_id: user.id,
        user_email: user.email,
        amount: donationAmount,
        commission_amount: commission,
        payment_method: paymentMethod,
        status: 'pending',
        is_subscription: isSubscription,
        anonymous: anonymous,
        transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      // Simulate payment confirmation (in real app, this would be handled by payment gateway callback)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update payment status
      await polysApi.entities.ProjectPayment.update(payment.id, {
        status: 'confirmed'
      });

      // Update project amount
      await polysApi.entities.Project.update(project.id, {
        current_amount: (project.current_amount || 0) + donationAmount
      });

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Doação realizada com sucesso!', {
        description: 'Obrigado por contribuir com a comunidade!'
      });
      resetForm();
      onClose();
    },
    onError: (error) => {
      toast.error('Erro ao processar doação', {
        description: error.message
      });
    }
  });

  const resetForm = () => {
    setAmount('');
    setCustomAmount('');
    setPaymentMethod('pix');
    setIsSubscription(false);
    setAnonymous(false);
    setPaymentStep('form');
    setPixData(null);
    setCopied(false);
  };

  const handleSubmit = () => {
    if (!amount && !customAmount) {
      toast.error('Selecione um valor para doação');
      return;
    }

    const donationAmount = amount === 'custom' ? parseFloat(customAmount) : parseFloat(amount);
    
    if (!donationAmount || donationAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    if (donationAmount < MIN_DONATION_AMOUNT) {
      toast.error(`O valor mínimo para doação é R$ ${MIN_DONATION_AMOUNT.toFixed(2)}`);
      return;
    }

    // Se for PIX, usa o Abacate Pay
    if (paymentMethod === 'pix') {
      pixMutation.mutate();
    } else {
      // Para outros métodos, usa o fluxo simulado
      donationMutation.mutate();
    }
  };

  const handleCopyPixCode = () => {
    if (pixData?.payment_url) {
      navigator.clipboard.writeText(pixData.payment_url);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenPaymentLink = () => {
    if (pixData?.payment_url) {
      window.open(pixData.payment_url, '_blank');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        resetForm();
      }
      onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-teal-600" />
            {paymentStep === 'pix_generated' ? 'Pagamento PIX' : 'Fazer Doação'}
          </DialogTitle>
          <DialogDescription>
            {paymentStep === 'pix_generated' 
              ? 'Escaneie o QR Code ou acesse o link para pagar' 
              : `Contribua com o projeto "${project.title}"`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Etapa 1: Formulário */}
        {paymentStep === 'form' && (
          <div className="space-y-6 py-4">
            {/* Project Progress */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Progresso atual
              </p>
              <ProgressBar
                current={project.current_amount || 0}
                target={project.target_amount || 1}
                size="md"
              />
            </div>

            {/* Amount Selection */}
            <div className="space-y-3">
              <Label>Selecione o valor</Label>
              <div className="grid grid-cols-3 gap-2">
                {predefinedAmounts.map((val) => (
                  <Button
                    key={val}
                    type="button"
                    variant={amount === val.toString() ? 'default' : 'outline'}
                    className={amount === val.toString() ? 'bg-teal-600 hover:bg-teal-700' : ''}
                    onClick={() => {
                      setAmount(val.toString());
                      setCustomAmount('');
                    }}
                  >
                    R$ {val}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={amount === 'custom' ? 'default' : 'outline'}
                  className={amount === 'custom' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                  onClick={() => setAmount('custom')}
                >
                  Outro
                </Button>
              </div>
              
              {amount === 'custom' && (
                <div className="relative mt-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                  <Input
                    type="number"
                    placeholder="20,00"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className={`pl-10 ${customAmount && parseFloat(customAmount) < MIN_DONATION_AMOUNT ? 'border-red-500 focus:ring-red-500' : ''}`}
                    min={MIN_DONATION_AMOUNT}
                    step="0.01"
                  />
                  {customAmount && parseFloat(customAmount) < MIN_DONATION_AMOUNT ? (
                    <p className="text-xs text-red-500 mt-1">
                      Valor mínimo: R$ {MIN_DONATION_AMOUNT.toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">
                      Valor mínimo: R$ {MIN_DONATION_AMOUNT.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label>Forma de pagamento</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer flex-1">
                    <QrCode className="w-5 h-5 text-teal-600" />
                    PIX
                    <span className="text-xs text-green-600 ml-auto">Abacate Pay</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer opacity-50">
                  <RadioGroupItem value="cartao" id="cartao" disabled />
                  <Label htmlFor="cartao" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    Cartão de Crédito
                    <span className="text-xs text-slate-500 ml-auto">Em breve</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer opacity-50">
                  <RadioGroupItem value="boleto" id="boleto" disabled />
                  <Label htmlFor="boleto" className="flex items-center gap-2 cursor-pointer flex-1">
                    <FileText className="w-5 h-5 text-slate-600" />
                    Boleto Bancário
                    <span className="text-xs text-slate-500 ml-auto">Em breve</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={anonymous}
                  onCheckedChange={setAnonymous}
                />
                <Label htmlFor="anonymous" className="text-sm cursor-pointer">
                  Doar anonimamente
                </Label>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total a doar:</span>
                <span className="text-xl font-bold text-teal-700 dark:text-teal-400">
                  {formatCurrency(amount === 'custom' ? parseFloat(customAmount) || 0 : parseFloat(amount) || 0)}
                </span>
              </div>
            </div>

            {/* Submit */}
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 h-12"
              onClick={handleSubmit}
              disabled={pixMutation.isPending || donationMutation.isPending || (!amount && !customAmount)}
            >
              {(pixMutation.isPending || donationMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2" />
                  {paymentMethod === 'pix' ? 'Gerar PIX' : 'Confirmar Doação'}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-slate-500">
              10% do valor é destinado à manutenção da plataforma. 
              Seus dados estão protegidos.
            </p>
          </div>
        )}

        {/* Etapa 2: PIX Gerado */}
        {paymentStep === 'pix_generated' && pixData && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <QrCode className="w-10 h-10 text-teal-600" />
              </div>
              <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">
                {formatCurrency(pixData.amount)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Pagamento para: {project.title}
              </p>
            </div>

            {/* Link de pagamento */}
            <div className="space-y-3">
              <Label>Link de pagamento</Label>
              <div className="flex gap-2">
                <Input 
                  value={pixData.payment_url} 
                  readOnly 
                  className="text-xs bg-slate-50 dark:bg-slate-800"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPixCode}
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 h-12"
              onClick={handleOpenPaymentLink}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir página de pagamento
            </Button>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Importante:</strong> Após o pagamento, o valor será creditado automaticamente ao projeto. 
                Você pode fechar esta janela e acompanhar o status na página do projeto.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

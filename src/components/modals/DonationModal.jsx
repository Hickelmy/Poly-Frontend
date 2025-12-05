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
import { Heart, CreditCard, QrCode, FileText, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import ProgressBar from '../shared/ProgressBar';

export default function DonationModal({ open, onClose, project, user }) {
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [isSubscription, setIsSubscription] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();

  const predefinedAmounts = [25, 50, 100, 250, 500];

  const donationMutation = useMutation({
    mutationFn: async () => {
      const donationAmount = amount === 'custom' ? parseFloat(customAmount) : parseFloat(amount);
      
      if (!donationAmount || donationAmount <= 0) {
        throw new Error('Valor inválido');
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

      // Create notification
      await polysApi.entities.Notification.create({
        user_id: user.id,
        user_email: user.email,
        type: 'donation',
        title: 'Doação confirmada!',
        message: `Sua doação de R$ ${donationAmount.toFixed(2)} para "${project.title}" foi confirmada.`,
        meta: { project_id: project.id, payment_id: payment.id }
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
  };

  const handleSubmit = () => {
    if (!amount && !customAmount) {
      toast.error('Selecione um valor para doação');
      return;
    }
    donationMutation.mutate();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-teal-600" />
            Fazer Doação
          </DialogTitle>
          <DialogDescription>
            Contribua com o projeto "{project.title}"
          </DialogDescription>
        </DialogHeader>

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
                  placeholder="0,00"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="pl-10"
                  min="1"
                  step="0.01"
                />
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
                  <span className="text-xs text-green-600 ml-auto">Aprovação instantânea</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <RadioGroupItem value="cartao" id="cartao" />
                <Label htmlFor="cartao" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Cartão de Crédito
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <RadioGroupItem value="boleto" id="boleto" />
                <Label htmlFor="boleto" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileText className="w-5 h-5 text-slate-600" />
                  Boleto Bancário
                  <span className="text-xs text-slate-500 ml-auto">1-3 dias úteis</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {project.subscription_enabled && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="subscription"
                  checked={isSubscription}
                  onCheckedChange={setIsSubscription}
                />
                <Label htmlFor="subscription" className="text-sm cursor-pointer">
                  Tornar doação mensal recorrente
                </Label>
              </div>
            )}
            
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
                {isSubscription && <span className="text-sm font-normal">/mês</span>}
              </span>
            </div>
          </div>

          {/* Submit */}
          <Button
            className="w-full bg-teal-600 hover:bg-teal-700 h-12"
            onClick={handleSubmit}
            disabled={donationMutation.isPending || (!amount && !customAmount)}
          >
            {donationMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 mr-2" />
                Confirmar Doação
              </>
            )}
          </Button>

          <p className="text-xs text-center text-slate-500">
            10% do valor é destinado à manutenção da plataforma. 
            Seus dados estão protegidos.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
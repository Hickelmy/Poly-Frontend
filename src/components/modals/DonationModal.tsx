import React, { useState, useEffect, useRef } from 'react';
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
import { Heart, CreditCard, QrCode, FileText, Loader2, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from "sonner";
import ProgressBar from '../shared/ProgressBar';

interface DonationModalProps {
  open: boolean;
  onClose: () => void;
  project: any;
  user?: any;
}

export default function DonationModal({ open, onClose, project, user }: DonationModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [isSubscription, setIsSubscription] = useState<boolean>(false);
  const [anonymous, setAnonymous] = useState<boolean>(false);

  const [paymentStep, setPaymentStep] = useState<string>('form');
  const [pixData, setPixData] = useState<any>(null);
  const [pixStatus, setPixStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const queryClient = useQueryClient();

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const startPolling = (pixId: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const result = await polysApi.paymentGateway.checkPixStatus(pixId);
        setPixStatus(result.status);
        if (result.status === 'PAID') {
          stopPolling();
          queryClient.invalidateQueries(['projects']);
          setPaymentStep('success');
        } else if (result.status === 'EXPIRED') {
          stopPolling();
        }
      } catch (_) {}
    }, 3000);
  };

  const MIN_DONATION_AMOUNT = 20;
  const predefinedAmounts = [20, 50, 100, 250, 500];

  const pixMutation = useMutation({
    mutationFn: async () => {
      const donationAmount = amount === 'custom' ? parseFloat(customAmount) : parseFloat(amount);
      if (!donationAmount || donationAmount <= 0) throw new Error('Valor inválido');
      if (donationAmount < MIN_DONATION_AMOUNT) {
        throw new Error(`O valor mínimo para doação é R$ ${MIN_DONATION_AMOUNT.toFixed(2)}`);
      }
      return polysApi.paymentGateway.createPixPayment({
        amount: donationAmount,
        project_id: project.id,
        project_title: project.title,
        anonymous,
      });
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setPixData(data);
        setPixStatus('PENDING');
        setPaymentStep('pix_generated');
        startPolling(data.pix_id);
        toast.success('QR Code PIX gerado!', {
          description: 'Escaneie o QR Code ou copie o código para pagar',
        });
      }
    },
    onError: (error: any) => {
      const userRole = user?.user_role || user?.role || 'usuario';
      const isManagerOrAdmin = ['gestor', 'administrador', 'manager', 'admin', 'administrator'].includes(userRole?.toLowerCase() || '');
      let errorDescription = 'Tente novamente.';
      if (error.message?.includes('Token do Abacate Pay não configurado')) {
        errorDescription = isManagerOrAdmin
          ? 'Configure o token do Abacate Pay em Configurações > API Tokens.'
          : 'Entre em contato com o suporte.';
      } else if (error.message) {
        errorDescription = error.message;
      }
      toast.error('Erro ao gerar PIX', { description: errorDescription });
    },
  });

  const stripeMutation = useMutation({
    mutationFn: async () => {
      const donationAmount = amount === 'custom' ? parseFloat(customAmount) : parseFloat(amount);
      if (!donationAmount || donationAmount <= 0) throw new Error('Valor inválido');
      if (donationAmount < MIN_DONATION_AMOUNT) {
        throw new Error(`O valor mínimo para doação é R$ ${MIN_DONATION_AMOUNT.toFixed(2)}`);
      }
      return polysApi.paymentGateway.createStripePayment({
        amount: donationAmount,
        project_id: project.id,
        project_title: project.title,
        currency: 'brl',
      });
    },
    onSuccess: (data: any) => {
      if (data.success && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error('Erro ao iniciar pagamento Stripe');
      }
    },
    onError: (error: any) => {
      const userRole = user?.user_role || user?.role || 'usuario';
      const isManagerOrAdmin = ['gestor', 'administrador', 'manager', 'admin', 'administrator'].includes(userRole?.toLowerCase() || '');
      let errorDescription = 'Tente novamente.';
      if (error.message?.includes('Token do Stripe não configurado')) {
        errorDescription = isManagerOrAdmin
          ? 'Configure o token do Stripe em Configurações > API Tokens.'
          : 'Entre em contato com o suporte.';
      } else if (error.message) {
        errorDescription = error.message;
      }
      toast.error('Erro ao processar pagamento', { description: errorDescription });
    },
  });

  const resetForm = () => {
    stopPolling();
    setAmount('');
    setCustomAmount('');
    setPaymentMethod('pix');
    setIsSubscription(false);
    setAnonymous(false);
    setPaymentStep('form');
    setPixData(null);
    setPixStatus(null);
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
    if (paymentMethod === 'pix') {
      pixMutation.mutate();
    } else {
      stripeMutation.mutate();
    }
  };

  const handleCopyPixCode = () => {
    const code = pixData?.br_code;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onClose();
    }}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-teal-600" />
            {paymentStep === 'pix_generated' ? 'Pagamento PIX' : paymentStep === 'success' ? 'Doação Confirmada!' : 'Fazer Doação'}
          </DialogTitle>
          <DialogDescription>
            {paymentStep === 'pix_generated'
              ? 'Escaneie o QR Code ou copie o código PIX'
              : paymentStep === 'success'
              ? 'Obrigado pela sua contribuição!'
              : `Contribua com o projeto "${project.title}"`
            }
          </DialogDescription>
        </DialogHeader>

        {paymentStep === 'form' && (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
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
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <RadioGroupItem value="cartao" id="cartao" />
                  <Label htmlFor="cartao" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    Cartão de Crédito/Débito
                    <span className="text-xs text-blue-600 ml-auto">Stripe</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <RadioGroupItem value="boleto" id="boleto" />
                  <Label htmlFor="boleto" className="flex items-center gap-2 cursor-pointer flex-1">
                    <FileText className="w-5 h-5 text-slate-600" />
                    Boleto Bancário
                    <span className="text-xs text-blue-600 ml-auto">Stripe</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={anonymous}
                  onCheckedChange={setAnonymous as (checked: boolean | 'indeterminate') => void}
                />
                <Label htmlFor="anonymous" className="text-sm cursor-pointer">
                  Doar anonimamente
                </Label>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total a doar:</span>
                <span className="text-xl font-bold text-teal-700 dark:text-teal-400">
                  {formatCurrency(amount === 'custom' ? parseFloat(customAmount) || 0 : parseFloat(amount) || 0)}
                </span>
              </div>
            </div>

            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 h-12"
              onClick={handleSubmit}
              disabled={pixMutation.isPending || stripeMutation.isPending || (!amount && !customAmount)}
            >
              {(pixMutation.isPending || stripeMutation.isPending) ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</>
              ) : (
                <><Heart className="w-4 h-4 mr-2" />{paymentMethod === 'pix' ? 'Gerar QR Code PIX' : 'Ir para Stripe'}</>
              )}
            </Button>

            <p className="text-xs text-center text-slate-500">
              10% do valor é destinado à manutenção da plataforma.
              Seus dados estão protegidos.
            </p>
          </div>
        )}

        {paymentStep === 'pix_generated' && pixData && (
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">
                {formatCurrency(pixData.amount)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Pagamento para: {project.title}
              </p>
            </div>

            {pixData.qr_code_base64 && (
              <div className="flex justify-center">
                <img
                  src={pixData.qr_code_base64}
                  alt="QR Code PIX"
                  className="w-48 h-48 border rounded-xl"
                />
              </div>
            )}

            {pixData.br_code && (
              <div className="space-y-1">
                <Label>Código PIX (copia e cola)</Label>
                <div className="flex gap-2">
                  <Input
                    value={pixData.br_code}
                    readOnly
                    className="text-xs font-mono bg-slate-50 dark:bg-slate-800"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyPixCode}>
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            {pixStatus === 'EXPIRED' ? (
              <p className="text-center text-sm text-red-500">
                QR Code expirado.{' '}
                <button className="underline" onClick={() => { stopPolling(); setPixData(null); setPixStatus(null); setPaymentStep('form'); }}>
                  Gerar novo
                </button>
              </p>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Aguardando pagamento...
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => { resetForm(); onClose(); }}
            >
              Fechar
            </Button>
          </div>
        )}

        {paymentStep === 'success' && (
          <div className="space-y-6 py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Pagamento confirmado!
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Obrigado por contribuir com o projeto "{project.title}"!
              </p>
            </div>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => { resetForm(); onClose(); }}
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

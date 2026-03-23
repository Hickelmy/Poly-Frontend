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
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, CreditCard, QrCode, FileText, Loader2, Copy, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [anonymous, setAnonymous] = useState<boolean>(false);
  const [step, setStep] = useState<'form' | 'pix_generated' | 'success'>('form');
  const [pixData, setPixData] = useState<any>(null);
  const [pixStatus, setPixStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  const MIN_DONATION = 20;
  const presets = [20, 50, 100, 250, 500];

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
          setStep('success');
        } else if (result.status === 'EXPIRED') {
          stopPolling();
        }
      } catch (_) {}
    }, 3000);
  };

  const getAmount = (): number => {
    return amount === 'custom' ? parseFloat(customAmount) || 0 : parseFloat(amount) || 0;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const handleError = (error: any, gateway: string) => {
    const userRole = user?.user_role || user?.role || 'usuario';
    const isManager = ['gestor', 'administrador', 'manager', 'admin', 'administrator'].includes(userRole?.toLowerCase() || '');
    let desc = 'Tente novamente.';
    if (error.message?.includes('Token') && error.message?.includes('não configurado')) {
      desc = isManager ? `Configure o token do ${gateway} em Configuracoes > API Tokens.` : 'Entre em contato com o suporte.';
    } else if (error.message) {
      desc = error.message;
    }
    toast.error(`Erro ao processar pagamento`, { description: desc });
  };

  const pixMutation = useMutation({
    mutationFn: async () => {
      const val = getAmount();
      if (val < MIN_DONATION) throw new Error(`Valor minimo: R$ ${MIN_DONATION},00`);
      return polysApi.paymentGateway.createPixPayment({
        amount: val,
        project_id: project.id,
        project_title: project.title,
        anonymous,
      });
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setPixData(data);
        setPixStatus('PENDING');
        setStep('pix_generated');
        startPolling(data.pix_id);
      }
    },
    onError: (err: any) => handleError(err, 'Abacate Pay'),
  });

  const stripeMutation = useMutation({
    mutationFn: async () => {
      const val = getAmount();
      if (val < MIN_DONATION) throw new Error(`Valor minimo: R$ ${MIN_DONATION},00`);
      return polysApi.paymentGateway.createStripePayment({
        amount: val,
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
    onError: (err: any) => handleError(err, 'Stripe'),
  });

  const resetForm = () => {
    stopPolling();
    setAmount('');
    setCustomAmount('');
    setPaymentMethod('pix');
    setAnonymous(false);
    setStep('form');
    setPixData(null);
    setPixStatus(null);
    setCopied(false);
  };

  const handleSubmit = () => {
    const val = getAmount();
    if (!val || val <= 0) return toast.error('Selecione um valor');
    if (val < MIN_DONATION) return toast.error(`Valor minimo: R$ ${MIN_DONATION},00`);
    if (paymentMethod === 'pix') pixMutation.mutate();
    else stripeMutation.mutate();
  };

  const handleCopy = () => {
    if (!pixData?.br_code) return;
    navigator.clipboard.writeText(pixData.br_code);
    setCopied(true);
    toast.success('Codigo PIX copiado!');
    setTimeout(() => setCopied(false), 3000);
  };

  if (!project) return null;

  const currentAmount = project.current_amount || 0;
  const targetAmount = project.target_amount || 1;
  const percentage = Math.min((currentAmount / targetAmount) * 100, 100);
  const isLoading = pixMutation.isPending || stripeMutation.isPending;
  const donationValue = getAmount();

  const paymentOptions = [
    { id: 'pix', label: 'PIX', icon: QrCode, provider: 'Abacate Pay', color: 'text-emerald-500' },
    { id: 'cartao', label: 'Cartao', icon: CreditCard, provider: 'Stripe', color: 'text-blue-500' },
    { id: 'boleto', label: 'Boleto', icon: FileText, provider: 'Stripe', color: 'text-slate-500' },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden">

        {/* === STEP: FORM === */}
        {step === 'form' && (
          <>
            {/* Header com gradiente */}
            <div className="bg-gradient-to-br from-teal-600 to-emerald-600 px-6 pt-6 pb-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-5 h-5" />
                <h2 className="text-lg font-bold">Fazer Doacao</h2>
              </div>
              <p className="text-teal-100 text-sm leading-snug">
                {project.title}
              </p>

              {/* Progress inline */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-teal-100">Arrecadado</span>
                  <span className="font-semibold">
                    {formatCurrency(currentAmount)} <span className="text-teal-200 font-normal">/ {formatCurrency(targetAmount)}</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-teal-200 text-right">{percentage.toFixed(0)}% da meta</p>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Valor */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Quanto voce quer doar?
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {presets.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => { setAmount(val.toString()); setCustomAmount(''); }}
                      className={cn(
                        "relative px-3 py-3 rounded-xl text-sm font-semibold border-2 transition-all",
                        amount === val.toString()
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                    >
                      R$ {val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmount('custom')}
                    className={cn(
                      "px-3 py-3 rounded-xl text-sm font-semibold border-2 transition-all",
                      amount === 'custom'
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 shadow-sm"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                  >
                    Outro
                  </button>
                </div>

                {amount === 'custom' && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">R$</span>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className={cn(
                        "pl-10 h-11 text-lg font-semibold",
                        customAmount && parseFloat(customAmount) < MIN_DONATION && "border-red-400 focus-visible:ring-red-400"
                      )}
                      min={MIN_DONATION}
                      step="0.01"
                      autoFocus
                    />
                    <p className={cn(
                      "text-xs mt-1",
                      customAmount && parseFloat(customAmount) < MIN_DONATION ? "text-red-500" : "text-slate-400"
                    )}>
                      Valor minimo: R$ {MIN_DONATION},00
                    </p>
                  </div>
                )}
              </div>

              {/* Pagamento */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Forma de pagamento
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentOptions.map((opt) => {
                    const Icon = opt.icon;
                    const selected = paymentMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentMethod(opt.id)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                          selected
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 shadow-sm"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", selected ? "text-teal-600" : opt.color)} />
                        <span className={cn("text-xs font-medium", selected ? "text-teal-700 dark:text-teal-300" : "text-slate-600 dark:text-slate-400")}>
                          {opt.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{opt.provider}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Anonimo */}
              <div className="flex items-center gap-2.5 py-1">
                <Checkbox
                  id="anonymous"
                  checked={anonymous}
                  onCheckedChange={setAnonymous as (checked: boolean | 'indeterminate') => void}
                />
                <Label htmlFor="anonymous" className="text-sm cursor-pointer text-slate-600 dark:text-slate-400">
                  Doar anonimamente
                </Label>
              </div>
            </div>

            {/* Footer fixo */}
            <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
              {donationValue > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {formatCurrency(donationValue)}
                  </span>
                </div>
              )}
              <Button
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-base font-semibold"
                onClick={handleSubmit}
                disabled={isLoading || donationValue <= 0}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</>
                ) : (
                  <><Heart className="w-4 h-4 mr-2" />Doar agora</>
                )}
              </Button>
              <p className="text-[11px] text-center text-slate-400">
                10% destinado a manutencao da plataforma. Dados protegidos.
              </p>
            </div>
          </>
        )}

        {/* === STEP: PIX GERADO === */}
        {step === 'pix_generated' && pixData && (
          <div className="flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-teal-600" />
                Pagamento PIX
              </DialogTitle>
              <DialogDescription>
                Escaneie o QR Code ou copie o codigo para pagar
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-6 space-y-5">
              <div className="text-center">
                <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                  {formatCurrency(pixData.amount)}
                </p>
                <p className="text-sm text-slate-500 mt-1">{project.title}</p>
              </div>

              {pixData.qr_code_base64 && (
                <div className="flex justify-center">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border">
                    <img
                      src={pixData.qr_code_base64}
                      alt="QR Code PIX"
                      className="w-44 h-44"
                    />
                  </div>
                </div>
              )}

              {pixData.br_code && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Codigo PIX (copia e cola)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={pixData.br_code}
                      readOnly
                      className="text-xs font-mono bg-slate-50 dark:bg-slate-800"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                      {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {pixStatus === 'EXPIRED' ? (
                <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    QR Code expirado.{' '}
                    <button className="underline font-medium" onClick={() => { stopPolling(); setPixData(null); setPixStatus(null); setStep('form'); }}>
                      Gerar novo
                    </button>
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
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
          </div>
        )}

        {/* === STEP: SUCESSO === */}
        {step === 'success' && (
          <div className="flex flex-col items-center px-6 py-12 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Doacao confirmada!
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Obrigado por contribuir com<br />
                <span className="font-medium text-slate-700 dark:text-slate-300">"{project.title}"</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400">
              <Sparkles className="w-3.5 h-3.5" />
              Sua contribuicao faz a diferenca na comunidade
            </div>
            <Button
              className="bg-teal-600 hover:bg-teal-700 px-8"
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

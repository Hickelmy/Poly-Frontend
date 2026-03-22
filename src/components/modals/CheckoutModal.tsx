import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MapPin, Package, Truck, CheckCircle2, Loader2, Plus, Minus, CreditCard, AlertTriangle, QrCode, Copy, Store, HandshakeIcon, Bike, Car, TruckIcon, Container } from 'lucide-react';
import { cn } from "@/lib/utils";
import AddressSelectionModal from "./AddressSelectionModal";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  product: any;
  user?: any;
  paymentStatus?: string;
}

interface AddressData {
  street?: string;
  house_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

const STEPS = [
  { id: 1, label: 'Entrega', name: 'delivery' },
  { id: 2, label: 'Pagamento', name: 'payment' },
  { id: 3, label: 'Confirmação', name: 'confirmation' },
];

const TRANSPORT_OPTIONS = [
  { value: 'moto', label: 'Motoboy', icon: <Bike className="w-5 h-5" /> },
  { value: 'carro', label: 'Carro', icon: <Car className="w-5 h-5" /> },
  { value: 'van', label: 'Van', icon: <TruckIcon className="w-5 h-5" /> },
  { value: 'caminhao', label: 'Caminhão', icon: <Container className="w-5 h-5" /> },
];

interface DeliveryStepProps {
  product: any;
  user?: any;
  onNext: () => void;
  deliveryMethod: string | null;
  setDeliveryMethod: (v: string) => void;
  selectedAddress: AddressData | null;
  setSelectedAddress: (v: AddressData | null) => void;
  showAddressModal: boolean;
  setShowAddressModal: (v: boolean) => void;
  quantity: number;
  setQuantity: (v: number | ((prev: number) => number)) => void;
  selectedTransport: string | null;
  setSelectedTransport: (v: string) => void;
}

function DeliveryStep({ product, user, onNext, deliveryMethod, setDeliveryMethod, selectedAddress, setSelectedAddress, showAddressModal, setShowAddressModal, quantity, setQuantity, selectedTransport, setSelectedTransport }: DeliveryStepProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);

  const formatAddress = (): string => {
    if (!selectedAddress) return '';
    const parts = [
      selectedAddress.street,
      selectedAddress.house_number,
      selectedAddress.neighborhood,
      selectedAddress.city,
      selectedAddress.state,
      selectedAddress.cep
    ].filter(Boolean);
    return parts.join(', ');
  };

  const displayAddress = formatAddress();
  const hasAddress = selectedAddress && selectedAddress.street && selectedAddress.city;

  const shippingIncluded = product?.shippingPaidBy === 'seller';
  const sellerDeliveryTypes: string[] = product?.deliveryTypes || [];
  const hasRetirada = sellerDeliveryTypes.includes('retirada');
  const hasEntregaPropria = sellerDeliveryTypes.includes('entrega_propria');
  const availableTransports = sellerDeliveryTypes
    .map((v: string) => TRANSPORT_OPTIONS.find(o => o.value === v))
    .filter(Boolean) as typeof TRANSPORT_OPTIONS;

  const maxQuantity = product?.quantityAvailable ?? product?.quantity_available ?? 99999;
  const unitType = product?.unitType || 'unidade';
  const isWeightOrVolume = unitType === 'kg' || unitType === 'litro';
  const unitLabel = unitType === 'kg' ? 'kg' : unitType === 'litro' ? 'L' : '';
  const step = isWeightOrVolume ? 0.5 : 1;
  const minQty = isWeightOrVolume ? 0.5 : 1;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-base font-semibold text-slate-900 dark:text-white">
          Quantidade{unitLabel ? ` (${unitLabel})` : ''}
        </Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setQuantity(prev => Math.max(minQty, parseFloat((prev - step).toFixed(2))))}
            disabled={quantity <= minQty}
            className="h-10 w-10"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Input
            type="number"
            min={minQty}
            max={maxQuantity}
            step={step}
            value={quantity}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || minQty;
              if (value >= minQty && value <= maxQuantity) setQuantity(value);
            }}
            className="w-24 text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setQuantity(prev => Math.min(maxQuantity, parseFloat((prev + step).toFixed(2))))}
            disabled={quantity >= maxQuantity}
            className="h-10 w-10"
          >
            <Plus className="w-4 h-4" />
          </Button>
          {maxQuantity < 99999 && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Disponível: {maxQuantity}{unitLabel ? ` ${unitLabel}` : maxQuantity === 1 ? ' unidade' : ' unidades'}
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Escolha a forma de entrega
        </h3>

        <RadioGroup value={deliveryMethod ?? ''} onValueChange={setDeliveryMethod}>
          <div className="space-y-4">
            <Card className={cn(
              "border-2 transition-all",
              availableTransports.length === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              deliveryMethod === 'delivery'
                ? "border-teal-500 bg-teal-50/50 dark:bg-teal-900/20"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            )}>
              <label className={cn("block", availableTransports.length > 0 ? "cursor-pointer" : "cursor-not-allowed")}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="delivery" id="delivery" className="mt-1" disabled={availableTransports.length === 0} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className="w-5 h-5 text-teal-600" />
                        <Label htmlFor="delivery" className="text-base font-semibold text-slate-900 dark:text-white cursor-pointer">
                          Enviar no meu endereço
                        </Label>
                        <span className={cn("text-sm font-semibold ml-auto", shippingIncluded ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                          {shippingIncluded ? 'Frete incluso' : 'Frete a combinar'}
                        </span>
                      </div>

                      {availableTransports.length === 0 ? (
                        <p className="text-xs text-slate-400 mt-1">O vendedor não cadastrou opções de entrega.</p>
                      ) : (
                        <>
                          {deliveryMethod === 'delivery' && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Selecione o meio de transporte:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {availableTransports.map(({ value, label, icon }) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); setSelectedTransport(value); }}
                                    className={cn(
                                      "flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all",
                                      selectedTransport === value
                                        ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30"
                                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                    )}
                                  >
                                    <span className={cn("shrink-0", selectedTransport === value ? "text-teal-600" : "text-slate-400")}>{icon}</span>
                                    <span className={cn("text-sm font-medium", selectedTransport === value ? "text-teal-700 dark:text-teal-300" : "text-slate-700 dark:text-slate-300")}>{label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {deliveryMethod !== 'delivery' && (
                            <div className="flex gap-1.5 mt-1 flex-wrap text-slate-400">
                              {availableTransports.map(({ value, icon, label }) => (
                                <span key={value} title={label}>{icon}</span>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {deliveryMethod === 'delivery' && (
                        <div className="mt-3">
                          {hasAddress ? (
                            <>
                              <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">{displayAddress}</p>
                              <button type="button" className="text-sm text-teal-600 dark:text-teal-400 hover:underline" onClick={(e) => { e.preventDefault(); setShowAddressModal(true); }}>
                                Alterar endereço
                              </button>
                            </>
                          ) : (
                            <button type="button" className="text-sm text-teal-600 dark:text-teal-400 hover:underline" onClick={(e) => { e.preventDefault(); setShowAddressModal(true); }}>
                              Selecionar endereço de entrega
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </label>
            </Card>

            {hasEntregaPropria && (
            <Card className={cn(
              "border-2 cursor-pointer transition-all",
              deliveryMethod === 'seller_delivery'
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            )}>
              <label className="block cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="seller_delivery" id="seller_delivery" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <HandshakeIcon className="w-5 h-5 text-emerald-600" />
                        <Label htmlFor="seller_delivery" className="text-base font-semibold text-slate-900 dark:text-white cursor-pointer">
                          Entrega pelo Vendedor
                        </Label>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400 ml-auto">
                          Sem taxa de entrega
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        O vendedor entrega diretamente no seu endereço, sem custo de frete
                      </p>
                      {deliveryMethod === 'seller_delivery' && (
                        <div className="mt-3">
                          {hasAddress ? (
                            <>
                              <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">{displayAddress}</p>
                              <button type="button" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline" onClick={(e) => { e.preventDefault(); setShowAddressModal(true); }}>
                                Alterar endereço
                              </button>
                            </>
                          ) : (
                            <button type="button" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline" onClick={(e) => { e.preventDefault(); setShowAddressModal(true); }}>
                              Selecionar endereço de entrega
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </label>
            </Card>
            )}

            {hasRetirada && (
            <Card className={cn(
              "border-2 cursor-pointer transition-all",
              deliveryMethod === 'pickup'
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            )}>
              <label className="block cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <RadioGroupItem value="pickup" id="pickup" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Store className="w-5 h-5 text-emerald-600" />
                          <Label htmlFor="pickup" className="text-base font-semibold text-slate-900 dark:text-white cursor-pointer">
                            Retirada no Local
                          </Label>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400 ml-auto">
                            Sem taxa de entrega
                          </span>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {product.sellerName || 'Vendedor'}
                          </p>
                          {product.location_address && (
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {product.location_address}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Você busca o produto diretamente no endereço do vendedor
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </label>
            </Card>
            )}
          </div>
        </RadioGroup>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={async () => {
            if ((deliveryMethod === 'delivery' || deliveryMethod === 'seller_delivery') && hasAddress && user) {
              try {
                const { polysApi } = await import('@/api/polysClient');
                await polysApi.auth.updateMe({
                  street: selectedAddress!.street,
                  house_number: selectedAddress!.house_number,
                  neighborhood: selectedAddress!.neighborhood,
                  city: selectedAddress!.city,
                  state: selectedAddress!.state,
                  cep: selectedAddress!.cep,
                  residence_lat: selectedAddress!.latitude,
                  residence_lng: selectedAddress!.longitude,
                });
              } catch (error) {
                console.error('Erro ao salvar endereço:', error);
              }
            }
            onNext();
          }}
          disabled={
            !deliveryMethod
            || (deliveryMethod === 'delivery' && (!hasAddress || (availableTransports.length > 0 && !selectedTransport)))
            || (deliveryMethod === 'seller_delivery' && !hasAddress)
          }
          className="bg-teal-600 hover:bg-teal-700"
        >
          Continuar
        </Button>
      </div>

      <AddressSelectionModal
        open={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        user={user}
        currentAddress={selectedAddress}
        onSelectAddress={(address) => {
          setSelectedAddress(address);
          setShowAddressModal(false);
        }}
      />
    </div>
  );
}

interface PaymentStepProps {
  product: any;
  quantity: number;
  total: number;
  deliveryMethod: string | null;
  selectedAddress: AddressData | null;
  onBack: () => void;
  onSuccess: () => void;
  user?: any;
}

function PaymentStep({ product, quantity, total, deliveryMethod, selectedAddress, onBack, onSuccess, user }: PaymentStepProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pixData, setPixData] = useState<any>(null);
  const [pixStatus, setPixStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        const { polysApi } = await import('@/api/polysClient');
        const result = await polysApi.paymentGateway.checkPixStatus(pixId);
        setPixStatus(result.status);
        if (result.status === 'PAID' || result.status === 'EXPIRED') {
          stopPolling();
        }
      } catch (_) {}
    }, 3000);
  };

  const handlePixPayment = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const { polysApi } = await import('@/api/polysClient');
      const result = await polysApi.paymentGateway.createPixPayment({
        amount: total,
        product_id: product.id,
        product_title: product.title,
        quantity,
      });
      if (result.success) {
        setPixData(result);
        setPixStatus('PENDING');
        startPolling(result.pix_id);
      } else {
        throw new Error('Erro ao gerar PIX');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar PIX. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const { polysApi } = await import('@/api/polysClient');
      const result = await polysApi.paymentGateway.createStripePayment({
        amount: total,
        product_id: product.id,
        product_title: product.title,
        quantity,
        currency: 'brl',
      });
      if (result.success && result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        throw new Error('Erro ao criar pagamento');
      }
    } catch (error: any) {
      const userRole = user?.user_role || user?.role || 'usuario';
      const isManagerOrAdmin = ['gestor', 'administrador', 'manager', 'admin', 'administrator'].includes(userRole.toLowerCase());
      let errorMessage = 'Erro ao processar pagamento. Tente novamente.';
      if (error.message?.includes('Token do Stripe não configurado')) {
        errorMessage = isManagerOrAdmin
          ? 'Token do Stripe não está configurado. Configure em Configurações > API Tokens.'
          : 'Erro ao processar pagamento. Entre em contato com o suporte.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { duration: 5000 });
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (pixData?.br_code) {
      navigator.clipboard.writeText(pixData.br_code);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  if (pixData) {
    if (pixStatus === 'PAID') {
      return (
        <div className="space-y-6 text-center py-8">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Pagamento confirmado!
            </h3>
            <p className="text-slate-500 dark:text-slate-400">Seu PIX foi pago com sucesso.</p>
          </div>
          <Button onClick={onSuccess} className="bg-teal-600 hover:bg-teal-700">Fechar</Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(total)}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Escaneie o QR Code ou copie o código PIX</p>
        </div>

        {pixData.qr_code_base64 && (
          <div className="flex justify-center">
            <img src={pixData.qr_code_base64} alt="QR Code PIX" className="w-48 h-48 border rounded-xl" />
          </div>
        )}

        {pixData.br_code && (
          <div className="flex gap-2">
            <Input value={pixData.br_code} readOnly className="text-xs font-mono bg-slate-50 dark:bg-slate-800" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        )}

        {pixStatus === 'EXPIRED' ? (
          <p className="text-center text-sm text-red-500">
            QR Code expirado.{' '}
            <button className="underline" onClick={() => { setPixData(null); setPixStatus(null); }}>
              Gerar novo
            </button>
          </p>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Aguardando pagamento...
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => { stopPolling(); setPixData(null); setPixStatus(null); }}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        Escolha a forma de pagamento
      </h3>

      <div className="space-y-3">
        <Card
          className={cn(
            'border-2 cursor-pointer transition-all',
            selectedMethod === 'pix'
              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
          )}
          onClick={() => setSelectedMethod('pix')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <QrCode className="w-6 h-6 text-teal-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-slate-900 dark:text-white">PIX</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pagamento instantâneo via Abacate Pay</p>
            </div>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Instantâneo</span>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'border-2 cursor-pointer transition-all',
            selectedMethod === 'stripe'
              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
          )}
          onClick={() => setSelectedMethod('stripe')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-blue-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-slate-900 dark:text-white">Cartão ou Boleto</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Crédito, débito e boleto via Stripe</p>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Stripe</span>
          </CardContent>
        </Card>
      </div>

      {selectedMethod && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-300">Total a pagar:</span>
          <span className="font-bold text-teal-600 dark:text-teal-400">{formatCurrency(total)}</span>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Voltar
        </Button>
        <Button
          onClick={selectedMethod === 'pix' ? handlePixPayment : handleStripePayment}
          disabled={!selectedMethod || loading}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</>
          ) : selectedMethod === 'pix' ? (
            <><QrCode className="w-4 h-4 mr-2" />Gerar QR Code PIX</>
          ) : (
            <><CreditCard className="w-4 h-4 mr-2" />Ir para Stripe</>
          )}
        </Button>
      </div>
    </div>
  );
}

interface PurchaseSummaryProps {
  product: any;
  deliveryMethod: string | null;
  shippingCost: number | null;
  quantity?: number;
}

function PurchaseSummary({ product, deliveryMethod, shippingCost, quantity = 1 }: PurchaseSummaryProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);

  const unitPrice = product?.price || 0;
  const subtotal = unitPrice * quantity;
  const shippingIsIncluded = shippingCost === 0;
  const total = subtotal + (shippingIsIncluded ? 0 : 0);

  return (
    <Card className="border-0 shadow-sm sticky top-4">
      <CardContent className="p-5 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Resumo da compra
        </h3>

        <div className="space-y-3 pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">Produto</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {formatCurrency(subtotal)}
            </span>
          </div>

          {quantity > 0 && (
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pl-4">
              <span>
                {formatCurrency(unitPrice)} × {quantity}{product?.unitType === 'kg' ? ' kg' : product?.unitType === 'litro' ? ' L' : ''}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">Frete</span>
            <span className={cn("font-medium", shippingIsIncluded ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
              {shippingIsIncluded ? 'Incluso no preço' : 'A combinar'}
            </span>
          </div>

          <div className="flex justify-between pt-3 border-t">
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              Total {!shippingIsIncluded && <span className="text-xs font-normal text-slate-400">(+ frete)</span>}
            </span>
            <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
              {formatCurrency(subtotal)}
            </span>
          </div>
        </div>

        {product?.images?.[0] && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-3">
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {product.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatCurrency(product.price)} / {product.unitType || 'unidade'}
                  {quantity > 1 && (
                    <span className="ml-2 font-medium">
                      × {quantity}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CheckoutModal({ open, onClose, product, user, paymentStatus }: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [deliveryMethod, setDeliveryMethod] = useState<string | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    if (currentStep === 1) {
      resetAndClose();
    } else {
      setShowExitConfirm(true);
    }
  };

  const resetAndClose = () => {
    setCurrentStep(1);
    setDeliveryMethod(null);
    setSelectedTransport(null);
    setSelectedAddress(null);
    setShowAddressModal(false);
    setQuantity(1);
    setShowExitConfirm(false);
    onClose();
  };

  const handleConfirmExit = () => {
    resetAndClose();
  };

  useEffect(() => {
    if (open && product) {
      const isWeightOrVolume = product.unitType === 'kg' || product.unitType === 'litro';
      setQuantity(isWeightOrVolume ? 0.5 : 1);
    }
  }, [open, product?.id]);

  useEffect(() => {
    if (open && paymentStatus === 'approved') {
      setCurrentStep(3);
    }
  }, [open, paymentStatus]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);

  const shippingIncluded = product?.shippingPaidBy === 'seller';
  const shippingCost = shippingIncluded ? 0 : null;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen && open) {
          handleClose();
        }
      }}>
        <DialogContent
          className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleClose();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            handleClose();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
            handleClose();
          }}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Finalizar Compra</DialogTitle>
          </DialogHeader>

        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-2 flex-1">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                    currentStep > step.id
                      ? "bg-teal-600 border-teal-600 text-white"
                      : currentStep === step.id
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400"
                  )}>
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step.id}</span>
                    )}
                  </div>
                  <span className={cn(
                    "text-sm font-medium hidden sm:block",
                    currentStep >= step.id
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-400"
                  )}>
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "h-0.5 flex-1 mx-2 transition-colors",
                    currentStep > step.id
                      ? "bg-teal-600"
                      : "bg-slate-200 dark:bg-slate-700"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {currentStep === 1 && (
                <DeliveryStep
                  product={product}
                  user={user}
                  onNext={handleNext}
                  deliveryMethod={deliveryMethod}
                  setDeliveryMethod={setDeliveryMethod}
                  selectedAddress={selectedAddress}
                  setSelectedAddress={setSelectedAddress}
                  showAddressModal={showAddressModal}
                  setShowAddressModal={setShowAddressModal}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  selectedTransport={selectedTransport}
                  setSelectedTransport={setSelectedTransport}
                />
              )}

              {currentStep === 2 && (
                <PaymentStep
                  product={product}
                  quantity={quantity}
                  total={(product?.price || 0) * quantity}
                  deliveryMethod={deliveryMethod}
                  selectedAddress={selectedAddress}
                  onBack={handleBack}
                  onSuccess={handleClose}
                  user={user}
                />
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Pedido realizado com sucesso! 🎉
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                      Obrigado pela sua compra! Seu pedido foi confirmado e será processado em breve.
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Você receberá um email com os detalhes do pedido.
                    </p>
                  </div>
                  <div className="flex justify-end pt-4 border-t gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleClose();
                        window.location.href = createPageUrl('MyOrders');
                      }}
                    >
                      Ver Meus Pedidos
                    </Button>
                    <Button
                      onClick={handleClose}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <PurchaseSummary
                product={product}
                deliveryMethod={deliveryMethod}
                shippingCost={shippingCost}
                quantity={quantity}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Deseja realmente sair?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se você sair agora, todas as informações do pedido serão perdidas e você precisará começar novamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>
            Continuar Compra
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmExit}
            className="bg-red-600 hover:bg-red-700"
          >
            Sim, Desistir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

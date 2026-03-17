import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  CheckCircle2, Loader2, Truck, Package, QrCode, CreditCard,
  Copy, AlertTriangle, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import AddressSelectionModal from '@/components/modals/AddressSelectionModal';
import { createPageUrl } from '@/utils';

const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const STEPS = [
  { id: 1, label: 'Entrega' },
  { id: 2, label: 'Pagamento' },
  { id: 3, label: 'Confirmação' },
];

// ─── Sidebar: resumo do carrinho ─────────────────────────────────────────────
function CartSummary({ items, totalPrice, deliveryMethod }) {
  return (
    <Card className="border-0 shadow-sm sticky top-4">
      <CardContent className="p-5 space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Resumo do pedido</h3>

        <div className="space-y-3 max-h-52 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          {items.map(item => {
            const unitPrice = item.discountPercent
              ? item.price * (1 - item.discountPercent / 100)
              : item.price;
            return (
              <div key={item.id} className="flex items-center gap-3">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 dark:text-white line-clamp-1">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.quantity}× {fmtBRL(unitPrice)}</p>
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                  {fmtBRL(unitPrice * item.quantity)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">{fmtBRL(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Frete</span>
            <span className="text-amber-600 font-medium">A combinar</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="font-semibold text-slate-900 dark:text-white">Total</span>
            <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{fmtBRL(totalPrice)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 1: Entrega ──────────────────────────────────────────────────────────
function DeliveryStep({ user, deliveryMethod, setDeliveryMethod, selectedAddress, setSelectedAddress, onNext }) {
  const [showAddressModal, setShowAddressModal] = useState(false);

  const formatAddress = () => {
    if (!selectedAddress) return '';
    return [selectedAddress.street, selectedAddress.house_number, selectedAddress.neighborhood, selectedAddress.city, selectedAddress.state]
      .filter(Boolean).join(', ');
  };

  const hasAddress = selectedAddress?.street && selectedAddress?.city;

  const canContinue = deliveryMethod === 'pickup' || (deliveryMethod === 'delivery' && hasAddress);

  const handleNext = async () => {
    if (deliveryMethod === 'delivery' && hasAddress && user) {
      try {
        const { polysApi } = await import('@/api/polysClient');
        await polysApi.auth.updateMe({
          street: selectedAddress.street,
          house_number: selectedAddress.house_number,
          neighborhood: selectedAddress.neighborhood,
          city: selectedAddress.city,
          state: selectedAddress.state,
          cep: selectedAddress.cep,
          residence_lat: selectedAddress.latitude,
          residence_lng: selectedAddress.longitude,
        });
      } catch (_) {}
    }
    onNext();
  };

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">Escolha a forma de entrega</h3>

      <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
        <div className="space-y-3">
          {/* Delivery */}
          <Card className={cn(
            'border-2 cursor-pointer transition-all',
            deliveryMethod === 'delivery'
              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300',
          )}>
            <label className="block cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="delivery" id="cart-delivery" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-teal-600" />
                      <Label htmlFor="cart-delivery" className="text-sm font-semibold cursor-pointer">
                        Enviar para meu endereço
                      </Label>
                      <span className="text-xs text-amber-600 ml-auto">Frete a combinar</span>
                    </div>

                    {deliveryMethod === 'delivery' && (
                      <div className="mt-3">
                        {hasAddress ? (
                          <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <p>{formatAddress()}</p>
                              <button
                                type="button"
                                className="text-teal-600 dark:text-teal-400 hover:underline mt-1"
                                onClick={(e) => { e.preventDefault(); setShowAddressModal(true); }}
                              >
                                Alterar endereço
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
                            onClick={(e) => { e.preventDefault(); setShowAddressModal(true); }}
                          >
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

          {/* Pickup */}
          <Card className={cn(
            'border-2 cursor-pointer transition-all',
            deliveryMethod === 'pickup'
              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300',
          )}>
            <label className="block cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="pickup" id="cart-pickup" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-teal-600" />
                      <Label htmlFor="cart-pickup" className="text-sm font-semibold cursor-pointer">
                        Retirar com o vendedor
                      </Label>
                      <span className="text-xs text-green-600 ml-auto">Grátis</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Entre em contato com cada vendedor para combinar a retirada.
                    </p>
                  </div>
                </div>
              </CardContent>
            </label>
          </Card>
        </div>
      </RadioGroup>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleNext} disabled={!canContinue} className="bg-teal-600 hover:bg-teal-700">
          Continuar
        </Button>
      </div>

      <AddressSelectionModal
        open={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        user={user}
        currentAddress={selectedAddress}
        onSelectAddress={(address) => { setSelectedAddress(address); setShowAddressModal(false); }}
      />
    </div>
  );
}

// ─── Step 2: Pagamento ────────────────────────────────────────────────────────
function PaymentStep({ total, items, onBack, onSuccess, user }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [pixStatus, setPixStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef(null);

  const stopPolling = () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  useEffect(() => () => stopPolling(), []);

  const startPolling = (pixId) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const { polysApi } = await import('@/api/polysClient');
        const result = await polysApi.paymentGateway.checkPixStatus(pixId);
        setPixStatus(result.status);
        if (result.status === 'PAID' || result.status === 'EXPIRED') stopPolling();
      } catch (_) {}
    }, 3000);
  };

  const handlePixPayment = async () => {
    setLoading(true);
    try {
      const { polysApi } = await import('@/api/polysClient');
      const result = await polysApi.paymentGateway.createPixPayment({
        amount: total,
        product_title: items?.length ? items.map(i => i.title).join(', ') : 'Carrinho de compras',
        quantity: items?.reduce((acc, i) => acc + i.quantity, 0) || 1,
        product_id: items?.[0]?.id,
      });
      if (result.success) {
        setPixData(result);
        setPixStatus('PENDING');
        startPolling(result.pix_id);
      } else throw new Error('Erro ao gerar PIX');
    } catch (error) {
      toast.error(error.message || 'Erro ao gerar PIX.');
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    setLoading(true);
    try {
      const { polysApi } = await import('@/api/polysClient');
      const result = await polysApi.paymentGateway.createStripePayment({
        amount: total,
        product_title: items?.length ? items.map(i => i.title).join(', ') : 'Carrinho de compras',
        quantity: items?.reduce((acc, i) => acc + i.quantity, 0) || 1,
        currency: 'brl',
        product_id: items?.[0]?.id,
      });
      if (result.success && result.checkout_url) {
        window.location.href = result.checkout_url;
      } else throw new Error('Erro ao criar pagamento');
    } catch (error) {
      const isAdmin = ['gestor', 'administrador'].includes(user?.user_role?.toLowerCase());
      toast.error(
        error.message?.includes('Token do Stripe')
          ? (isAdmin ? 'Configure o token do Stripe em Configurações > API Tokens.' : 'Erro ao processar pagamento.')
          : (error.message || 'Erro ao processar pagamento.'),
        { duration: 5000 },
      );
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

  // QR code view
  if (pixData) {
    if (pixStatus === 'PAID') {
      return (
        <div className="space-y-6 text-center py-8">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Pagamento confirmado!</h3>
            <p className="text-slate-500 dark:text-slate-400">Seu PIX foi pago com sucesso.</p>
          </div>
          <Button onClick={onSuccess} className="bg-teal-600 hover:bg-teal-700">Fechar</Button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-teal-600">{fmtBRL(total)}</p>
          <p className="text-sm text-slate-500 mt-1">Escaneie o QR Code ou copie o código PIX</p>
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
            <button className="underline" onClick={() => { setPixData(null); setPixStatus(null); }}>Gerar novo</button>
          </p>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Aguardando pagamento...
          </div>
        )}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => { stopPolling(); setPixData(null); setPixStatus(null); }}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">Escolha a forma de pagamento</h3>
      <div className="space-y-3">
        <Card
          className={cn('border-2 cursor-pointer transition-all', selectedMethod === 'pix' ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300')}
          onClick={() => setSelectedMethod('pix')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <QrCode className="w-6 h-6 text-teal-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-slate-900 dark:text-white">PIX</p>
              <p className="text-xs text-slate-500">Pagamento instantâneo via Abacate Pay</p>
            </div>
            <span className="text-xs text-green-600 font-medium">Instantâneo</span>
          </CardContent>
        </Card>
        <Card
          className={cn('border-2 cursor-pointer transition-all', selectedMethod === 'stripe' ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300')}
          onClick={() => setSelectedMethod('stripe')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-blue-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-slate-900 dark:text-white">Cartão ou Boleto</p>
              <p className="text-xs text-slate-500">Crédito, débito e boleto via Stripe</p>
            </div>
            <span className="text-xs text-blue-600 font-medium">Stripe</span>
          </CardContent>
        </Card>
      </div>

      {selectedMethod && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-300">Total a pagar:</span>
          <span className="font-bold text-teal-600">{fmtBRL(total)}</span>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={loading}>Voltar</Button>
        <Button
          onClick={selectedMethod === 'pix' ? handlePixPayment : handleStripePayment}
          disabled={!selectedMethod || loading}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</> :
           selectedMethod === 'pix' ? <><QrCode className="w-4 h-4 mr-2" />Gerar QR Code PIX</> :
           <><CreditCard className="w-4 h-4 mr-2" />Ir para Stripe</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export default function CartCheckoutModal({ open, onClose, user }) {
  const { items, totalPrice, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // pré-preenche endereço do perfil do usuário
  useEffect(() => {
    if (open && user?.street) {
      setSelectedAddress({
        street: user.street,
        house_number: user.house_number,
        neighborhood: user.neighborhood,
        city: user.city,
        state: user.state,
        cep: user.cep,
        latitude: user.residence_lat,
        longitude: user.residence_lng,
      });
    }
  }, [open, user]);

  const resetAndClose = () => {
    setCurrentStep(1);
    setDeliveryMethod(null);
    setSelectedAddress(null);
    setShowExitConfirm(false);
    onClose();
  };

  const handleSuccess = () => {
    clearCart();
    setCurrentStep(3);
  };

  const handleClose = () => {
    if (currentStep === 1) resetAndClose();
    else setShowExitConfirm(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && open) handleClose(); }}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onEscapeKeyDown={(e) => { e.preventDefault(); handleClose(); }}
          onPointerDownOutside={(e) => { e.preventDefault(); handleClose(); }}
          onInteractOutside={(e) => { e.preventDefault(); handleClose(); }}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Finalizar Compra</DialogTitle>
          </DialogHeader>

          {/* Stepper */}
          <div className="shrink-0 mb-4">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2 flex-1">
                    <div className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                      currentStep >= step.id ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400',
                    )}>
                      {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-semibold">{step.id}</span>}
                    </div>
                    <span className={cn('text-sm font-medium hidden sm:block', currentStep >= step.id ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn('h-0.5 flex-1 mx-2 transition-colors', currentStep > step.id ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700')} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {currentStep === 1 && (
                  <DeliveryStep
                    user={user}
                    deliveryMethod={deliveryMethod}
                    setDeliveryMethod={setDeliveryMethod}
                    selectedAddress={selectedAddress}
                    setSelectedAddress={setSelectedAddress}
                    onNext={() => setCurrentStep(2)}
                  />
                )}
                {currentStep === 2 && (
                  <PaymentStep
                    total={totalPrice}
                    items={items}
                    onBack={() => setCurrentStep(1)}
                    onSuccess={handleSuccess}
                    user={user}
                  />
                )}
                {currentStep === 3 && (
                  <div className="space-y-6 text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                        Pedido realizado com sucesso! 🎉
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-4">
                        Obrigado pela sua compra! Seu pedido foi confirmado e será processado em breve.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3">
                      <Button variant="outline" onClick={() => { resetAndClose(); window.location.href = createPageUrl('MyOrders'); }}>
                        Ver Meus Pedidos
                      </Button>
                      <Button onClick={resetAndClose} className="bg-teal-600 hover:bg-teal-700">Fechar</Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="lg:col-span-1">
                <CartSummary items={items} totalPrice={totalPrice} deliveryMethod={deliveryMethod} />
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
              Deseja sair do checkout?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Seu carrinho será mantido, mas você precisará selecionar a forma de entrega e pagamento novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>Continuar Compra</AlertDialogCancel>
            <AlertDialogAction onClick={resetAndClose} className="bg-red-600 hover:bg-red-700">Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import React, { useState, useEffect } from 'react';
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
import { MapPin, Package, Truck, CheckCircle2, Loader2, Plus, Minus, CreditCard } from 'lucide-react';
import { cn } from "@/lib/utils";
import AddressSelectionModal from "./AddressSelectionModal";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: 'Entrega', name: 'delivery' },
  { id: 2, label: 'Pagamento', name: 'payment' },
  { id: 3, label: 'Confirmação', name: 'confirmation' },
];

// Primeira etapa - Seleção de entrega
function DeliveryStep({ product, user, onNext, deliveryMethod, setDeliveryMethod, selectedAddress, setSelectedAddress, showAddressModal, setShowAddressModal, quantity, setQuantity }) {
  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);

  // Formatar endereço selecionado
  const formatAddress = () => {
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

  // Calcular frete (por enquanto grátis)
  const shippingCost = 0;

  // Quantidade disponível
  const maxQuantity = product?.quantity_available || 1;
  const canSelectQuantity = maxQuantity > 1;

  return (
    <div className="space-y-6">
      {/* Seletor de quantidade (se tiver mais de 1 unidade disponível) */}
      {canSelectQuantity && (
        <div className="space-y-2">
          <Label className="text-base font-semibold text-slate-900 dark:text-white">
            Quantidade
          </Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                if (quantity > 1) {
                  setQuantity(quantity - 1);
                }
              }}
              disabled={quantity <= 1}
              className="h-10 w-10"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Input
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                if (value >= 1 && value <= maxQuantity) {
                  setQuantity(value);
                }
              }}
              className="w-20 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                if (quantity < maxQuantity) {
                  setQuantity(quantity + 1);
                }
              }}
              disabled={quantity >= maxQuantity}
              className="h-10 w-10"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Disponível: {maxQuantity} {maxQuantity === 1 ? 'unidade' : 'unidades'}
            </span>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Escolha a forma de entrega
        </h3>

        <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
          <div className="space-y-4">
            {/* Opção 1: Delivery */}
            <Card className={cn(
              "border-2 cursor-pointer transition-all",
              deliveryMethod === 'delivery' 
                ? "border-teal-500 bg-teal-50/50 dark:bg-teal-900/20" 
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            )}>
              <label className="block cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <RadioGroupItem value="delivery" id="delivery" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="w-5 h-5 text-teal-600" />
                          <Label htmlFor="delivery" className="text-base font-semibold text-slate-900 dark:text-white cursor-pointer">
                            Enviar no meu endereço
                          </Label>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400 ml-auto">
                            Grátis
                          </span>
                        </div>
                        
                        {hasAddress ? (
                          <>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                              {displayAddress}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                              Residencial
                            </p>
                            <button
                              type="button"
                              className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                setShowAddressModal(true);
                              }}
                            >
                              Alterar ou escolher outro endereço
                            </button>
                          </>
                        ) : (
                          <div className="mt-4">
                            <button
                              type="button"
                              className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                setShowAddressModal(true);
                              }}
                            >
                              Selecionar endereço de entrega
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </label>
            </Card>

            {/* Opção 2: Retirada */}
            <Card className={cn(
              "border-2 cursor-pointer transition-all",
              deliveryMethod === 'pickup' 
                ? "border-teal-500 bg-teal-50/50 dark:bg-teal-900/20" 
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            )}>
              <label className="block cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <RadioGroupItem value="pickup" id="pickup" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-teal-600" />
                          <Label htmlFor="pickup" className="text-base font-semibold text-slate-900 dark:text-white cursor-pointer">
                            Retirar no local de origem
                          </Label>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400 ml-auto">
                            Grátis
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {product.seller_name || 'Vendedor'}
                          </p>
                          {product.location_address && (
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {product.location_address}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Entre em contato com o vendedor para combinar a retirada
                          </p>
                          <button
                            type="button"
                            className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
                            onClick={(e) => {
                              e.preventDefault();
                              // TODO: Ver localização no mapa
                            }}
                          >
                            Ver localização no mapa
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </label>
            </Card>
          </div>
        </RadioGroup>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={async () => {
            // Se delivery foi selecionado e tem endereço, salva no perfil do usuário
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
              } catch (error) {
                console.error('Erro ao salvar endereço:', error);
              }
            }
            onNext();
          }}
          disabled={!deliveryMethod || (deliveryMethod === 'delivery' && !hasAddress)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          Continuar
        </Button>
      </div>

      {/* Modal de seleção de endereço */}
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

// Etapa de pagamento
function PaymentStep({ product, quantity, total, deliveryMethod, selectedAddress, onBack, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!product) return;

    setLoading(true);
    try {
      const { polysApi } = await import('@/api/polysClient');
      
      // Formata endereço se for delivery
      let deliveryAddress = null;
      if (deliveryMethod === 'delivery' && selectedAddress) {
        deliveryAddress = JSON.stringify({
          street: selectedAddress.street,
          house_number: selectedAddress.house_number,
          neighborhood: selectedAddress.neighborhood,
          city: selectedAddress.city,
          state: selectedAddress.state,
          cep: selectedAddress.cep,
        });
      }

      const result = await polysApi.paymentGateway.createMercadoPagoPayment({
        amount: total,
        product_id: product.id,
        product_title: product.title,
        quantity: quantity,
        delivery_method: deliveryMethod,
        delivery_address: deliveryAddress,
        return_url: `${window.location.origin}/payment/success`,
      });

      if (result.success && result.payment_url) {
        // Redireciona para o checkout do Mercado Pago
        window.location.href = result.payment_url;
      } else {
        throw new Error('Erro ao criar pagamento');
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
      setLoading(false);
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Pagamento
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          Você será redirecionado para o checkout seguro do Mercado Pago para finalizar o pagamento.
        </p>

        <Card className="border-2 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  Mercado Pago
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Pagamento seguro e rápido
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Total a pagar:</span>
                <span className="font-semibold text-lg text-teal-600 dark:text-teal-400">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Voltar
        </Button>
        <Button
          onClick={handlePayment}
          disabled={loading}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            'Finalizar Pagamento'
          )}
        </Button>
      </div>
    </div>
  );
}

// Componente de resumo da compra
function PurchaseSummary({ product, deliveryMethod, shippingCost, quantity = 1 }) {
  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);

  const unitPrice = product?.price || 0;
  const subtotal = unitPrice * quantity;
  const total = subtotal + shippingCost;

  return (
    <Card className="border-0 shadow-sm sticky top-4">
      <CardContent className="p-5 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Resumo da compra
        </h3>

        <div className="space-y-3 pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              {quantity > 1 ? `${quantity}x ` : ''}Produto
            </span>
            <span className="font-medium text-slate-900 dark:text-white">
              {formatCurrency(subtotal)}
            </span>
          </div>
          
          {quantity > 1 && (
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pl-4">
              <span>{formatCurrency(unitPrice)} × {quantity}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">Frete</span>
            <span className={cn(
              "font-medium",
              shippingCost === 0 
                ? "text-green-600 dark:text-green-400" 
                : "text-slate-900 dark:text-white"
            )}>
              {shippingCost === 0 ? 'Grátis' : formatCurrency(shippingCost)}
            </span>
          </div>

          <div className="flex justify-between pt-3 border-t">
            <span className="text-base font-semibold text-slate-900 dark:text-white">Total</span>
            <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
              {formatCurrency(total)}
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
                  {formatCurrency(product.price)} / {product.unit_type || 'unidade'}
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

export default function CheckoutModal({ open, onClose, product, user }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

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
    setCurrentStep(1);
    setDeliveryMethod(null);
    setSelectedAddress(null);
    setShowAddressModal(false);
    setQuantity(1);
    onClose();
  };

  // Reset quantity when product changes or modal opens
  useEffect(() => {
    if (open && product) {
      setQuantity(1);
    }
  }, [open, product?.id]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);

  const shippingCost = 0; // Por enquanto sempre grátis

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Finalizar Compra</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
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
                />
              )}

              {currentStep === 2 && (
                <PaymentStep
                  product={product}
                  quantity={quantity}
                  total={shippingCost + (product?.price || 0) * quantity}
                  deliveryMethod={deliveryMethod}
                  selectedAddress={selectedAddress}
                  onBack={handleBack}
                  onNext={handleNext}
                  onSuccess={handleClose}
                />
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Pedido realizado com sucesso!
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      Você receberá um email com os detalhes do pedido.
                    </p>
                  </div>
                  <div className="flex justify-end pt-4 border-t">
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

            {/* Sidebar - Resumo */}
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
  );
}


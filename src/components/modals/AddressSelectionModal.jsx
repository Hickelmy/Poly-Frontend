import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AddressPicker from "@/components/address/AddressPicker";
import { MapPin, CheckCircle2 } from 'lucide-react';

/**
 * Modal para seleção/edição de endereço de entrega
 */
export default function AddressSelectionModal({ 
  open, 
  onClose, 
  user, 
  currentAddress,
  onSelectAddress 
}) {
  const [address, setAddress] = useState(currentAddress || null);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (currentAddress) {
      setAddress(currentAddress);
    }
  }, [currentAddress]);

  useEffect(() => {
    // Valida se o endereço está completo
    if (address) {
      const hasRequiredFields = 
        address.street && 
        address.house_number && 
        address.city && 
        address.state;
      setIsValid(hasRequiredFields);
    } else {
      setIsValid(false);
    }
  }, [address]);

  const handleSave = () => {
    if (isValid && address) {
      onSelectAddress(address);
      onClose();
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    const parts = [
      addr.street,
      addr.house_number,
      addr.neighborhood,
      addr.city,
      addr.state,
      addr.cep
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" />
            Selecionar Endereço de Entrega
          </DialogTitle>
          <DialogDescription>
            Escolha ou cadastre um endereço para receber sua compra
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <AddressPicker
            value={address}
            onChange={setAddress}
            user={user}
          />

          {address && isValid && (
            <div className="mt-6 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-teal-900 dark:text-teal-100 mb-1">
                    Endereço selecionado:
                  </p>
                  <p className="text-sm text-teal-700 dark:text-teal-300">
                    {formatAddress(address)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Usar este endereço
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


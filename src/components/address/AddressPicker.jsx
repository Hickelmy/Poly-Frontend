import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Search, Navigation } from 'lucide-react';
import { toast } from "sonner";

/**
 * Componente para buscar e selecionar endereço
 * Tenta obter via geolocalização primeiro, depois permite edição manual
 */
export default function AddressPicker({ value, onChange, user }) {
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [addressFromGeo, setAddressFromGeo] = useState(null);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [address, setAddress] = useState(value || {
    street: '',
    house_number: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
    latitude: null,
    longitude: null,
    address: '',
  });

  useEffect(() => {
    if (value) {
      setAddress(value);
    }
  }, [value]);

  // Tenta obter endereço via geolocalização
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo navegador');
      setShowManualEdit(true);
      return;
    }

    setLoadingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Validar coordenadas
        if (isNaN(latitude) || isNaN(longitude) || 
            latitude < -90 || latitude > 90 || 
            longitude < -180 || longitude > 180) {
          console.error('Coordenadas inválidas:', latitude, longitude);
          toast.error('Coordenadas inválidas. Tente novamente.');
          setLoadingLocation(false);
          setShowManualEdit(true);
          return;
        }
        
        console.log('Localização obtida:', latitude, longitude);
        
        try {
          // Reverse geocoding usando Nominatim (OpenStreetMap)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=pt-BR`,
            {
              headers: {
                'User-Agent': 'POLYS App'
              }
            }
          );
          
          const data = await response.json();
          
          if (data && data.address) {
            const addr = data.address;
            const newAddress = {
              street: addr.road || addr.street || '',
              house_number: addr.house_number || addr.house || '',
              neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || '',
              city: addr.city || addr.town || addr.municipality || '',
              state: addr.state || '',
              cep: addr.postcode || '',
              latitude,
              longitude,
              address: data.display_name || '',
            };
            
            setAddressFromGeo(newAddress);
            setAddress(newAddress);
            onChange(newAddress);
            toast.success('Endereço encontrado via localização!');
            setShowManualEdit(true); // Mostrar campos para edição
          } else {
            toast.info('Endereço não encontrado. Preencha manualmente.');
            setShowManualEdit(true);
          }
        } catch (error) {
          console.error('Erro ao buscar endereço:', error);
          toast.error('Erro ao buscar endereço. Preencha manualmente.');
          setShowManualEdit(true);
        } finally {
          setLoadingLocation(false);
        }
      },
      async (error) => {
        setLoadingLocation(false);
        console.error('Erro na geolocalização:', error);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Permissão de localização negada. Preencha o endereço manualmente.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Localização indisponível. Tentando localização por IP...');
            // Tentar localização por IP como fallback
            try {
              const response = await fetch('https://ipapi.co/json/');
              const data = await response.json();
              if (data.latitude && data.longitude) {
                const lat = parseFloat(data.latitude);
                const lng = parseFloat(data.longitude);
                if (!isNaN(lat) && !isNaN(lng)) {
                  // Usar localização por IP
                  const response2 = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pt-BR`,
                    {
                      headers: {
                        'User-Agent': 'POLYS App'
                      }
                    }
                  );
                  const data2 = await response2.json();
                  if (data2 && data2.address) {
                    const addr = data2.address;
                    const newAddress = {
                      street: addr.road || addr.street || '',
                      house_number: addr.house_number || addr.house || '',
                      neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || '',
                      city: addr.city || addr.town || addr.municipality || '',
                      state: addr.state || '',
                      cep: addr.postcode || '',
                      latitude: lat,
                      longitude: lng,
                      address: data2.display_name || '',
                    };
                    setAddress(newAddress);
                    onChange(newAddress);
                    toast.success('Endereço encontrado via localização aproximada (IP)!');
                    setShowManualEdit(true);
                    return;
                  }
                }
              }
            } catch (ipError) {
              console.error('Erro ao buscar localização por IP:', ipError);
            }
            toast.error('Localização indisponível. Preencha o endereço manualmente.');
            break;
          case error.TIMEOUT:
            toast.warning('Tempo esgotado. Tentando localização aproximada...');
            // Tentar localização por IP como fallback
            try {
              const response = await fetch('https://ipapi.co/json/');
              const data = await response.json();
              if (data.latitude && data.longitude) {
                const lat = parseFloat(data.latitude);
                const lng = parseFloat(data.longitude);
                if (!isNaN(lat) && !isNaN(lng)) {
                  // Usar localização por IP
                  const response2 = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pt-BR`,
                    {
                      headers: {
                        'User-Agent': 'POLYS App'
                      }
                    }
                  );
                  const data2 = await response2.json();
                  if (data2 && data2.address) {
                    const addr = data2.address;
                    const newAddress = {
                      street: addr.road || addr.street || '',
                      house_number: addr.house_number || addr.house || '',
                      neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || '',
                      city: addr.city || addr.town || addr.municipality || '',
                      state: addr.state || '',
                      cep: addr.postcode || '',
                      latitude: lat,
                      longitude: lng,
                      address: data2.display_name || '',
                    };
                    setAddress(newAddress);
                    onChange(newAddress);
                    toast.success('Endereço encontrado via localização aproximada (IP)!');
                    setShowManualEdit(true);
                    return;
                  }
                }
              }
            } catch (ipError) {
              console.error('Erro ao buscar localização por IP:', ipError);
            }
            toast.error('Tempo esgotado. Preencha o endereço manualmente.');
            break;
          default:
            toast.error('Erro ao obter localização. Preencha o endereço manualmente.');
        }
        setShowManualEdit(true);
      },
      {
        enableHighAccuracy: false, // Reduzir precisão para ser mais rápido
        timeout: 10000, // Reduzir timeout para 10 segundos
        maximumAge: 300000 // Aceitar localização com até 5 minutos de idade
      }
    );
  };

  // Busca CEP via API
  const handleCepBlur = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setAddress(prev => ({
          ...prev,
          cep: data.cep,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
        toast.success('CEP encontrado!');
      } else {
        toast.error('CEP não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP');
    }
  };

  const handleChange = (field) => (e) => {
    const newAddress = {
      ...address,
      [field]: e.target.value,
    };
    setAddress(newAddress);
    onChange(newAddress);
  };


  // Se já tem endereço do usuário, usa ele
  useEffect(() => {
    if (user && !address.street && !showManualEdit) {
      const userAddress = {
        street: user.street || '',
        house_number: user.house_number || '',
        neighborhood: user.neighborhood || '',
        city: user.city || '',
        state: user.state || '',
        cep: user.cep || '',
        latitude: user.residence_lat || null,
        longitude: user.residence_lng || null,
        address: user.street 
          ? `${user.street}, ${user.house_number || ''} - ${user.neighborhood || ''}, ${user.city || ''} - ${user.state || ''}, ${user.cep || ''}`
          : '',
      };
      
      if (userAddress.street || userAddress.city) {
        setAddress(userAddress);
        onChange(userAddress);
      } else {
        // Tenta buscar automaticamente
        getCurrentLocation();
      }
    } else if (!user && !address.street && !showManualEdit) {
      // Se não tem usuário, não tenta buscar automaticamente
      // Deixa o usuário escolher se quer usar geolocalização ou preencher manualmente
    }
  }, [user]);

  return (
    <div className="space-y-4">
      {!showManualEdit && !address.street && (
        <Card className="border-2 border-dashed">
          <CardContent className="p-6 text-center space-y-4">
            <MapPin className="w-12 h-12 text-teal-600 mx-auto" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Buscar endereço automaticamente
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Use sua localização atual para preencher o endereço automaticamente
              </p>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Botão "Usar minha localização" clicado');
                  getCurrentLocation();
                }}
                disabled={loadingLocation}
                className="bg-teal-600 hover:bg-teal-700"
                type="button"
              >
                {loadingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 mr-2" />
                    Usar minha localização
                  </>
                )}
              </Button>
            </div>
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowManualEdit(true)}
                className="w-full"
              >
                <Search className="w-4 h-4 mr-2" />
                Preencher manualmente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(showManualEdit || address.street) && (
        <div className="space-y-4">
          {address.street && (
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowManualEdit(false);
                  setAddress({
                    street: '',
                    house_number: '',
                    neighborhood: '',
                    city: '',
                    state: '',
                    cep: '',
                    latitude: null,
                    longitude: null,
                    address: '',
                  });
                  onChange({
                    street: '',
                    house_number: '',
                    neighborhood: '',
                    city: '',
                    state: '',
                    cep: '',
                    latitude: null,
                    longitude: null,
                    address: '',
                  });
                }}
              >
                Limpar
              </Button>
            </div>
          )}

          {/* Campos de endereço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>CEP</Label>
              <Input
                value={address.cep}
                onChange={handleChange('cep')}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                maxLength={9}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Rua / Logradouro *</Label>
              <Input
                value={address.street}
                onChange={handleChange('street')}
                placeholder="Nome da rua"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Número *</Label>
              <Input
                value={address.house_number}
                onChange={handleChange('house_number')}
                placeholder="123"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input
                value={address.neighborhood}
                onChange={handleChange('neighborhood')}
                placeholder="Nome do bairro"
              />
            </div>

            <div className="space-y-2">
              <Label>Cidade *</Label>
              <Input
                value={address.city}
                onChange={handleChange('city')}
                placeholder="Cidade"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Estado *</Label>
              <Input
                value={address.state}
                onChange={handleChange('state')}
                placeholder="UF"
                maxLength={2}
                required
              />
            </div>
          </div>

          {address.street && address.house_number && address.city && (
            <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
              <p className="text-sm font-medium text-teal-900 dark:text-teal-100 mb-1">
                Endereço completo:
              </p>
              <p className="text-sm text-teal-700 dark:text-teal-300">
                {address.street}, {address.house_number}
                {address.neighborhood && ` - ${address.neighborhood}`}
                {address.city && `, ${address.city}`}
                {address.state && ` - ${address.state}`}
                {address.cep && `, ${address.cep}`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


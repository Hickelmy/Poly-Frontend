import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from 'lucide-react';
import { cn } from "@/lib/utils";

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon
const createMarkerIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: #0d9488;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export default function LocationPicker({ value, onChange, className }) {
  const [address, setAddress] = useState(value?.address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(!value?.address);
  const [userCity, setUserCity] = useState(null);
  const [userCountry, setUserCountry] = useState(null);
  
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const locationDetectedRef = useRef(false);

  // Coordenadas padrão (Brasil central)
  const defaultCenter = [-14.2350, -51.9253];
  const [mapCenter, setMapCenter] = useState(
    value?.latitude && value?.longitude 
      ? [value.latitude, value.longitude]
      : defaultCenter
  );

  // Detectar localização do usuário automaticamente
  useEffect(() => {
    // Só detecta se não houver valor inicial e ainda não foi detectado
    if (value?.address || locationDetectedRef.current) return;

    const detectUserLocation = async () => {
      setDetectingLocation(true);
      locationDetectedRef.current = true;

      // Tentar geolocalização do navegador primeiro
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            // Validar coordenadas do GPS
            if (!isNaN(latitude) && !isNaN(longitude) && 
                latitude >= -90 && latitude <= 90 && 
                longitude >= -180 && longitude <= 180) {
              console.log('Localização GPS obtida:', latitude, longitude);
              await setUserLocationFromCoords(latitude, longitude);
            } else {
              console.error('Coordenadas GPS inválidas:', latitude, longitude);
            }
            setDetectingLocation(false);
          },
          async () => {
            // Se falhar, tentar geolocalização por IP
            await detectLocationByIP();
            setDetectingLocation(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000, // 5 minutos
          }
        );
      } else {
        // Navegador não suporta geolocalização, tentar IP
        await detectLocationByIP();
        setDetectingLocation(false);
      }
    };

    detectUserLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Detectar localização por IP
  const detectLocationByIP = async () => {
    const loc = await import('@/utils/geolocation').then((m) => m.getLocationByIP());
    if (loc && loc.latitude != null && loc.longitude != null) {
      setUserCity(loc.city);
      setUserCountry(loc.country || 'Brasil');
      await setUserLocationFromCoords(loc.latitude, loc.longitude);
    }
  };

  // Definir localização do usuário a partir de coordenadas
  const setUserLocationFromCoords = async (lat, lng) => {
    // Validar coordenadas (latitude deve estar entre -90 e 90, longitude entre -180 e 180)
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error('Coordenadas inválidas:', lat, lng);
      return;
    }

    // Atualizar o centro do mapa
    setMapCenter([lat, lng]);
    
    // Atualizar mapa imediatamente se já estiver pronto
    if (mapRef.current && mapReady) {
      // Usar flyTo para animação suave
      mapRef.current.flyTo([lat, lng], 15, {
        animate: true,
        duration: 1.0
      });
      
      // Adicionar ou atualizar marcador
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          icon: createMarkerIcon(),
          draggable: true,
        }).addTo(mapRef.current);
        markerRef.current = marker;

        marker.on('dragend', async (e) => {
          const { lat: newLat, lng: newLng } = e.target.getLatLng();
          await reverseGeocode(newLat, newLng);
        });
      }
    }
    
    // Fazer geocodificação reversa para obter endereço completo
    const addressData = await reverseGeocode(lat, lng, true);
    
    if (addressData) {
      // Extrair cidade e país do endereço
      const addressObj = addressData.address || {};
      if (addressObj.city) setUserCity(addressObj.city);
      if (addressObj.country) setUserCountry(addressObj.country);
    }
  };

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(mapCenter, 13);
    // Padrão: Escuro (mesmo padrão de todos os mapas)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    
    // Aguardar um pouco para garantir que o mapa está totalmente renderizado
    setTimeout(() => {
      setMapReady(true);
      // Se já tiver coordenadas detectadas, atualizar o mapa
      if (mapCenter && mapCenter !== defaultCenter) {
        map.flyTo(mapCenter, 15, {
          animate: true,
          duration: 0.5
        });
      }
    }, 100);

    // Adicionar marcador inicial se houver coordenadas
    if (value?.latitude && value?.longitude) {
      const marker = L.marker([value.latitude, value.longitude], {
        icon: createMarkerIcon(),
        draggable: true,
      }).addTo(map);

      markerRef.current = marker;

      // Atualizar endereço quando arrastar o marcador
      marker.on('dragend', async (e) => {
        const { lat, lng } = e.target.getLatLng();
        await reverseGeocode(lat, lng);
      });
    } else if (mapCenter && mapCenter !== defaultCenter) {
      // Se tiver centro definido (da detecção automática), adicionar marcador
      const marker = L.marker(mapCenter, {
        icon: createMarkerIcon(),
        draggable: true,
      }).addTo(map);

      markerRef.current = marker;

      marker.on('dragend', async (e) => {
        const { lat, lng } = e.target.getLatLng();
        await reverseGeocode(lat, lng);
      });
    }

    // Clique no mapa para adicionar/mover marcador
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      await handleMapClick(lat, lng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualizar marcador quando coordenadas mudarem externamente ou quando mapa ficar pronto
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const coords = value?.latitude && value?.longitude 
      ? [value.latitude, value.longitude]
      : (mapCenter && mapCenter !== defaultCenter ? mapCenter : null);

    if (coords) {
      // Validar coordenadas
      const [lat, lng] = coords;
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.error('Coordenadas inválidas no useEffect:', lat, lng);
        return;
      }

      // Usar flyTo para atualização suave
      mapRef.current.flyTo(coords, 15, {
        animate: true,
        duration: 0.5
      });

      if (markerRef.current) {
        markerRef.current.setLatLng(coords);
      } else {
        const marker = L.marker(coords, {
          icon: createMarkerIcon(),
          draggable: true,
        }).addTo(mapRef.current);
        markerRef.current = marker;

        marker.on('dragend', async (e) => {
          const { lat, lng } = e.target.getLatLng();
          await reverseGeocode(lat, lng);
        });
      }
    }
  }, [value?.latitude, value?.longitude, mapReady, mapCenter]);

  // Buscar sugestões de endereço (Nominatim)
  const searchAddress = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Construir query com cidade/país se disponível para focar na localização do usuário
      let searchQuery = query;
      if (userCity) {
        // Adicionar cidade à busca para priorizar resultados locais
        searchQuery = `${query}, ${userCity}, Brasil`;
      } else {
        // Limitar ao Brasil se não tiver cidade
        searchQuery = `${query}, Brasil`;
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1&countrycodes=br`,
        {
          headers: {
            'User-Agent': 'POLYS-Community-Platform/1.0',
          },
        }
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
    } finally {
      setLoading(false);
    }
  };

  // Geocodificação reversa (coordenadas -> endereço)
  const reverseGeocode = async (lat, lng, returnData = false) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'POLYS-Community-Platform/1.0',
          },
        }
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        const newAddress = data.display_name;
        setAddress(newAddress);
        
        // Extrair cidade e país se ainda não tiver
        if (data.address) {
          if (!userCity && data.address.city) {
            setUserCity(data.address.city);
          }
          if (!userCountry && data.address.country) {
            setUserCountry(data.address.country);
          }
        }
        
        onChange({
          address: newAddress,
          latitude: lat,
          longitude: lng,
        });

        if (returnData) {
          return data;
        }
      }
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
    } finally {
      setLoading(false);
    }
    return null;
  };

  // Manipular clique no mapa
  const handleMapClick = async (lat, lng) => {
    if (!mapRef.current) return;

    // Remover marcador anterior
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
    }

    // Adicionar novo marcador
    const marker = L.marker([lat, lng], {
      icon: createMarkerIcon(),
      draggable: true,
    }).addTo(mapRef.current);

    markerRef.current = marker;

    // Atualizar endereço via geocodificação reversa
    await reverseGeocode(lat, lng);

    // Atualizar marcador quando arrastar
    marker.on('dragend', async (e) => {
      const { lat: newLat, lng: newLng } = e.target.getLatLng();
      await reverseGeocode(newLat, newLng);
    });
  };

  // Manipular mudança no input
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setAddress(newValue);
    setShowSuggestions(true);

    // Debounce da busca
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(newValue);
    }, 300);
  };

  // Selecionar sugestão
  const handleSelectSuggestion = async (suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    const displayName = suggestion.display_name;

    setAddress(displayName);
    setShowSuggestions(false);
    setSuggestions([]);

    // Atualizar mapa
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);

      // Remover marcador anterior
      if (markerRef.current) {
        mapRef.current.removeLayer(markerRef.current);
      }

      // Adicionar novo marcador
      const marker = L.marker([lat, lng], {
        icon: createMarkerIcon(),
        draggable: true,
      }).addTo(mapRef.current);

      markerRef.current = marker;

      // Atualizar marcador quando arrastar
      marker.on('dragend', async (e) => {
        const { lat: newLat, lng: newLng } = e.target.getLatLng();
        await reverseGeocode(newLat, newLng);
      });
    }

    // Atualizar valor
    onChange({
      address: displayName,
      latitude: lat,
      longitude: lng,
    });
  };

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <Label>Localização do problema *</Label>
        <div className="relative">
          <Input
            ref={inputRef}
            value={address}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Digite o nome da rua, bairro ou endereço..."
            className="pr-10"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          )}
          {!loading && address && (
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          )}

          {/* Sugestões de autocomplete */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border rounded-md shadow-lg max-h-60 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b last:border-b-0"
                >
                  <div className="font-medium text-sm text-slate-900 dark:text-white">
                    {suggestion.display_name.split(',')[0]}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {suggestion.display_name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">
          {detectingLocation 
            ? 'Detectando sua localização...' 
            : userCity 
              ? `Focando em ${userCity}, ${userCountry || 'Brasil'}. Digite o endereço ou clique no mapa para selecionar.`
              : 'Digite o endereço ou clique no mapa para selecionar a localização'}
        </p>
      </div>

      {/* Mapa */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className="w-full h-64 rounded-lg border overflow-hidden"
          style={{ minHeight: '256px' }}
        />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
}


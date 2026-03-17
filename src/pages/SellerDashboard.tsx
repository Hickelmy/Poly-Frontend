import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedZone } from '@/contexts/SelectedZoneContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Package, Plus, ShoppingBag, TrendingUp, Wallet, Eye,
  Edit, Trash2, MoreVertical, Upload, X, Loader2, Wrench, MapPin,
  Truck, User, Calendar, Clock, DollarSign, FileText, Home, ImageOff
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import StatusBadge from '../components/shared/StatusBadge';
import KPICard from '../components/shared/KPICard';
import FullScreenLoading from '../components/shared/FullScreenLoading';
import { ProductCardSkeleton, TableSkeleton, InlineLoading } from '../components/shared/SkeletonLoader';
import CurrencyInput from '../components/shared/CurrencyInput';
import AvailabilityPicker from '../components/shared/AvailabilityPicker';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Location marker icon
const locationIcon = new L.DivIcon({
  className: 'location-marker',
  html: `<div style="
    background: #14b8a6; 
    width: 16px; 
    height: 16px; 
    border-radius: 50%; 
    border: 3px solid white; 
    box-shadow: 0 0 0 2px #14b8a6, 0 2px 8px rgba(20,184,166,0.5);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Small location map component using Leaflet directly
function LocationMap({ lat, lng }: { lat: number; lng: number }) {
  const mapContainerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circlesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!lat || !lng || !mapContainerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        scrollWheelZoom: false,
      }).setView([lat, lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapRef.current = map;
    }

    // Update map center
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 13);
    }

    // Remove old marker
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
    }

    // Add new marker
    markerRef.current = L.marker([lat, lng], { icon: locationIcon }).addTo(mapRef.current);

    // Remove old circles
    circlesRef.current.forEach(circle => {
      if (mapRef.current) {
        mapRef.current.removeLayer(circle);
      }
    });
    circlesRef.current = [];

    // Add new circles
    const circle500m = L.circle([lat, lng], {
      radius: 500,
      color: '#22c55e',
      fillColor: '#22c55e',
      fillOpacity: 0.1,
      weight: 2
    }).addTo(mapRef.current);

    const circle1km = L.circle([lat, lng], {
      radius: 1000,
      color: '#16a34a',
      fillColor: '#16a34a',
      fillOpacity: 0.08,
      weight: 2
    }).addTo(mapRef.current);

    const circle1_5km = L.circle([lat, lng], {
      radius: 1500,
      color: '#15803d',
      fillColor: '#15803d',
      fillOpacity: 0.06,
      weight: 2
    }).addTo(mapRef.current);

    circlesRef.current = [circle500m, circle1km, circle1_5km];

    // Cleanup
    return () => {
      if (markerRef.current && mapRef.current) {
        mapRef.current.removeLayer(markerRef.current);
      }
      circlesRef.current.forEach(circle => {
        if (mapRef.current) {
          mapRef.current.removeLayer(circle);
        }
      });
    };
  }, [lat, lng]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (!lat || !lng) return null;

  return (
    <div className="w-full h-48 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

export default function SellerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [createProductOpen, setCreateProductOpen] = useState<boolean>(false);
  const [createServiceOpen, setCreateServiceOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await polysApi.auth.me();
        setUser(userData);
      } catch (e) {
        polysApi.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  // Fetch seller's products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['sellerProducts', user?.email],
    queryFn: () => polysApi.entities.Product.filter({ seller_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Fetch seller's services
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['sellerServices', user?.email],
    queryFn: () => polysApi.entities.Service.filter({ provider_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Fetch seller's orders (as seller)
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['sellerOrders', user?.email],
    queryFn: () => polysApi.entities.Order.filter({ seller_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Fetch seller's bookings (as provider)
  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['sellerBookings', user?.email],
    queryFn: () => polysApi.entities.ServiceBooking.filter({ provider_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Combined loading state
  const isLoading = loadingProducts || loadingServices || loadingOrders || loadingBookings;

  // Stats
  const totalProductRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);
  
  const totalServiceRevenue = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const pendingOrders = orders.filter(o => ['pending', 'paid'].includes(o.status)).length;
  const pendingBookings = bookings.filter(b => ['requested', 'accepted'].includes(b.status)).length;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Minhas Vendas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie seus produtos e serviços
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setCreateServiceOpen(true)}
          >
            <Wrench className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
          <Button 
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => setCreateProductOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Receita Total"
          value={formatCurrency(totalProductRevenue + totalServiceRevenue)}
          icon={Wallet}
          color="teal"
        />
        <KPICard
          title="Produtos"
          value={products.length}
          subtitle="cadastrados"
          icon={Package}
          color="blue"
        />
        <KPICard
          title="Serviços"
          value={services.length}
          subtitle="ativos"
          icon={Wrench}
          color="purple"
        />
        <KPICard
          title="Pendentes"
          value={pendingOrders + pendingBookings}
          subtitle="pedidos/agendamentos"
          icon={ShoppingBag}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="bookings">Agendamentos</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Meus Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Nenhum produto cadastrado</h3>
                  <p className="text-slate-500 mb-4">Comece a vender na sua comunidade</p>
                  <Button onClick={() => setCreateProductOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Produto
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product}
                      onEdit={() => {
                        setEditingProduct(product);
                        setCreateProductOpen(true);
                      }}
                      onDelete={async () => {
                        await polysApi.entities.Product.delete(product.id);
                        queryClient.invalidateQueries(['sellerProducts']);
                        toast.success('Produto removido');
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Meus Serviços</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingServices ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Nenhum serviço cadastrado</h3>
                  <p className="text-slate-500 mb-4">Ofereça seus serviços para a comunidade</p>
                  <Button onClick={() => setCreateServiceOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Serviço
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service) => (
                    <ServiceCard 
                      key={service.id} 
                      service={service}
                      onEdit={() => {
                        setEditingService(service);
                        setCreateServiceOpen(true);
                      }}
                      onDelete={async () => {
                        await polysApi.entities.Service.delete(service.id);
                        queryClient.invalidateQueries(['sellerServices']);
                        toast.success('Serviço removido');
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Pedidos Recebidos</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <TableSkeleton rows={5} columns={7} />
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Você ainda não recebeu pedidos
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <OrderRow 
                        key={order.id} 
                        order={order} 
                        onUpdate={() => queryClient.invalidateQueries(['sellerOrders'])}
                        onViewDetails={() => setSelectedOrder(order)}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Agendamentos de Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <TableSkeleton rows={5} columns={6} />
              ) : bookings.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Você ainda não recebeu agendamentos
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <BookingRow 
                        key={booking.id} 
                        booking={booking}
                        onUpdate={() => queryClient.invalidateQueries(['sellerBookings'])}
                        onViewDetails={() => setSelectedBooking(booking)}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Product Modal */}
      <ProductFormModal
        open={createProductOpen}
        onClose={() => {
          setCreateProductOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        user={user}
        onSuccess={() => {
          queryClient.invalidateQueries(['sellerProducts']);
          setCreateProductOpen(false);
          setEditingProduct(null);
        }}
      />

      {/* Create/Edit Service Modal */}
      <ServiceFormModal
        open={createServiceOpen}
        onClose={() => {
          setCreateServiceOpen(false);
          setEditingService(null);
        }}
        service={editingService}
        user={user}
        onSuccess={() => {
          queryClient.invalidateQueries(['sellerServices']);
          setCreateServiceOpen(false);
          setEditingService(null);
        }}
      />

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => {
            queryClient.invalidateQueries(['sellerOrders']);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={() => {
            queryClient.invalidateQueries(['sellerBookings']);
            setSelectedBooking(null);
          }}
        />
      )}

      {/* Full Screen Loading - apenas no carregamento inicial quando não há dados */}
      <FullScreenLoading isLoading={isLoading && !user} message="Carregando dados..." />
    </div>
  );
}

// Product Card Component
function ProductCard({ product, onEdit, onDelete }: any) {
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  
  return (
    <Card className="overflow-hidden">
      <div className="relative h-32 bg-slate-200 dark:bg-slate-700">
        {product.images?.[0] ? (
        <img 
            src={product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover"
        />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <ImageOff className="w-8 h-8 mb-1" />
            <span className="text-xs font-medium">No image</span>
          </div>
        )}
        {product.quantityAvailable <= 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Badge className="bg-red-500">Sem Estoque</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold truncate">{product.title}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-teal-600">{formatCurrency(product.price)}</span>
          <Badge variant="secondary">{product.quantityAvailable} un.</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Service Card Component
function ServiceCard({ service, onEdit, onDelete }: any) {
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const priceTypeLabels = {
    hora: '/hora',
    diaria: '/dia',
    servico: '',
    orcamento: 'sob orçamento',
  };
  
  return (
    <Card className="overflow-hidden">
      <div className="relative h-32 bg-slate-200 dark:bg-slate-700">
        {service.images?.[0] ? (
        <img 
            src={service.images[0]}
          alt={service.title}
          className="w-full h-full object-cover"
        />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <ImageOff className="w-8 h-8 mb-1" />
            <span className="text-xs font-medium">No image</span>
          </div>
        )}
        <Badge className={`absolute top-2 right-2 ${service.active ? 'bg-green-500' : 'bg-slate-500'}`}>
          {service.active ? 'Ativo' : 'Inativo'}
        </Badge>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-white text-xs">
            <Wrench className="w-3 h-3" />
            <span>{service.provider_name || 'Você'}</span>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold truncate">{service.title}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Preços Disponíveis */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {service.price_per_hour && (
            <Badge variant="outline" className="text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800">
              {formatCurrency(service.price_per_hour)}/h
            </Badge>
          )}
          {service.price_per_day && (
            <Badge variant="outline" className="text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800">
              {formatCurrency(service.price_per_day)}/dia
            </Badge>
          )}
          {service.price_per_service && (
            <Badge variant="outline" className="text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800">
              {formatCurrency(service.price_per_service)} completo
            </Badge>
          )}
          {!service.price_per_hour && !service.price_per_day && !service.price_per_service && (
            <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              Sob orçamento
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Order Row Component
function OrderRow({ order, onUpdate, onViewDetails }: any) {
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const updateStatus = async (status) => {
    await polysApi.entities.Order.update(order.id, { status });
    onUpdate();
    toast.success('Status atualizado');
  };

  return (
    <TableRow 
      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group" 
      onClick={onViewDetails}
    >
      <TableCell className="font-medium group-hover:text-teal-600 dark:group-hover:text-teal-400">
        {order.product_title}
      </TableCell>
      <TableCell>{order.buyer_email}</TableCell>
      <TableCell>{order.quantity}</TableCell>
      <TableCell className="font-semibold">{formatCurrency(order.total_amount)}</TableCell>
      <TableCell><StatusBadge status={order.status} size="sm" /></TableCell>
      <TableCell>{format(new Date(order.created_date), 'dd/MM/yy')}</TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewDetails}>
              <Eye className="w-4 h-4 mr-2" />
              Ver Detalhes
            </DropdownMenuItem>
            {order.status === 'paid' && (
              <DropdownMenuItem onClick={() => updateStatus('shipped')}>
                Marcar como Enviado
              </DropdownMenuItem>
            )}
            {order.status === 'shipped' && (
              <DropdownMenuItem onClick={() => updateStatus('delivered')}>
                Marcar como Entregue
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// Booking Row Component
function BookingRow({ booking, onUpdate, onViewDetails }: any) {
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const updateStatus = async (status) => {
    await polysApi.entities.ServiceBooking.update(booking.id, { status });
    onUpdate();
    toast.success('Status atualizado');
  };

  const isPending = booking.status === 'requested';
  
  return (
    <TableRow 
      className={`cursor-pointer transition-colors group ${
        isPending 
          ? 'bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 border-l-4 border-l-amber-500' 
          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
      onClick={onViewDetails}
    >
      <TableCell className="font-medium group-hover:text-teal-600 dark:group-hover:text-teal-400">
        {booking.service_title}
        {isPending && (
          <Badge className="ml-2 bg-amber-500 text-white animate-pulse">Novo</Badge>
        )}
      </TableCell>
      <TableCell>{booking.client_email}</TableCell>
      <TableCell>{format(new Date(booking.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</TableCell>
      <TableCell className="font-semibold">{formatCurrency(booking.total_amount)}</TableCell>
      <TableCell><StatusBadge status={booking.status} size="sm" /></TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewDetails}>
              <Eye className="w-4 h-4 mr-2" />
              Ver Detalhes
            </DropdownMenuItem>
            {booking.status === 'requested' && (
              <>
                <DropdownMenuItem onClick={() => updateStatus('accepted')}>
                  Aceitar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus('cancelled')} className="text-red-600">
                  Recusar
                </DropdownMenuItem>
              </>
            )}
            {booking.status === 'accepted' && (
              <DropdownMenuItem onClick={() => updateStatus('completed')}>
                Marcar como Concluído
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// Product Form Modal
function ProductFormModal({ open, onClose, product, user, onSuccess }: any) {
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    price: '',
    quantity_available: '1',
    category: '',
    condition: 'novo',
    images: [],
    lat: null,
    lng: null
  });
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [gettingLocation, setGettingLocation] = useState<boolean>(false);

  // Função para arredondar coordenadas (privacidade - 3 casas decimais = ~100m)
  const roundCoordinate = (coord) => {
    return Math.round(coord * 1000) / 1000;
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Seu navegador não suporta geolocalização');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = roundCoordinate(position.coords.latitude);
        const lng = roundCoordinate(position.coords.longitude);
        setFormData(prev => ({ ...prev, lat, lng }));
        toast.success('Localização capturada com sucesso');
        setGettingLocation(false);
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        toast.error('Não foi possível obter sua localização. Verifique as permissões do navegador.');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: false, // Não precisa de alta precisão para privacidade
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        quantity_available: product.quantity_available?.toString() || '1',
        category: product.category || '',
        condition: product.condition || 'novo',
        images: product.images || [],
        lat: product.lat || null,
        lng: product.lng || null
      });
    } else {
      setFormData({
        title: '',
        description: '',
        price: '',
        quantity_available: '1',
        category: '',
        condition: 'novo',
        images: [],
        lat: null,
        lng: null
      });
    }
  }, [product, open]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato de imagem não suportado. Use JPG, JPEG, PNG, WEBP ou GIF.');
      e.target.value = '';
      return;
    }
    
    setUploading(true);
    try {
      const { file_url } = await polysApi.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, images: [...prev.images, file_url] }));
    } catch (err) {
      toast.error('Erro ao fazer upload da imagem');
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.price) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (!formData.lat || !formData.lng) {
      toast.error('Capture a localização aproximada do produto');
      return;
    }

    setSaving(true);
    try {
      const data = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        quantityAvailable: parseInt(formData.quantity_available),
        category: formData.category,
        condition: formData.condition,
        images: formData.images,
        lat: formData.lat,
        lng: formData.lng,
        active: true
      };

      if (product) {
        await polysApi.entities.Product.update(product.id, data);
        toast.success('Produto atualizado');
      } else {
        await polysApi.entities.Product.create(data);
        toast.success('Produto criado');
      }
      onSuccess();
    } catch (err) {
      toast.error('Erro ao salvar produto');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Localização Aproximada */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              Localização Aproximada *
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.lat && formData.lng ? "outline" : "default"}
                onClick={handleGetLocation}
                disabled={gettingLocation}
                className={!formData.lat || !formData.lng ? "border-amber-500 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-500/50 dark:hover:bg-amber-900/30 dark:text-amber-200" : ""}
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Capturando...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    {formData.lat && formData.lng ? 'Atualizar Localização' : 'Capturar Localização'}
                  </>
                )}
              </Button>
              {formData.lat && formData.lng && (
                <div className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Localização capturada</span>
                    <br />
                    <span className="text-xs">
                      Lat: {formData.lat.toFixed(3)}, Lng: {formData.lng.toFixed(3)}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              A localização é aproximada para preservar sua privacidade. Será usada para filtrar produtos próximos a você.
            </p>
            {/* Mapa com círculos de alcance */}
            {formData.lat && formData.lng && open && (
              <div className="mt-3">
                <LocationMap lat={formData.lat} lng={formData.lng} />
                <p className="text-xs text-slate-500 mt-2">
                  Círculos verdes mostram a área de alcance: 500m, 1km e 1.5km
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nome do produto"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva seu produto"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço *</Label>
              <CurrencyInput
                value={formData.price}
                onChange={(value) => setFormData({ ...formData, price: value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={formData.quantity_available}
                onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="eletronicos">Eletrônicos</SelectItem>
                  <SelectItem value="moveis">Móveis</SelectItem>
                  <SelectItem value="vestuario">Vestuário</SelectItem>
                  <SelectItem value="alimentos">Alimentos</SelectItem>
                  <SelectItem value="artesanato">Artesanato</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condição</Label>
              <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="usado_otimo">Usado - Ótimo</SelectItem>
                  <SelectItem value="usado_bom">Usado - Bom</SelectItem>
                  <SelectItem value="usado_regular">Usado - Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagens</Label>
            <div className="flex flex-wrap gap-2">
              {formData.images.map((img, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    onClick={() => setFormData({ ...formData, images: formData.images.filter((_, j) => j !== i) })}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-50">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-slate-400" />}
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {product ? 'Salvar Alterações' : 'Criar Produto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Service Form Modal
function ServiceFormModal({ open, onClose, service, user, onSuccess }: any) {
  const { zones } = useSelectedZone();
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    price_per_hour: '',
    price_per_day: '',
    price_per_service: '',
    service_type: '',
    images: [],
    zone_id: '',
    availability_schedule: null
  });
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (service) {
      setFormData({
        title: service.title || '',
        description: service.description || '',
        price_per_hour: service.price_per_hour?.toString() || '',
        price_per_day: service.price_per_day?.toString() || '',
        price_per_service: service.price_per_service?.toString() || '',
        service_type: service.service_type || '',
        images: service.images || [],
        zone_id: service.zone_id || user?.residence_zone_id || '',
        availability_schedule: service.availability_schedule || null
      });
    } else {
      setFormData({
        title: '',
        description: '',
        price_per_hour: '',
        price_per_day: '',
        price_per_service: '',
        service_type: '',
        images: [],
        zone_id: user?.residence_zone_id || '',
        availability_schedule: null
      });
    }
  }, [service, open, user?.residence_zone_id]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato de imagem não suportado. Use JPG, JPEG, PNG, WEBP ou GIF.');
      e.target.value = '';
      return;
    }
    
    setUploading(true);
    try {
      const { file_url } = await polysApi.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, images: [...prev.images, file_url] }));
    } catch (err) {
      toast.error('Erro ao fazer upload da imagem');
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error('Preencha o título do serviço');
      return;
    }

    // Validar que pelo menos um preço foi preenchido
    const hasPrice = formData.price_per_hour || formData.price_per_day || formData.price_per_service;
    if (!hasPrice) {
      toast.error('Preencha pelo menos um tipo de preço (por hora, por dia ou por serviço)');
      return;
    }

    if (!formData.zone_id) {
      toast.error('Selecione a área onde o serviço está disponível');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        price_per_hour: formData.price_per_hour ? parseFloat(formData.price_per_hour) : null,
        price_per_day: formData.price_per_day ? parseFloat(formData.price_per_day) : null,
        price_per_service: formData.price_per_service ? parseFloat(formData.price_per_service) : null,
        provider_id: user.id,
        provider_email: user.email,
        provider_name: user.full_name,
        zone_id: formData.zone_id || null,
        lat: user.residence_lat || null,
        lng: user.residence_lng || null,
        active: true,
        availability_schedule: formData.availability_schedule || null
      };

      if (service) {
        await polysApi.entities.Service.update(service.id, data);
        toast.success('Serviço atualizado');
      } else {
        await polysApi.entities.Service.create(data);
        toast.success('Serviço criado');
      }
      onSuccess();
    } catch (err) {
      toast.error('Erro ao salvar serviço');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">{service ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna Esquerda - Formulários */}
            <div className="space-y-4">
              {/* Área de Atendimento */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  Área de Atendimento *
                </Label>
                <Select 
                  value={formData.zone_id} 
                  onValueChange={(value) => setFormData({ ...formData, zone_id: value })}
                >
                  <SelectTrigger className={!formData.zone_id ? "border-amber-500" : "h-10"}>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome do serviço"
                  className="h-10"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva seu serviço"
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Tipo de Serviço */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tipo de Serviço</Label>
                <Select value={formData.service_type} onValueChange={(v) => setFormData({ ...formData, service_type: v })}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="limpeza">Limpeza</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="jardinagem">Jardinagem</SelectItem>
                    <SelectItem value="eletrica">Elétrica</SelectItem>
                    <SelectItem value="encanamento">Encanamento</SelectItem>
                    <SelectItem value="pintura">Pintura</SelectItem>
                    <SelectItem value="aulas">Aulas</SelectItem>
                    <SelectItem value="cuidados">Cuidados</SelectItem>
                    <SelectItem value="transporte">Transporte</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preços */}
              <div className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div>
                  <Label className="text-sm font-semibold">Preços do Serviço</Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Preencha pelo menos um tipo de preço
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço por Hora (opcional)</Label>
                    <CurrencyInput
                      value={formData.price_per_hour}
                      onChange={(value) => setFormData({ ...formData, price_per_hour: value })}
                      placeholder="0,00"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço por Dia (opcional)</Label>
                    <CurrencyInput
                      value={formData.price_per_day}
                      onChange={(value) => setFormData({ ...formData, price_per_day: value })}
                      placeholder="0,00"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço por Serviço (opcional)</Label>
                    <CurrencyInput
                      value={formData.price_per_service}
                      onChange={(value) => setFormData({ ...formData, price_per_service: value })}
                      placeholder="0,00"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita - Imagens e Calendário */}
            <div className="space-y-4">
              {/* Imagens */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Imagens do Serviço</Label>
                {formData.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {formData.images.map((img, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setFormData({ ...formData, images: formData.images.filter((_, j) => j !== i) })}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500/90 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs text-slate-500">Adicionar</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.gif"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="block aspect-video border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">Clique para adicionar imagens</span>
                        <span className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP ou GIF</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Calendário de Disponibilidade */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Horários de Disponibilidade</Label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/30">
                  <AvailabilityPicker
                    value={formData.availability_schedule}
                    onChange={(schedule) => setFormData({ ...formData, availability_schedule: schedule })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer com botão */}
        <div className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50">
          <Button 
            className="w-full bg-teal-600 hover:bg-teal-700 h-11 text-base font-semibold" 
            onClick={handleSubmit} 
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              service ? 'Salvar Alterações' : 'Criar Serviço'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Order Details Modal
function OrderDetailsModal({ order, open, onClose, onUpdate }: any) {
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  
  // Calcular quanto o vendedor vai ganhar (assumindo 10% de comissão da plataforma)
  const commission = (order.total_amount || 0) * 0.10;
  const sellerEarnings = (order.total_amount || 0) - commission;

  const updateStatus = async (status) => {
    await polysApi.entities.Order.update(order.id, { status });
    onUpdate();
    toast.success('Status atualizado');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-600" />
            Detalhes do Pedido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações do Produto */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white">Produto</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Nome:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{order.product_title || order.productTitle || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Quantidade:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{order.quantity || 1}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Cliente */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4" />
                Cliente
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Email:</span>
                  <span className="font-medium text-slate-900 dark:text-white break-all">{order.buyer_email || order.userEmail || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Entrega */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Entrega
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Método:</span>
                  <Badge className={order.deliveryMethod === 'delivery' ? 'bg-blue-500' : 'bg-green-500'}>
                    {order.deliveryMethod === 'delivery' ? 'Entrega' : 'Retirada no Local'}
                  </Badge>
                </div>
                {order.deliveryMethod === 'delivery' && order.deliveryAddress && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Endereço de Entrega:</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{order.deliveryAddress}</p>
                      </div>
                    </div>
                  </div>
                )}
                {order.deliveryMethod === 'pickup' && (
                  <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-2">
                      <Home className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                      <p className="text-sm text-green-700 dark:text-green-400">
                        O cliente irá retirar o produto no local de venda.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informações Financeiras */}
          <Card className="border-0 shadow-sm bg-teal-50 dark:bg-teal-900/20">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Valores
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(order.subtotal || order.total_amount)}</span>
                </div>
                {order.shippingCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Frete:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(order.shippingCost)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-teal-200 dark:border-teal-700">
                  <span className="text-slate-600 dark:text-slate-400">Total do Pedido:</span>
                  <span className="font-bold text-lg text-teal-700 dark:text-teal-400">{formatCurrency(order.total_amount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-teal-200 dark:border-teal-700">
                  <span className="text-slate-600 dark:text-slate-400">Comissão da Plataforma (10%):</span>
                  <span className="font-medium text-slate-600 dark:text-slate-400">-{formatCurrency(commission)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-teal-300 dark:border-teal-600">
                  <span className="font-bold text-lg text-slate-900 dark:text-white">Você vai receber:</span>
                  <span className="font-bold text-xl text-teal-700 dark:text-teal-400">{formatCurrency(sellerEarnings)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status e Ações */}
          <Card className="border-2 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Status Atual:</p>
                  <StatusBadge status={order.status} />
                </div>
                {order.status === 'paid' && (
                  <Button 
                    onClick={() => updateStatus('shipped')} 
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 font-semibold"
                    size="lg"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Marcar como Enviado
                  </Button>
                )}
                {order.status === 'shipped' && (
                  <Button 
                    onClick={() => updateStatus('delivered')} 
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 font-semibold"
                    size="lg"
                  >
                    Marcar como Entregue
                  </Button>
                )}
                {order.status === 'delivered' && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Este pedido foi entregue
                  </div>
                )}
                {order.status === 'cancelled' && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Este pedido foi cancelado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data do Pedido */}
          <div className="text-sm text-slate-500 dark:text-slate-400 text-center">
            Pedido realizado em {format(new Date(order.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Booking Details Modal
function BookingDetailsModal({ booking, open, onClose, onUpdate }: any) {
  const [clientCodeInput, setClientCodeInput] = useState<string>('');
  const [verifyingCode, setVerifyingCode] = useState<boolean>(false);
  const [workedHours, setWorkedHours] = useState<number>(booking.actual_worked_hours || 0);
  const [workedMinutes, setWorkedMinutes] = useState<number>(booking.actual_worked_minutes || 0);
  const [savingTime, setSavingTime] = useState<boolean>(false);
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  // Sincronizar valores quando booking mudar
  useEffect(() => {
    setWorkedHours(booking.actual_worked_hours || 0);
    setWorkedMinutes(booking.actual_worked_minutes || 0);
  }, [booking.actual_worked_hours, booking.actual_worked_minutes]);
  
  // Calcular quanto o prestador vai ganhar (assumindo 10% de comissão da plataforma)
  const finalAmount = booking.final_amount || booking.total_amount || 0;
  const commission = finalAmount * 0.10;
  const providerEarnings = finalAmount - commission;

  const updateStatus = async (status) => {
    await polysApi.entities.ServiceBooking.update(booking.id, { status });
    onUpdate();
    toast.success('Status atualizado');
  };

  const handleVerifyCode = async () => {
    if (!clientCodeInput || clientCodeInput.length !== 6) {
      toast.error('Digite um código válido de 6 dígitos');
      return;
    }

    setVerifyingCode(true);
    try {
      // Capturar localização do prestador e cliente (se disponível)
      let providerLat = null;
      let providerLng = null;
      let clientLat = null;
      let clientLng = null;

      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              enableHighAccuracy: true
            });
          });
          providerLat = position.coords.latitude;
          providerLng = position.coords.longitude;
        } catch (geoError) {
          console.warn('Erro ao obter localização:', geoError);
          toast.warning('Não foi possível obter sua localização. O serviço será iniciado mesmo assim.');
        }
      }

      await polysApi.entities.ServiceBooking.verifyCode(booking.id, {
        service_code: clientCodeInput,
        provider_lat: providerLat,
        provider_lng: providerLng,
        client_lat: clientLat,
        client_lng: clientLng
      });
      toast.success('Código verificado! Serviço iniciado.');
      setClientCodeInput('');
      onUpdate();
    } catch (error) {
      toast.error(error.message || 'Código inválido');
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-teal-600" />
            Detalhes do Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Alerta para agendamentos pendentes */}
          {booking.status === 'requested' && (
            <Card className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      Agendamento Pendente de Aprovação
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Você precisa aceitar ou recusar este agendamento. O cliente está aguardando sua resposta.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações do Serviço */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white">Serviço</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Nome:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{booking.service_title || 'N/A'}</span>
                </div>
                {booking.duration_hours && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Duração:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {booking.duration_hours} {booking.duration_hours === 1 ? 'hora' : 'horas'}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informações do Cliente */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4" />
                Cliente
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Email:</span>
                  <span className="font-medium text-slate-900 dark:text-white break-all">{booking.client_email || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data e Hora do Agendamento */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Agendamento
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Data e Hora:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {format(new Date(booking.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          {booking.notes && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Observações do Cliente
                </h3>
                <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line">{booking.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Código de Confirmação */}
          {booking.status === 'accepted' && booking.service_code && (
            <Card className="border-2 border-teal-500 bg-teal-50 dark:bg-teal-900/20">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-600" />
                  Código de Confirmação do Serviço
                </h3>
                <div className="space-y-4">
                  {!booking.code_verified && (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-3">
                        Para iniciar o serviço, peça o código ao cliente e digite abaixo:
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                        O cliente recebeu o código <strong>{booking.service_code}</strong> quando você aceitou o serviço.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="000000"
                          value={clientCodeInput}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setClientCodeInput(value);
                          }}
                          className="text-center text-2xl font-bold tracking-widest"
                          maxLength={6}
                        />
                        <Button
                          onClick={handleVerifyCode}
                          disabled={verifyingCode || clientCodeInput.length !== 6}
                          className="bg-teal-600 hover:bg-teal-700"
                        >
                          {verifyingCode ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Verificando...
                            </>
                          ) : (
                            'Verificar e Iniciar'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {booking.code_verified && (
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-green-900 dark:text-green-200">
                          Código verificado! Serviço em andamento.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tempo Trabalhado (para serviços por hora) */}
          {(booking.status === 'in_progress' || booking.status === 'completed') && booking.service_id && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Tempo Trabalhado
                </h3>
                <WorkedTimeForm
                  booking={booking}
                  workedHours={workedHours}
                  workedMinutes={workedMinutes}
                  onHoursChange={setWorkedHours}
                  onMinutesChange={setWorkedMinutes}
                  onSave={async (hours, minutes) => {
                    setSavingTime(true);
                    try {
                      await polysApi.entities.ServiceBooking.update(booking.id, {
                        actual_worked_hours: hours,
                        actual_worked_minutes: minutes,
                      });
                      toast.success('Tempo trabalhado atualizado!');
                      onUpdate();
                    } catch (error) {
                      toast.error('Erro ao salvar tempo trabalhado');
                    } finally {
                      setSavingTime(false);
                    }
                  }}
                  saving={savingTime}
                />
              </CardContent>
            </Card>
          )}

          {/* Informações Financeiras */}
          <Card className="border-0 shadow-sm bg-teal-50 dark:bg-teal-900/20">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Valores
              </h3>
              <div className="space-y-2">
                {booking.final_amount ? (
                  <>
                    <div className="flex justify-between pt-2 border-t border-teal-200 dark:border-teal-700">
                      <span className="text-slate-600 dark:text-slate-400">Valor Estimado:</span>
                      <span className="font-medium text-slate-600 dark:text-slate-400 line-through">{formatCurrency(booking.total_amount)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-teal-200 dark:border-teal-700">
                      <span className="text-slate-600 dark:text-slate-400">Valor Final (tempo real):</span>
                      <span className="font-bold text-lg text-teal-700 dark:text-teal-400">{formatCurrency(booking.final_amount)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between pt-2 border-t border-teal-200 dark:border-teal-700">
                    <span className="text-slate-600 dark:text-slate-400">Total do Serviço:</span>
                    <span className="font-bold text-lg text-teal-700 dark:text-teal-400">{formatCurrency(booking.total_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-teal-200 dark:border-teal-700">
                  <span className="text-slate-600 dark:text-slate-400">Comissão da Plataforma (10%):</span>
                  <span className="font-medium text-slate-600 dark:text-slate-400">-{formatCurrency(commission)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-teal-300 dark:border-teal-600">
                  <span className="font-bold text-lg text-slate-900 dark:text-white">Você vai receber:</span>
                  <span className="font-bold text-xl text-teal-700 dark:text-teal-400">{formatCurrency(providerEarnings)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status e Ações */}
          <Card className="border-2 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Status Atual:</p>
                  <StatusBadge status={booking.status} />
                </div>
                {booking.status === 'requested' && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button 
                      onClick={() => updateStatus('accepted')} 
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none px-6 py-2.5 font-semibold"
                      size="lg"
                    >
                      ✓ Aceitar Agendamento
                    </Button>
                    <Button 
                      onClick={() => updateStatus('cancelled')} 
                      variant="destructive"
                      className="flex-1 sm:flex-none px-6 py-2.5 font-semibold"
                      size="lg"
                    >
                      ✕ Recusar Agendamento
                    </Button>
                  </div>
                )}
                {booking.status === 'accepted' && (
                  <>
                    <Button 
                      onClick={() => {
                        if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
                          updateStatus('cancelled');
                        }
                      }} 
                      variant="destructive"
                      className="px-6 py-2.5 font-semibold"
                      size="lg"
                    >
                      Cancelar Agendamento
                    </Button>
                    {booking.code_verified && (
                      <Button 
                        onClick={() => updateStatus('completed')} 
                        className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 font-semibold"
                        size="lg"
                      >
                        Marcar como Concluído
                      </Button>
                    )}
                  </>
                )}
                {booking.status === 'in_progress' && (
                  <Button 
                    onClick={() => updateStatus('completed')} 
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 font-semibold"
                    size="lg"
                  >
                    Marcar como Concluído
                  </Button>
                )}
                {booking.status === 'completed' && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Este agendamento foi concluído
                  </div>
                )}
                {booking.status === 'cancelled' && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Este agendamento foi cancelado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente para informar tempo trabalhado
function WorkedTimeForm({ booking, workedHours, workedMinutes, onHoursChange, onMinutesChange, onSave, saving }: any) {
  const formatTime = (hours, minutes) => {
    if (hours === 0 && minutes === 0) return '0 min';
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    return `${hours} ${hours === 1 ? 'hora' : 'horas'} e ${minutes} min`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Horas</Label>
          <Input
            type="number"
            min="0"
            max="24"
            value={workedHours}
            onChange={(e) => onHoursChange(Math.max(0, parseInt(e.target.value) || 0))}
            className="text-center text-lg"
          />
        </div>
        <div>
          <Label>Minutos</Label>
          <Input
            type="number"
            min="0"
            max="59"
            value={workedMinutes}
            onChange={(e) => onMinutesChange(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            className="text-center text-lg"
          />
        </div>
      </div>
      
      {(workedHours > 0 || workedMinutes > 0) && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Tempo informado:</strong> {formatTime(workedHours, workedMinutes)}
          </p>
        </div>
      )}

      <Button
        onClick={() => onSave(workedHours, workedMinutes)}
        disabled={saving || (workedHours === 0 && workedMinutes === 0)}
        className="w-full bg-teal-600 hover:bg-teal-700"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Salvando...
          </>
        ) : (
          'Salvar Tempo Trabalhado'
        )}
      </Button>
    </div>
  );
}
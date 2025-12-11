import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedZone } from '@/contexts/SelectedZoneContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Package, Plus, ShoppingBag, TrendingUp, Wallet, Eye,
  Edit, Trash2, MoreVertical, Upload, X, Loader2, Wrench, MapPin
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

export default function SellerDashboard() {
  const [user, setUser] = useState(null);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingService, setEditingService] = useState(null);

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
  const { data: orders = [] } = useQuery({
    queryKey: ['sellerOrders', user?.email],
    queryFn: () => polysApi.entities.Order.filter({ seller_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Fetch seller's bookings (as provider)
  const { data: bookings = [] } = useQuery({
    queryKey: ['sellerBookings', user?.email],
    queryFn: () => polysApi.entities.ServiceBooking.filter({ provider_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

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
                <div className="text-center py-8">Carregando...</div>
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
                <div className="text-center py-8">Carregando...</div>
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
              {orders.length === 0 ? (
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
              {bookings.length === 0 ? (
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
    </div>
  );
}

// Product Card Component
function ProductCard({ product, onEdit, onDelete }) {
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  
  return (
    <Card className="overflow-hidden">
      <div className="relative h-32">
        <img 
          src={product.images?.[0] || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=150&fit=crop"}
          alt={product.title}
          className="w-full h-full object-cover"
        />
        {product.quantity_available <= 0 && (
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
          <Badge variant="secondary">{product.quantity_available} un.</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Service Card Component
function ServiceCard({ service, onEdit, onDelete }) {
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const priceTypeLabels = {
    hora: '/hora',
    diaria: '/dia',
    servico: '',
    orcamento: 'sob orçamento',
  };
  
  return (
    <Card className="overflow-hidden">
      <div className="relative h-32">
        <img 
          src={service.images?.[0] || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=150&fit=crop"}
          alt={service.title}
          className="w-full h-full object-cover"
        />
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
        <span className="text-lg font-bold text-teal-600">
          {service.price_type === 'orcamento'
            ? 'Sob orçamento'
            : `${formatCurrency(service.price)}${
                priceTypeLabels[service.price_type]
                  ? ` ${priceTypeLabels[service.price_type]}`
                  : ''
              }`}
        </span>
      </CardContent>
    </Card>
  );
}

// Order Row Component
function OrderRow({ order, onUpdate }) {
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const updateStatus = async (status) => {
    await polysApi.entities.Order.update(order.id, { status });
    onUpdate();
    toast.success('Status atualizado');
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{order.product_title}</TableCell>
      <TableCell>{order.buyer_email}</TableCell>
      <TableCell>{order.quantity}</TableCell>
      <TableCell>{formatCurrency(order.total_amount)}</TableCell>
      <TableCell><StatusBadge status={order.status} size="sm" /></TableCell>
      <TableCell>{format(new Date(order.created_date), 'dd/MM/yy')}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
function BookingRow({ booking, onUpdate }) {
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const updateStatus = async (status) => {
    await polysApi.entities.ServiceBooking.update(booking.id, { status });
    onUpdate();
    toast.success('Status atualizado');
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{booking.service_title}</TableCell>
      <TableCell>{booking.client_email}</TableCell>
      <TableCell>{format(new Date(booking.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</TableCell>
      <TableCell>{formatCurrency(booking.total_amount)}</TableCell>
      <TableCell><StatusBadge status={booking.status} size="sm" /></TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
function ProductFormModal({ open, onClose, product, user, onSuccess }) {
  const { zones } = useSelectedZone();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    quantity_available: '1',
    category: '',
    condition: 'novo',
    images: [],
    zone_id: ''
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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
        zone_id: product.zone_id || user?.residence_zone_id || ''
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
        zone_id: user?.residence_zone_id || ''
      });
    }
  }, [product, open, user?.residence_zone_id]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
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

    if (!formData.zone_id) {
      toast.error('Selecione a área onde o produto está disponível');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        quantity_available: parseInt(formData.quantity_available),
        seller_id: user.id,
        seller_email: user.email,
        seller_name: user.full_name,
        zone_id: formData.zone_id || null,
        lat: user.residence_lat || null,
        lng: user.residence_lng || null,
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
          {/* Zone Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              Área de Disponibilidade *
            </Label>
            <Select 
              value={formData.zone_id} 
              onValueChange={(value) => setFormData({ ...formData, zone_id: value })}
            >
              <SelectTrigger className={!formData.zone_id ? "border-amber-500" : ""}>
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
            <p className="text-xs text-slate-500">
              O produto ficará visível apenas para usuários que filtram por esta área
            </p>
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
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="pl-10"
                  placeholder="0,00"
                />
              </div>
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
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
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
function ServiceFormModal({ open, onClose, service, user, onSuccess }) {
  const { zones } = useSelectedZone();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    price_type: 'servico',
    service_type: '',
    images: [],
    zone_id: ''
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData({
        title: service.title || '',
        description: service.description || '',
        price: service.price?.toString() || '',
        price_type: service.price_type || 'servico',
        service_type: service.service_type || '',
        images: service.images || [],
        zone_id: service.zone_id || user?.residence_zone_id || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        price: '',
        price_type: 'servico',
        service_type: '',
        images: [],
        zone_id: user?.residence_zone_id || ''
      });
    }
  }, [service, open, user?.residence_zone_id]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
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

    if (!formData.zone_id) {
      toast.error('Selecione a área onde o serviço está disponível');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        provider_id: user.id,
        provider_email: user.email,
        provider_name: user.full_name,
        zone_id: formData.zone_id || null,
        lat: user.residence_lat || null,
        lng: user.residence_lng || null,
        active: true
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Zone Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              Área de Atendimento *
            </Label>
            <Select 
              value={formData.zone_id} 
              onValueChange={(value) => setFormData({ ...formData, zone_id: value })}
            >
              <SelectTrigger className={!formData.zone_id ? "border-amber-500" : ""}>
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
            <p className="text-xs text-slate-500">
              O serviço ficará visível apenas para usuários que filtram por esta área
            </p>
          </div>

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nome do serviço"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva seu serviço"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="pl-10"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cobrança</Label>
              <Select value={formData.price_type} onValueChange={(v) => setFormData({ ...formData, price_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hora">Por Hora</SelectItem>
                  <SelectItem value="diaria">Por Dia</SelectItem>
                  <SelectItem value="servico">Por Serviço</SelectItem>
                  <SelectItem value="orcamento">Sob Orçamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Serviço</Label>
            <Select value={formData.service_type} onValueChange={(v) => setFormData({ ...formData, service_type: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {service ? 'Salvar Alterações' : 'Criar Serviço'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
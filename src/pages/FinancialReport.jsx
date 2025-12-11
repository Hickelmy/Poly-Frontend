import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DollarSign, TrendingUp, TrendingDown, Users, Search,
  Download, Filter, ChevronDown, ChevronUp, Wallet,
  PieChart, BarChart3, ArrowUpRight, ArrowDownRight,
  Eye, Loader2, AlertCircle, Calendar, ShoppingBag,
  Wrench, Heart, Package, Briefcase
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FinancialReport() {
  const [user, setUser] = useState(null);
  const [canAccess, setCanAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('total_volume');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Verifica permissões
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const userData = await polysApi.auth.me();
        setUser(userData);
        const role = userData.user_role || 'usuario';
        if (role === 'gestor' || role === 'administrador') {
          setCanAccess(true);
        }
      } catch {
        polysApi.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    checkAccess();
  }, []);

  // Busca todos os pagamentos de projetos
  const { data: projectPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['allProjectPayments'],
    queryFn: () => polysApi.entities.ProjectPayment.list('-created_date', 1000),
    enabled: canAccess,
  });

  // Busca todos os projetos
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['allProjects'],
    queryFn: () => polysApi.entities.Project.list('-created_date', 500),
    enabled: canAccess,
  });

  // Busca todos os pedidos (produtos)
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => polysApi.entities.Order.list('-created_date', 1000),
    enabled: canAccess,
  });

  // Busca todos os agendamentos de serviços
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['allBookings'],
    queryFn: () => polysApi.entities.ServiceBooking.list('-created_date', 1000),
    enabled: canAccess,
  });

  // Calcula estatísticas por usuário
  const userStats = React.useMemo(() => {
    const stats = {};

    // Função auxiliar para inicializar estatísticas de usuário
    const initUserStats = (email) => {
      if (!stats[email]) {
        stats[email] = {
          email,
          // Projetos (doações)
          projects_donated: 0,
          projects_received: 0,
          projects_commission: 0,
          donations_count: 0,
          projects_owned: 0,
          // Produtos
          products_bought: 0,
          products_sold: 0,
          products_commission: 0,
          orders_as_buyer: 0,
          orders_as_seller: 0,
          // Serviços
          services_hired: 0,
          services_provided: 0,
          services_commission: 0,
          bookings_as_client: 0,
          bookings_as_provider: 0,
          // Totais
          total_spent: 0,
          total_received: 0,
          total_commission: 0,
          total_volume: 0,
          net_balance: 0,
          // Detalhes
          project_payments: [],
          product_orders: [],
          service_bookings: [],
          last_activity: null,
        };
      }
      return stats[email];
    };

    // Processa pagamentos de projetos
    projectPayments.forEach((payment) => {
      const email = payment.user_email || 'Anônimo';
      const userStat = initUserStats(email);
      
      const amount = payment.amount || 0;
      const commission = payment.commission_amount || 0;

      userStat.projects_donated += amount;
      userStat.projects_commission += commission;
      userStat.donations_count += 1;
      userStat.total_spent += amount;
      userStat.total_commission += commission;
      userStat.project_payments.push(payment);

      const paymentDate = new Date(payment.created_date || payment.createdAt);
      if (!userStat.last_activity || paymentDate > userStat.last_activity) {
        userStat.last_activity = paymentDate;
      }
    });

    // Processa projetos (donos recebem)
    projects.forEach((project) => {
      const ownerEmail = project.owner_email;
      if (!ownerEmail) return;

      const userStat = initUserStats(ownerEmail);
      userStat.projects_owned += 1;
      userStat.projects_received += (project.current_amount || 0);
      userStat.total_received += (project.current_amount || 0);
    });

    // Processa pedidos de produtos
    orders.forEach((order) => {
      const buyerEmail = order.buyer_email;
      const sellerEmail = order.seller_email;
      const amount = order.total_amount || 0;
      const commission = order.commission_amount || amount * 0.10;
      const orderDate = new Date(order.created_date || order.createdAt);

      // Comprador
      if (buyerEmail) {
        const buyerStat = initUserStats(buyerEmail);
        buyerStat.products_bought += amount;
        buyerStat.orders_as_buyer += 1;
        buyerStat.total_spent += amount;
        buyerStat.product_orders.push({ ...order, role: 'buyer' });

        if (!buyerStat.last_activity || orderDate > buyerStat.last_activity) {
          buyerStat.last_activity = orderDate;
        }
      }

      // Vendedor
      if (sellerEmail) {
        const sellerStat = initUserStats(sellerEmail);
        sellerStat.products_sold += amount;
        sellerStat.products_commission += commission;
        sellerStat.orders_as_seller += 1;
        sellerStat.total_received += (amount - commission);
        sellerStat.total_commission += commission;
        sellerStat.product_orders.push({ ...order, role: 'seller' });

        if (!sellerStat.last_activity || orderDate > sellerStat.last_activity) {
          sellerStat.last_activity = orderDate;
        }
      }
    });

    // Processa agendamentos de serviços
    bookings.forEach((booking) => {
      const clientEmail = booking.client_email;
      const providerEmail = booking.provider_email;
      const amount = booking.total_amount || 0;
      const commission = booking.commission_amount || amount * 0.10;
      const bookingDate = new Date(booking.created_date || booking.createdAt || booking.scheduled_at);

      // Cliente (contratante)
      if (clientEmail) {
        const clientStat = initUserStats(clientEmail);
        clientStat.services_hired += amount;
        clientStat.bookings_as_client += 1;
        clientStat.total_spent += amount;
        clientStat.service_bookings.push({ ...booking, role: 'client' });

        if (!clientStat.last_activity || bookingDate > clientStat.last_activity) {
          clientStat.last_activity = bookingDate;
        }
      }

      // Prestador de serviço
      if (providerEmail) {
        const providerStat = initUserStats(providerEmail);
        providerStat.services_provided += amount;
        providerStat.services_commission += commission;
        providerStat.bookings_as_provider += 1;
        providerStat.total_received += (amount - commission);
        providerStat.total_commission += commission;
        providerStat.service_bookings.push({ ...booking, role: 'provider' });

        if (!providerStat.last_activity || bookingDate > providerStat.last_activity) {
          providerStat.last_activity = bookingDate;
        }
      }
    });

    // Calcula totais finais
    return Object.values(stats).map((stat) => ({
      ...stat,
      total_volume: stat.total_spent + stat.total_received,
      net_balance: stat.total_received - stat.total_spent,
    }));
  }, [projectPayments, projects, orders, bookings]);

  // Filtra usuários
  const filteredUsers = React.useMemo(() => {
    let filtered = [...userStats];

    // Filtro por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((u) =>
        u.email.toLowerCase().includes(query)
      );
    }

    // Filtro por categoria
    if (categoryFilter !== 'all') {
      switch (categoryFilter) {
        case 'projects':
          filtered = filtered.filter((u) => u.donations_count > 0 || u.projects_owned > 0);
          break;
        case 'products':
          filtered = filtered.filter((u) => u.orders_as_buyer > 0 || u.orders_as_seller > 0);
          break;
        case 'services':
          filtered = filtered.filter((u) => u.bookings_as_client > 0 || u.bookings_as_provider > 0);
          break;
      }
    }

    // Filtro por período
    if (periodFilter !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (periodFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        filtered = filtered.filter((u) => 
          u.last_activity && u.last_activity >= startDate
        );
      }
    }

    // Ordenação
    filtered.sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  }, [userStats, searchQuery, periodFilter, categoryFilter, sortField, sortDirection]);

  // Totais gerais
  const totals = React.useMemo(() => {
    // Projetos
    const projectsDonated = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const projectsCommission = projectPayments.reduce((sum, p) => sum + (p.commission_amount || 0), 0);
    
    // Produtos
    const productsSold = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const productsCommission = orders.reduce((sum, o) => sum + (o.commission_amount || (o.total_amount || 0) * 0.10), 0);
    
    // Serviços
    const servicesProvided = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const servicesCommission = bookings.reduce((sum, b) => sum + (b.commission_amount || (b.total_amount || 0) * 0.10), 0);

    const totalVolume = projectsDonated + productsSold + servicesProvided;
    const totalCommission = projectsCommission + productsCommission + servicesCommission;
    
    return {
      projectsDonated,
      projectsCommission,
      productsSold,
      productsCommission,
      servicesProvided,
      servicesCommission,
      totalVolume,
      totalCommission,
      netReceived: totalVolume - totalCommission,
      uniqueUsers: userStats.length,
      totalOrders: orders.length,
      totalBookings: bookings.length,
      totalDonations: projectPayments.length,
    };
  }, [projectPayments, orders, bookings, userStats]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const openUserDetail = (userStat) => {
    setSelectedUser(userStat);
    setDetailModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = [
      'Email',
      'Doações (Projetos)', 'Recebido (Projetos)',
      'Compras (Produtos)', 'Vendas (Produtos)',
      'Contratações (Serviços)', 'Prestações (Serviços)',
      'Total Gasto', 'Total Recebido', 'Comissão Total', 'Balanço'
    ];
    const rows = filteredUsers.map((u) => [
      u.email,
      u.projects_donated.toFixed(2),
      u.projects_received.toFixed(2),
      u.products_bought.toFixed(2),
      u.products_sold.toFixed(2),
      u.services_hired.toFixed(2),
      u.services_provided.toFixed(2),
      u.total_spent.toFixed(2),
      u.total_received.toFixed(2),
      u.total_commission.toFixed(2),
      u.net_balance.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-financeiro-completo-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = paymentsLoading || projectsLoading || ordersLoading || bookingsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Acesso Restrito
        </h1>
        <p className="text-slate-500 max-w-md">
          Esta página é exclusiva para gestores e administradores da plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-teal-600" />
            Relatório Financeiro Completo
          </h1>
          <p className="text-slate-500">
            Custos e lucros de projetos, produtos e serviços por usuário
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Cards de Resumo por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Projetos */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-600" />
              Doações (Projetos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-pink-600">{formatCurrency(totals.projectsDonated)}</p>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Comissão: {formatCurrency(totals.projectsCommission)}</span>
              <span>{totals.totalDonations} doações</span>
            </div>
          </CardContent>
        </Card>

        {/* Produtos */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Vendas (Produtos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.productsSold)}</p>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Comissão: {formatCurrency(totals.productsCommission)}</span>
              <span>{totals.totalOrders} pedidos</span>
            </div>
          </CardContent>
        </Card>

        {/* Serviços */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-600" />
              Prestações (Serviços)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(totals.servicesProvided)}</p>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Comissão: {formatCurrency(totals.servicesCommission)}</span>
              <span>{totals.totalBookings} agendamentos</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Totais Gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm">Volume Total</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(totals.totalVolume)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <p className="text-teal-100 text-xs mt-3">
              Projetos + Produtos + Serviços
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Comissão Total</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(totals.totalCommission)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <p className="text-green-100 text-xs mt-3">
              Receita da plataforma
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Líquido Usuários</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(totals.netReceived)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
            <p className="text-blue-100 text-xs mt-3">
              Após comissões
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Usuários Ativos</p>
                <p className="text-2xl font-bold mt-1">
                  {totals.uniqueUsers}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="text-purple-100 text-xs mt-3">
              Com movimentação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="projects">Projetos</SelectItem>
                <SelectItem value="products">Produtos</SelectItem>
                <SelectItem value="services">Serviços</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total_volume">Volume Total</SelectItem>
                <SelectItem value="total_spent">Total Gasto</SelectItem>
                <SelectItem value="total_received">Total Recebido</SelectItem>
                <SelectItem value="total_commission">Comissão</SelectItem>
                <SelectItem value="net_balance">Balanço</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            Movimentação por Usuário
            <Badge variant="secondary" className="ml-2">
              {filteredUsers.length} usuários
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <PieChart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhuma movimentação encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="text-center">
                      <Heart className="w-4 h-4 inline mr-1 text-pink-500" />
                      Projetos
                    </TableHead>
                    <TableHead className="text-center">
                      <Package className="w-4 h-4 inline mr-1 text-blue-500" />
                      Produtos
                    </TableHead>
                    <TableHead className="text-center">
                      <Briefcase className="w-4 h-4 inline mr-1 text-purple-500" />
                      Serviços
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-teal-600"
                      onClick={() => handleSort('total_spent')}
                    >
                      <div className="flex items-center gap-1">
                        Gasto
                        {sortField === 'total_spent' && (
                          sortDirection === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-teal-600"
                      onClick={() => handleSort('total_received')}
                    >
                      <div className="flex items-center gap-1">
                        Recebido
                        {sortField === 'total_received' && (
                          sortDirection === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-teal-600"
                      onClick={() => handleSort('net_balance')}
                    >
                      <div className="flex items-center gap-1">
                        Balanço
                        {sortField === 'net_balance' && (
                          sortDirection === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userStat) => (
                    <TableRow key={userStat.email} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <TableCell>
                        <div className="font-medium">{userStat.email}</div>
                        {userStat.last_activity && (
                          <div className="text-xs text-slate-500">
                            Última: {format(userStat.last_activity, "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-xs">
                          <span className="text-red-600">↑{formatCurrency(userStat.projects_donated)}</span>
                          <br />
                          <span className="text-green-600">↓{formatCurrency(userStat.projects_received)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-xs">
                          <span className="text-red-600">↑{formatCurrency(userStat.products_bought)}</span>
                          <br />
                          <span className="text-green-600">↓{formatCurrency(userStat.products_sold)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-xs">
                          <span className="text-red-600">↑{formatCurrency(userStat.services_hired)}</span>
                          <br />
                          <span className="text-green-600">↓{formatCurrency(userStat.services_provided)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-red-600">
                          <ArrowUpRight className="w-4 h-4" />
                          {formatCurrency(userStat.total_spent)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-green-600">
                          <ArrowDownRight className="w-4 h-4" />
                          {formatCurrency(userStat.total_received)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-amber-600">
                          {formatCurrency(userStat.total_commission)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={userStat.net_balance >= 0 ? 'default' : 'destructive'}
                          className={userStat.net_balance >= 0 ? 'bg-green-600' : ''}
                        >
                          {formatCurrency(userStat.net_balance)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUserDetail(userStat)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Usuário */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Detalhes Financeiros
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">Resumo</TabsTrigger>
                <TabsTrigger value="projects">Projetos</TabsTrigger>
                <TabsTrigger value="products">Produtos</TabsTrigger>
                <TabsTrigger value="services">Serviços</TabsTrigger>
              </TabsList>

              {/* Resumo */}
              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <p className="text-xs text-red-600 dark:text-red-400">Total Gasto</p>
                    <p className="text-lg font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(selectedUser.total_spent)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <p className="text-xs text-green-600 dark:text-green-400">Total Recebido</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(selectedUser.total_received)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <p className="text-xs text-amber-600 dark:text-amber-400">Comissão Paga</p>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                      {formatCurrency(selectedUser.total_commission)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${selectedUser.net_balance >= 0 ? 'bg-teal-50 dark:bg-teal-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <p className={`text-xs ${selectedUser.net_balance >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'}`}>
                      Balanço
                    </p>
                    <p className={`text-lg font-bold ${selectedUser.net_balance >= 0 ? 'text-teal-700 dark:text-teal-300' : 'text-red-700 dark:text-red-300'}`}>
                      {formatCurrency(selectedUser.net_balance)}
                    </p>
                  </div>
                </div>

                {/* Breakdown por categoria */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">Projetos</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>Doado: <span className="text-red-600">{formatCurrency(selectedUser.projects_donated)}</span></p>
                      <p>Recebido: <span className="text-green-600">{formatCurrency(selectedUser.projects_received)}</span></p>
                      <p className="text-slate-500">{selectedUser.donations_count} doações • {selectedUser.projects_owned} projetos</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Produtos</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>Comprado: <span className="text-red-600">{formatCurrency(selectedUser.products_bought)}</span></p>
                      <p>Vendido: <span className="text-green-600">{formatCurrency(selectedUser.products_sold)}</span></p>
                      <p className="text-slate-500">{selectedUser.orders_as_buyer} compras • {selectedUser.orders_as_seller} vendas</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">Serviços</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>Contratado: <span className="text-red-600">{formatCurrency(selectedUser.services_hired)}</span></p>
                      <p>Prestado: <span className="text-green-600">{formatCurrency(selectedUser.services_provided)}</span></p>
                      <p className="text-slate-500">{selectedUser.bookings_as_client} contratações • {selectedUser.bookings_as_provider} prestações</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Projetos */}
              <TabsContent value="projects" className="space-y-4">
                <h4 className="font-semibold">Doações em Projetos</h4>
                {selectedUser.project_payments.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Nenhuma doação registrada</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedUser.project_payments.map((payment, index) => (
                      <div
                        key={payment.id || index}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                      >
                        <div>
                          <p className="font-medium text-sm">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(payment.created_date || payment.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={payment.status === 'confirmed' ? 'default' : 'secondary'} className={payment.status === 'confirmed' ? 'bg-green-600' : ''}>
                            {payment.status === 'confirmed' ? 'Confirmado' : payment.status}
                          </Badge>
                          <p className="text-xs text-amber-600 mt-1">
                            Comissão: {formatCurrency(payment.commission_amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Produtos */}
              <TabsContent value="products" className="space-y-4">
                <h4 className="font-semibold">Pedidos de Produtos</h4>
                {selectedUser.product_orders.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Nenhum pedido registrado</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedUser.product_orders.map((order, index) => (
                      <div
                        key={order.id || index}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                      >
                        <div>
                          <p className="font-medium text-sm">{formatCurrency(order.total_amount)}</p>
                          <p className="text-xs text-slate-500">
                            {order.role === 'buyer' ? 'Compra' : 'Venda'} • {format(new Date(order.created_date || order.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={order.role === 'seller' ? 'default' : 'outline'} className={order.role === 'seller' ? 'bg-green-600' : ''}>
                            {order.role === 'buyer' ? 'Comprador' : 'Vendedor'}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            {order.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Serviços */}
              <TabsContent value="services" className="space-y-4">
                <h4 className="font-semibold">Agendamentos de Serviços</h4>
                {selectedUser.service_bookings.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Nenhum agendamento registrado</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedUser.service_bookings.map((booking, index) => (
                      <div
                        key={booking.id || index}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                      >
                        <div>
                          <p className="font-medium text-sm">{formatCurrency(booking.total_amount)}</p>
                          <p className="text-xs text-slate-500">
                            {booking.service_title || 'Serviço'} • {booking.role === 'client' ? 'Contratou' : 'Prestou'}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={booking.role === 'provider' ? 'default' : 'outline'} className={booking.role === 'provider' ? 'bg-purple-600' : ''}>
                            {booking.role === 'client' ? 'Cliente' : 'Prestador'}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            {booking.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <Button variant="outline" className="w-full mt-4" onClick={() => setDetailModalOpen(false)}>
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

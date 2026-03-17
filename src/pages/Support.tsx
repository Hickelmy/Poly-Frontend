import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  HelpCircle, Plus, Search, MessageCircle, Clock,
  CheckCircle, XCircle, AlertCircle, FileText, Upload,
  ChevronRight
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import StatusBadge from '../components/shared/StatusBadge';

export default function Support() {
  const [user, setUser] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form state
  const [ticketType, setTicketType] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>('');
  const [sourceId, setSourceId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');

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

  // Fetch user's tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['refundRequests', user?.email],
    queryFn: () => polysApi.entities.RefundRequest.filter(
      { requester_email: user.email },
      '-created_date',
      50
    ),
    enabled: !!user?.email,
  });

  // Fetch orders for reference
  const { data: orders = [] } = useQuery({
    queryKey: ['userOrders', user?.email],
    queryFn: () => polysApi.entities.Order.filter({ buyer_email: user.email }, '-created_date', 20),
    enabled: !!user?.email && sourceType === 'order',
  });

  // Fetch service bookings for reference
  const { data: bookings = [] } = useQuery({
    queryKey: ['userBookings', user?.email],
    queryFn: () => polysApi.entities.ServiceBooking.filter({ client_email: user.email }, '-created_date', 20),
    enabled: !!user?.email && sourceType === 'service',
  });

  // Fetch project payments for reference
  const { data: payments = [] } = useQuery({
    queryKey: ['userPayments', user?.email],
    queryFn: () => polysApi.entities.ProjectPayment.filter({ user_email: user.email }, '-created_date', 20),
    enabled: !!user?.email && sourceType === 'project_payment',
  });

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      if (!sourceType || !reason) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      const ticket = await polysApi.entities.RefundRequest.create({
        source_type: sourceType,
        source_id: sourceId || null,
        requester_id: user.id,
        requester_email: user.email,
        amount: parseFloat(amount) || 0,
        reason: reason,
        status: 'pending'
      });

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['refundRequests']);
      toast.success('Chamado criado com sucesso!');
      resetForm();
      setCreateModalOpen(false);
    },
    onError: (error) => {
      toast.error('Erro ao criar chamado', { description: error.message });
    }
  });

  const resetForm = () => {
    setTicketType('');
    setSourceType('');
    setSourceId('');
    setAmount('');
    setReason('');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processed': return <CheckCircle className="w-4 h-4 text-teal-500" />;
      default: return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.source_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Central de Suporte
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Abra chamados e acompanhe suas solicitações
          </p>
        </div>
        
        <Button 
          className="bg-teal-600 hover:bg-teal-700"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Chamado
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{tickets.length}</p>
              <p className="text-sm text-slate-500">Total de Chamados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{pendingCount}</p>
              <p className="text-sm text-slate-500">Pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar chamados..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Meus Chamados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Nenhum chamado encontrado
              </h3>
              <p className="text-slate-500 mb-4">
                Você ainda não abriu nenhum chamado de suporte
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Abrir Chamado
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="flex items-center gap-4 p-4 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  {getStatusIcon(ticket.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {ticket.source_type === 'order' ? 'Pedido' :
                         ticket.source_type === 'service' ? 'Serviço' : 'Doação'}
                      </Badge>
                      <StatusBadge status={ticket.status} size="sm" />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      {ticket.reason}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(ticket.created_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {ticket.amount > 0 && (
                    <p className="font-semibold text-slate-900 dark:text-white">
                      R$ {ticket.amount.toFixed(2)}
                    </p>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Chamado</DialogTitle>
            <DialogDescription>
              Descreva seu problema para que possamos ajudar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Solicitação</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Problema com Pedido</SelectItem>
                  <SelectItem value="service">Problema com Serviço</SelectItem>
                  <SelectItem value="project_payment">Problema com Doação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sourceType === 'order' && orders.length > 0 && (
              <div className="space-y-2">
                <Label>Pedido Relacionado (opcional)</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pedido" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map(order => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.product_title} - R$ {order.total_amount?.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sourceType === 'service' && bookings.length > 0 && (
              <div className="space-y-2">
                <Label>Serviço Relacionado (opcional)</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookings.map(booking => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.service_title} - R$ {booking.total_amount?.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sourceType === 'project_payment' && payments.length > 0 && (
              <div className="space-y-2">
                <Label>Doação Relacionada (opcional)</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a doação" />
                  </SelectTrigger>
                  <SelectContent>
                    {payments.map(payment => (
                      <SelectItem key={payment.id} value={payment.id}>
                        R$ {payment.amount?.toFixed(2)} - {format(new Date(payment.created_date), 'dd/MM/yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Valor do Reembolso (se aplicável)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição do Problema *</Label>
              <Textarea
                placeholder="Descreva detalhadamente o que aconteceu..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              className="w-full bg-teal-600 hover:bg-teal-700"
              onClick={() => createTicketMutation.mutate()}
              disabled={createTicketMutation.isPending || !sourceType || !reason}
            >
              {createTicketMutation.isPending ? 'Enviando...' : 'Enviar Chamado'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Chamado</DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedTicket.status)}
                <StatusBadge status={selectedTicket.status} />
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-slate-500">Tipo</Label>
                  <p className="font-medium">
                    {selectedTicket.source_type === 'order' ? 'Problema com Pedido' :
                     selectedTicket.source_type === 'service' ? 'Problema com Serviço' : 'Problema com Doação'}
                  </p>
                </div>

                {selectedTicket.amount > 0 && (
                  <div>
                    <Label className="text-slate-500">Valor Solicitado</Label>
                    <p className="font-medium text-lg">R$ {selectedTicket.amount.toFixed(2)}</p>
                  </div>
                )}

                <div>
                  <Label className="text-slate-500">Descrição</Label>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedTicket.reason}
                  </p>
                </div>

                {selectedTicket.support_notes && (
                  <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20">
                    <Label className="text-teal-700 dark:text-teal-400">Resposta do Suporte</Label>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">
                      {selectedTicket.support_notes}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-slate-500">Data de Criação</Label>
                  <p className="text-sm">
                    {format(new Date(selectedTicket.created_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>

                {selectedTicket.processed_at && (
                  <div>
                    <Label className="text-slate-500">Data de Processamento</Label>
                    <p className="text-sm">
                      {format(new Date(selectedTicket.processed_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
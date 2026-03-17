import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Package, ShoppingBag, Wrench, Calendar, FileText,
  Download, ChevronRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StatusBadge from '../components/shared/StatusBadge';
import { jsPDF } from 'jspdf';
import { ListSkeleton, InlineLoading } from '../components/shared/SkeletonLoader';
import { toast } from 'sonner';

export default function MyOrders() {
  const [user, setUser] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<string | null>(null);

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

  // Fetch user's orders
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['myOrders', user?.email],
    queryFn: () => polysApi.entities.Order.filter({ buyer_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Fetch user's service bookings
  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['myBookings', user?.email],
    queryFn: () => polysApi.entities.ServiceBooking.filter({ client_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Fetch user's donations
  const { data: donations = [], isLoading: loadingDonations } = useQuery({
    queryKey: ['myDonations', user?.email],
    queryFn: () => polysApi.entities.ProjectPayment.filter({ user_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const maskCpf = (cpf) => {
    if (!cpf) return 'Não informado';
    const digits = cpf.replace(/\D/g, '');
    if (digits.length < 4) return '***';
    const first = digits.slice(0, 3);
    const last = digits.slice(-1);
    return `${first}.***.***-*${last}`;
  };

  const generatePDF = (item, type) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 22;

    const addLine = (text, opts = {}) => {
      const { bold = false, size = 11 } = opts;
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.text(String(text), 20, y);
      y += 6;
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const dateTimeStr = now.toLocaleString('pt-BR');

    const contratanteCpf = maskCpf(user?.pix_cpf);
    const contratadoCpf = 'Protegido';

    // Header
    doc.setFillColor(15, 118, 110); // teal-700
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    const title =
      type === 'order'
        ? 'NOTA FISCAL - PRODUTO'
        : type === 'booking'
        ? 'RECIBO DE SERVIÇO'
        : 'RECIBO DE DOAÇÃO';
    doc.text(title, pageWidth / 2, 12, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    addLine(`Data de emissão: ${dateStr}`);
    addLine(`ID do documento: ${item.id}`);
    y += 2;

    if (type === 'order') {
      addLine('Dados do produto', { bold: true });
      addLine(`Produto: ${item.product_title}`);
      addLine(`Quantidade: ${item.quantity}`);
      addLine(`Preço unitário: ${formatCurrency(item.unit_price)}`);
      addLine(`Total: ${formatCurrency(item.total_amount)}`);
      addLine(`Entrega: ${item.delivery_option === 'pickup' ? 'Retirada no local' : 'Entrega'}`);
      addLine(`Status do pagamento: ${item.status}`);
      addLine('Impostos e taxas: incluídos no valor final (quando aplicável).', { size: 9 });
      y += 4;

      addLine('Contratante', { bold: true });
      addLine(`Email: ${item.buyer_email}`);
      addLine(`CPF (parcial): ${contratanteCpf}`);
      y += 2;

      addLine('Contratado', { bold: true });
      addLine(`Email: ${item.seller_email}`);
      addLine(`CPF (parcial): ${contratadoCpf}`);
    } else if (type === 'booking') {
      addLine('Dados do serviço', { bold: true });
      addLine(`Serviço: ${item.service_title}`);
      addLine(`Data/Hora: ${format(new Date(item.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}`);
      addLine(`Duração: ${item.duration_hours || 1} hora(s)`);
      addLine(`Valor: ${formatCurrency(item.total_amount)}`);
      addLine(`Status do pagamento: ${item.status}`);
      addLine('Impostos e taxas: incluídos no valor final (quando aplicável).', { size: 9 });
      y += 4;

      addLine('Contratante', { bold: true });
      addLine(`Email: ${item.client_email}`);
      addLine(`CPF (parcial): ${contratanteCpf}`);
      y += 2;

      addLine('Contratado', { bold: true });
      addLine(`Email: ${item.provider_email}`);
      addLine(`CPF (parcial): ${contratadoCpf}`);
    } else if (type === 'donation') {
      addLine('Dados da doação', { bold: true });
      addLine(`Transação: ${item.transaction_id || item.id}`);
      addLine(`Valor: ${formatCurrency(item.amount)}`);
      addLine(`Método de pagamento: ${item.payment_method?.toUpperCase() || 'Não informado'}`);
      addLine(`Status do pagamento: ${item.status}`);
      addLine(`Recorrente: ${item.is_subscription ? 'Sim' : 'Não'}`);
      addLine(`Anônima: ${item.anonymous ? 'Sim' : 'Não'}`);
      y += 4;

      addLine('Doador', { bold: true });
      addLine(`Email: ${item.user_email}`);
      addLine(`CPF (parcial): ${contratanteCpf}`);
    }

    y += 6;
    addLine('Localidade: não informada', { size: 9 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `Gerado em ${dateTimeStr} • POLYS - Melhoria Comunitária`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' },
    );

    doc.save(`recibo-${type}-${item.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Meus Pedidos
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Acompanhe suas compras, serviços e doações
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Compras ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Serviços ({bookings.length})
          </TabsTrigger>
          <TabsTrigger value="donations" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Doações ({donations.length})
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Minhas Compras</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <ListSkeleton items={5} />
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Você ainda não fez nenhuma compra</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center gap-4 p-4 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      onClick={() => {
                        setSelectedItem(order);
                        setDetailType('order');
                      }}
                    >
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Package className="w-8 h-8 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{order.product_title}</p>
                        <p className="text-sm text-slate-500">
                          Qtd: {order.quantity} • {format(new Date(order.created_date), 'dd/MM/yyyy')}
                        </p>
                        <StatusBadge status={order.status} size="sm" />
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-teal-600">{formatCurrency(order.total_amount)}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Meus Serviços Agendados</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <ListSkeleton items={5} />
              ) : bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Você ainda não agendou nenhum serviço</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center gap-4 p-4 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      onClick={() => {
                        setSelectedItem(booking);
                        setDetailType('booking');
                      }}
                    >
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Wrench className="w-8 h-8 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{booking.service_title}</p>
                        <p className="text-sm text-slate-500">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {format(new Date(booking.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <StatusBadge status={booking.status} size="sm" />
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-teal-600">{formatCurrency(booking.total_amount)}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Donations Tab */}
        <TabsContent value="donations">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Minhas Doações</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDonations ? (
                <ListSkeleton items={5} />
              ) : donations.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Você ainda não fez nenhuma doação</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {donations.map((donation) => (
                    <div
                      key={donation.id}
                      className="flex items-center gap-4 p-4 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      onClick={() => {
                        setSelectedItem(donation);
                        setDetailType('donation');
                      }}
                    >
                      <div className="w-16 h-16 rounded-lg bg-teal-100 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">Doação para Projeto</p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(donation.created_date), 'dd/MM/yyyy')} • {donation.payment_method?.toUpperCase()}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={donation.status} size="sm" />
                          {donation.is_subscription && (
                            <Badge variant="outline" className="text-xs">Recorrente</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-teal-600">{formatCurrency(donation.amount)}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {detailType === 'order' ? 'Detalhes da Compra' :
               detailType === 'booking' ? 'Detalhes do Serviço' : 'Detalhes da Doação'}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                {detailType === 'order' && (
                  <>
                    <p className="font-semibold text-lg mb-2">{selectedItem.product_title}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-slate-500">Quantidade:</span> {selectedItem.quantity}</div>
                      <div><span className="text-slate-500">Preço unit.:</span> {formatCurrency(selectedItem.unit_price)}</div>
                      <div><span className="text-slate-500">Total:</span> <strong className="text-teal-600">{formatCurrency(selectedItem.total_amount)}</strong></div>
                      <div><span className="text-slate-500">Entrega:</span> {selectedItem.delivery_option === 'pickup' ? 'Retirada' : 'Entrega'}</div>
                    </div>
                  </>
                )}
                
                {detailType === 'booking' && (
                  <>
                    <p className="font-semibold text-lg mb-2">{selectedItem.service_title}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-slate-500">Data:</span> {format(new Date(selectedItem.scheduled_at), 'dd/MM/yyyy')}</div>
                      <div><span className="text-slate-500">Horário:</span> {format(new Date(selectedItem.scheduled_at), 'HH:mm')}</div>
                      <div><span className="text-slate-500">Duração:</span> {selectedItem.duration_hours || 1}h</div>
                      <div><span className="text-slate-500">Total:</span> <strong className="text-teal-600">{formatCurrency(selectedItem.total_amount)}</strong></div>
                    </div>
                    <p className="mt-2 text-sm"><span className="text-slate-500">Prestador:</span> {selectedItem.provider_email}</p>
                    
                    {/* Código do Serviço */}
                    {selectedItem.status === 'accepted' && selectedItem.service_code && (
                      <div className="mt-4 p-4 rounded-lg bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-300 dark:border-teal-700">
                        <p className="text-sm font-semibold text-teal-900 dark:text-teal-200 mb-2">
                          Código de Confirmação do Serviço:
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 text-center">
                            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400 tracking-wider">
                              {selectedItem.service_code}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedItem.service_code);
                              toast.success('Código copiado!');
                            }}
                          >
                            Copiar
                          </Button>
                        </div>
                        <p className="text-xs text-teal-700 dark:text-teal-300 mt-2">
                          Quando o prestador de serviço chegar, ele vai pedir este código. Forneça o código para que o serviço possa ser iniciado.
                        </p>
                        {selectedItem.code_verified && (
                          <div className="mt-3 p-2 rounded bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
                            <p className="text-xs text-green-700 dark:text-green-300 text-center">
                              ✅ Serviço iniciado em {selectedItem.started_at ? format(new Date(selectedItem.started_at), "dd/MM 'às' HH:mm", { locale: ptBR }) : 'agora'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tempo Trabalhado e Valor Final */}
                    {selectedItem.status === 'completed' && (selectedItem.actual_worked_hours || selectedItem.actual_worked_minutes) && (
                      <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                          Tempo Real Trabalhado:
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {selectedItem.actual_worked_hours || 0} {selectedItem.actual_worked_hours === 1 ? 'hora' : 'horas'}
                          {selectedItem.actual_worked_minutes > 0 && ` e ${selectedItem.actual_worked_minutes} min`}
                        </p>
                      </div>
                    )}

                    {/* Área de Pagamento */}
                    {selectedItem.status === 'completed' && selectedItem.payment_status === 'pending' && (
                      <div className="mt-4 p-4 rounded-lg bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-300 dark:border-teal-700">
                        <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-white">
                          Pagamento do Serviço
                        </h3>
                        <div className="space-y-3">
                          {selectedItem.final_amount ? (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-400">Valor Estimado:</span>
                                <span className="text-sm text-slate-500 line-through">{formatCurrency(selectedItem.total_amount)}</span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-teal-200 dark:border-teal-700">
                                <span className="text-slate-600 dark:text-slate-400">Valor Final:</span>
                                <span className="font-bold text-lg text-teal-700 dark:text-teal-400">{formatCurrency(selectedItem.final_amount)}</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600 dark:text-slate-400">Valor do Serviço:</span>
                              <span className="font-bold text-lg text-teal-700 dark:text-teal-400">{formatCurrency(selectedItem.total_amount)}</span>
                            </div>
                          )}
                          <Button 
                            className="w-full bg-teal-600 hover:bg-teal-700 mt-3"
                            onClick={() => {
                              toast.info('Funcionalidade de pagamento em desenvolvimento');
                            }}
                          >
                            Pagar Agora
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedItem.payment_status === 'paid' && (
                      <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          ✓ Pagamento realizado com sucesso
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {detailType === 'donation' && (
                  <>
                    <p className="font-semibold text-lg mb-2">Doação para Projeto Comunitário</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-slate-500">Valor:</span> <strong className="text-teal-600">{formatCurrency(selectedItem.amount)}</strong></div>
                      <div><span className="text-slate-500">Método:</span> {selectedItem.payment_method?.toUpperCase()}</div>
                      <div><span className="text-slate-500">Data:</span> {format(new Date(selectedItem.created_date), 'dd/MM/yyyy HH:mm')}</div>
                      <div><span className="text-slate-500">Recorrente:</span> {selectedItem.is_subscription ? 'Sim' : 'Não'}</div>
                    </div>
                    {selectedItem.transaction_id && (
                      <p className="mt-2 text-xs text-slate-500">ID: {selectedItem.transaction_id}</p>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={selectedItem.status} />
                <span className="text-sm text-slate-500">
                  Criado em {format(new Date(selectedItem.created_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => generatePDF(selectedItem, detailType)}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Recibo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
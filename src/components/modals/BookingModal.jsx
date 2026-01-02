import React, { useState, useMemo, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Loader2, User, Star, ArrowRight } from 'lucide-react';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const priceTypeLabels = {
  hora: "por hora",
  diaria: "por dia",
  servico: "por serviço",
  orcamento: "sob orçamento"
};

export default function BookingModal({ open, onClose, service, user }) {
  const [date, setDate] = useState(null);
  const [clientPriceType, setClientPriceType] = useState('servico');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [notes, setNotes] = useState('');

  const queryClient = useQueryClient();

  // Buscar bookings existentes para o serviço na data selecionada
  const { data: existingBookings = [] } = useQuery({
    queryKey: ['serviceBookings', service?.id, date],
    queryFn: async () => {
      if (!service?.id || !date) return [];
      const startOfCheckDate = startOfDay(date);
      const endOfCheckDate = new Date(startOfCheckDate);
      endOfCheckDate.setHours(23, 59, 59, 999);
      
      try {
        const allBookings = await polysApi.entities.ServiceBooking.filter({
          service_id: service.id
        });
        
        return allBookings.filter(booking => {
          const bookingDate = new Date(booking.scheduled_at);
          const isSameDate = bookingDate >= startOfCheckDate && bookingDate <= endOfCheckDate;
          const isRelevant = ['requested', 'accepted', 'in_progress'].includes(booking.status);
          return isSameDate && isRelevant;
        });
      } catch (error) {
        console.error('Erro ao buscar bookings:', error);
        return [];
      }
    },
    enabled: !!service?.id && !!date,
  });

  // Verificar se há booking por diária no dia selecionado
  const hasDailyBooking = useMemo(() => {
    if (!existingBookings || !date) return false;
    const startOfCheckDate = startOfDay(date);
    const endOfCheckDate = new Date(startOfCheckDate);
    endOfCheckDate.setHours(23, 59, 59, 999);
    
    return existingBookings.some(booking => {
      const bookingDate = new Date(booking.scheduled_at);
      const isSameDate = bookingDate >= startOfCheckDate && bookingDate <= endOfCheckDate;
      const isDaily = booking.client_price_type === 'diaria';
      const isRelevant = ['requested', 'accepted', 'in_progress'].includes(booking.status);
      return isSameDate && isDaily && isRelevant;
    });
  }, [existingBookings, date]);

  // Verificar se há booking por hora no dia selecionado
  const hasHourlyBooking = useMemo(() => {
    if (!existingBookings || !date) return false;
    const startOfCheckDate = startOfDay(date);
    const endOfCheckDate = new Date(startOfCheckDate);
    endOfCheckDate.setHours(23, 59, 59, 999);
    
    return existingBookings.some(booking => {
      const bookingDate = new Date(booking.scheduled_at);
      const isSameDate = bookingDate >= startOfCheckDate && bookingDate <= endOfCheckDate;
      const isHourly = booking.client_price_type === 'hora';
      const isRelevant = ['requested', 'accepted', 'in_progress'].includes(booking.status);
      return isSameDate && isHourly && isRelevant;
    });
  }, [existingBookings, date]);

  // Obter opções de preço disponíveis
  const availablePriceTypes = useMemo(() => {
    if (!service) return [];
    const types = [];
    if (service.price_per_hour) types.push({ value: 'hora', label: 'Por Hora', price: service.price_per_hour });
    if (service.price_per_day) types.push({ value: 'diaria', label: 'Por Dia', price: service.price_per_day });
    if (service.price_per_service) types.push({ value: 'servico', label: 'Serviço Completo', price: service.price_per_service });
    return types;
  }, [service]);

  // Definir o tipo inicial
  useEffect(() => {
    if (availablePriceTypes.length > 0) {
      if (!availablePriceTypes.find(t => t.value === clientPriceType)) {
        setClientPriceType(availablePriceTypes[0].value);
      }
    } else {
      setClientPriceType('servico');
    }
  }, [availablePriceTypes, service]);

  // Obter horários disponíveis do serviço para a data selecionada
  const availableTimeSlots = useMemo(() => {
    if (!date || !service?.availability_schedule) return [];
    const schedule = service.availability_schedule;
    const dateKey = format(date, 'yyyy-MM-dd');
    
    if (schedule.specificDates && schedule.specificDates[dateKey]) {
      return schedule.specificDates[dateKey];
    }
    return [];
  }, [date, service?.availability_schedule]);

  // Verificar se uma data tem disponibilidade
  const hasAvailability = (checkDate) => {
    if (!service?.availability_schedule) return false;
    const schedule = service.availability_schedule;
    const dateKey = format(checkDate, 'yyyy-MM-dd');
    return schedule.specificDates && schedule.specificDates[dateKey] && 
           schedule.specificDates[dateKey].length > 0;
  };

  // Desabilitar datas
  const isDateDisabled = (checkDate) => {
    const today = startOfDay(new Date());
    const checkDateStart = startOfDay(checkDate);
    if (isBefore(checkDateStart, today)) return true;
    if (hasAvailability && !hasAvailability(checkDate)) return true;
    return false;
  };

  // Gerar slots de horário de 30 em 30 minutos
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  };

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Calcular duração em horas
  const calculateDuration = () => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    if (endMinutes <= startMinutes) return 0;
    return (endMinutes - startMinutes) / 60;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const calculateTotal = () => {
    if (!service) return 0;
    
    if (clientPriceType === 'hora' && service.price_per_hour) {
      return service.price_per_hour * calculateDuration();
    } else if (clientPriceType === 'diaria' && service.price_per_day) {
      return service.price_per_day;
    } else if (clientPriceType === 'servico' && service.price_per_service) {
      return service.price_per_service;
    }
    return 0;
  };

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error('Selecione uma data');
      if (clientPriceType === 'hora' && (!startTime || !endTime || calculateDuration() <= 0)) {
        throw new Error('Selecione um intervalo de horário válido');
      }

      const scheduledAt = new Date(date);
      if (clientPriceType === 'hora') {
        const [hours, minutes] = startTime.split(':');
        scheduledAt.setHours(parseInt(hours), parseInt(minutes));
      } else {
        // Para diária e serviço, usar 08:00 como padrão
        scheduledAt.setHours(8, 0);
      }

      const durationHours = clientPriceType === 'diaria' ? 8 : calculateDuration();
      let totalAmount = calculateTotal();

      const booking = await polysApi.entities.ServiceBooking.create({
        service_id: service.id,
        service_title: service.title,
        client_id: user.id,
        client_email: user.email,
        provider_id: service.provider_id,
        provider_email: service.provider_email,
        scheduled_at: scheduledAt.toISOString(),
        duration_hours: durationHours,
        client_price_type: clientPriceType,
        total_amount: totalAmount,
        commission_amount: totalAmount * 0.10,
        status: 'requested',
        payment_status: 'pending',
        notes: notes
      });

      await polysApi.entities.Notification.create({
        user_id: service.provider_id,
        user_email: service.provider_email,
        type: 'service',
        title: 'Nova solicitação de serviço!',
        message: `${user.full_name || user.email} solicitou o serviço "${service.title}" para ${format(scheduledAt, "dd/MM 'às' HH:mm", { locale: ptBR })}`,
        meta: { booking_id: booking.id, service_id: service.id }
      });

      return booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['serviceBookings']);
      toast.success('Solicitação enviada!', {
        description: 'O profissional receberá seu pedido e entrará em contato.'
      });
      resetForm();
      onClose();
    },
    onError: (error) => {
      toast.error('Erro ao solicitar', {
        description: error.message
      });
    }
  });

  const resetForm = () => {
    setDate(null);
    setClientPriceType('servico');
    setStartTime('08:00');
    setEndTime('12:00');
    setNotes('');
  };

  // Limpar horários quando mudar tipo ou data
  useEffect(() => {
    if (clientPriceType !== 'hora') {
      setStartTime('08:00');
      setEndTime('12:00');
    }
  }, [clientPriceType, date]);

  if (!service) return null;

  const duration = calculateDuration();
  const total = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl">Agendar Serviço</DialogTitle>
          <DialogDescription>
            Preencha os dados para solicitar o serviço
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações do Serviço */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-800">
            <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">{service.title}</h3>
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{service.provider_name}</span>
              </div>
            </div>
          </div>

          {/* Calendário */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Selecione a Data *</Label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={isDateDisabled}
                locale={ptBR}
                className="rounded-lg border"
              />
            </div>
            {!date && (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Selecione uma data no calendário acima
              </p>
            )}
          </div>

          {/* Tipo de Cobrança */}
          {date && availablePriceTypes.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tipo de Cobrança *</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {availablePriceTypes.map((option) => {
                  const isBlocked = 
                    (option.value === 'diaria' && hasHourlyBooking) ||
                    (option.value === 'hora' && hasDailyBooking);
                  const isSelected = clientPriceType === option.value;
                  
                  return (
                    <button
                      key={option.value}
                      onClick={() => !isBlocked && setClientPriceType(option.value)}
                      disabled={isBlocked}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left",
                        isSelected 
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30" 
                          : "border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700",
                        isBlocked && "opacity-50 cursor-not-allowed bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                      )}
                    >
                      <div className="font-semibold text-slate-900 dark:text-white mb-1">
                        {option.label}
                      </div>
                      <div className="text-lg font-bold text-teal-600 dark:text-teal-400">
                        {formatCurrency(option.price)}
                        {option.value === 'hora' && '/hora'}
                        {option.value === 'diaria' && '/dia'}
                      </div>
                      {isBlocked && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                          Não disponível
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {hasDailyBooking && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    ⚠️ Este dia já possui um agendamento por diária. Apenas serviços completos podem ser agendados.
                  </p>
                </div>
              )}
              {hasHourlyBooking && !hasDailyBooking && (
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    ⚠️ Este dia já possui agendamentos por hora. Não é possível agendar por diária.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Seletor de Horário (apenas para "Por Hora") */}
          {date && clientPriceType === 'hora' && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Selecione o Intervalo de Horário *</Label>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Início</Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger>
                        <Clock className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {timeSlots.map(slot => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Fim</Label>
                    <Select value={endTime} onValueChange={setEndTime}>
                      <SelectTrigger>
                        <Clock className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {timeSlots
                          .filter(slot => {
                            const [slotH, slotM] = slot.split(':').map(Number);
                            const [startH, startM] = startTime.split(':').map(Number);
                            const slotMinutes = slotH * 60 + slotM;
                            const startMinutes = startH * 60 + startM;
                            return slotMinutes > startMinutes;
                          })
                          .map(slot => (
                            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {duration > 0 && (
                  <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Duração: <strong className="text-slate-900 dark:text-white">{duration.toFixed(1)} horas</strong>
                      </span>
                      <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                        {formatCurrency(service.price_per_hour * duration)}
                      </span>
                    </div>
                  </div>
                )}
                {duration <= 0 && (
                  <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      O horário de fim deve ser maior que o horário de início
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info para Diária */}
          {date && clientPriceType === 'diaria' && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    1 Dia Completo (8 horas)
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    O serviço será realizado durante o dia inteiro selecionado
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info para Serviço Completo */}
          {date && clientPriceType === 'servico' && (
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">
                    Serviço Completo
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                    O prestador definirá o horário após aprovar sua solicitação
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione informações adicionais sobre o serviço..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Resumo */}
          {date && total > 0 && (
            <div className="p-6 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/20 border-2 border-teal-200 dark:border-teal-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Resumo do Agendamento</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Data:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {format(date, "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                {clientPriceType === 'hora' && duration > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Horário:</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {startTime} - {endTime}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Duração:</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {duration.toFixed(1)} horas
                      </span>
                    </div>
                  </>
                )}
                {clientPriceType === 'diaria' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Duração:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      1 dia (8 horas)
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t-2 border-teal-200 dark:border-teal-700">
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">Total:</span>
                  <span className="text-2xl font-bold text-teal-700 dark:text-teal-400">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Botão de Submit */}
          <div className="pt-4">
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 h-12 text-base font-semibold"
              onClick={() => bookingMutation.mutate()}
              disabled={
                bookingMutation.isPending ||
                !date ||
                availablePriceTypes.length === 0 ||
                (clientPriceType === 'diaria' && hasHourlyBooking) ||
                (clientPriceType === 'hora' && hasDailyBooking) ||
                (clientPriceType === 'hora' && (!startTime || !endTime || duration <= 0))
              }
            >
              {bookingMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Solicitar Agendamento'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

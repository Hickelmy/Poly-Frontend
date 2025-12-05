import React, { useState } from 'react';
import { polysApi } from '@/api/polysClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Calendar as CalendarIcon, Clock, Loader2, User, Star } from 'lucide-react';
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
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('1');
  const [notes, setNotes] = useState('');

  const queryClient = useQueryClient();

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error('Selecione uma data');
      if (!time) throw new Error('Selecione um horário');

      const scheduledAt = new Date(date);
      const [hours, minutes] = time.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes));

      const durationHours = parseFloat(duration);
      let totalAmount = service.price || 0;
      
      if (service.price_type === 'hora') {
        totalAmount = service.price * durationHours;
      } else if (service.price_type === 'diaria') {
        totalAmount = service.price * Math.ceil(durationHours / 8);
      }

      const commission = totalAmount * 0.10;

      const booking = await polysApi.entities.ServiceBooking.create({
        service_id: service.id,
        service_title: service.title,
        client_id: user.id,
        client_email: user.email,
        provider_id: service.provider_id,
        provider_email: service.provider_email,
        scheduled_at: scheduledAt.toISOString(),
        duration_hours: durationHours,
        total_amount: totalAmount,
        commission_amount: commission,
        status: 'requested',
        payment_status: 'pending',
        notes: notes
      });

      // Create notification for provider
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
    setTime('');
    setDuration('1');
    setNotes('');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const calculateTotal = () => {
    if (!service) return 0;
    const durationHours = parseFloat(duration) || 1;
    
    if (service.price_type === 'hora') {
      return service.price * durationHours;
    } else if (service.price_type === 'diaria') {
      return service.price * Math.ceil(durationHours / 8);
    }
    return service.price || 0;
  };

  const timeSlots = [];
  for (let h = 7; h <= 20; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
  }

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-teal-600" />
            Agendar Serviço
          </DialogTitle>
          <DialogDescription>
            {service.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Service Info */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
            <img 
              src={service.images?.[0] || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=100&h=100&fit=crop"}
              alt={service.title}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{service.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500">{service.provider_name}</span>
              </div>
              {service.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium">{service.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Data do Serviço</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label>Horário</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <Clock className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Selecione um horário" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map(slot => (
                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration (for hourly services) */}
          {['hora', 'diaria'].includes(service.price_type) && (
            <div className="space-y-2">
              <Label>Duração ({service.price_type === 'hora' ? 'horas' : 'dias'})</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(d => (
                    <SelectItem key={d} value={d.toString()}>
                      {d} {service.price_type === 'hora' ? (d === 1 ? 'hora' : 'horas') : (d === 1 ? 'dia' : 'dias')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              placeholder="Descreva detalhes adicionais sobre o serviço..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Price Summary */}
          <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {service.price_type === 'orcamento' ? 'Preço:' : `Preço ${priceTypeLabels[service.price_type]}:`}
              </span>
              <span className="font-medium">
                {service.price_type === 'orcamento' ? 'A combinar' : formatCurrency(service.price)}
              </span>
            </div>
            {service.price_type !== 'orcamento' && (
              <div className="flex justify-between items-center pt-2 border-t border-teal-200 dark:border-teal-700">
                <span className="font-medium text-slate-700 dark:text-slate-300">Total estimado:</span>
                <span className="text-xl font-bold text-teal-700 dark:text-teal-400">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            className="w-full bg-teal-600 hover:bg-teal-700 h-12"
            onClick={() => bookingMutation.mutate()}
            disabled={bookingMutation.isPending || !date || !time}
          >
            {bookingMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando solicitação...
              </>
            ) : (
              <>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Solicitar Agendamento
              </>
            )}
          </Button>

          <p className="text-xs text-center text-slate-500">
            O profissional receberá sua solicitação e confirmará a disponibilidade.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
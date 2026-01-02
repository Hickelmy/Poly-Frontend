import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function AvailabilityPicker({ value, onChange }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [error, setError] = useState('');
  const [schedules, setSchedules] = useState({});

  useEffect(() => {
    if (value && typeof value === 'object') {
      const dateSchedules = {};
      
      // Verifica se é formato novo (híbrido) ou antigo (apenas semanal)
      if (value.specificDates) {
        // Formato novo: tem specificDates
        Object.entries(value.specificDates).forEach(([dateKey, timeSlots]) => {
          dateSchedules[dateKey] = timeSlots.map(slot => {
            const [start, end] = slot.split('-');
            return { start, end };
          });
        });
      } else {
        // Formato antigo: apenas padrão semanal - NÃO converte automaticamente
        // Mantém vazio para não aplicar para todas as semanas
        // O usuário precisa configurar datas específicas manualmente
      }
      
      setSchedules(dateSchedules);
    }
  }, [value]);

  const getDateKey = (date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const hasConflict = (date, start, end) => {
    const dateKey = getDateKey(date);
    const daySchedules = schedules[dateKey] || [];
    const newStart = timeToMinutes(start);
    const newEnd = timeToMinutes(end);

    for (const schedule of daySchedules) {
      const existingStart = timeToMinutes(schedule.start);
      const existingEnd = timeToMinutes(schedule.end);

      if (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      ) {
        return true;
      }
    }
    return false;
  };

  const addTimeSlot = () => {
    if (!selectedDate) {
      setError('Por favor, selecione um dia no calendário primeiro.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!startTime || !endTime) {
      setError('Por favor, preencha os horários de início e fim.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      setError('O horário final deve ser maior que o horário inicial.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (hasConflict(selectedDate, startTime, endTime)) {
      setError('Este horário conflita com um período já cadastrado.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const dateKey = getDateKey(selectedDate);
    setSchedules((prev) => {
      const newSchedules = {
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), { start: startTime, end: endTime }]
      };
      
      // Converte para o formato do backend e chama onChange
      convertToBackendFormat(newSchedules);
      
      return newSchedules;
    });

    setStartTime('08:00');
    setEndTime('17:00');
    setError('');
  };

  const deleteSchedule = (date, index) => {
    const dateKey = getDateKey(date);
    setSchedules((prev) => {
      const daySchedules = [...(prev[dateKey] || [])];
      daySchedules.splice(index, 1);
      
      const newSchedules = { ...prev };
      if (daySchedules.length === 0) {
        delete newSchedules[dateKey];
      } else {
        newSchedules[dateKey] = daySchedules;
      }
      
      convertToBackendFormat(newSchedules);
      
      return newSchedules;
    });
  };

  const convertToBackendFormat = (dateSchedules) => {
    // Novo formato híbrido: suporta datas específicas E padrões semanais
    // Formato: { 
    //   specificDates: { "2025-12-17": ["10:00-13:00"] }, 
    //   weeklyPattern: { monday: { available: true, timeSlots: [...] } }
    // }
    
    const specificDates = {};
    const weeklyPattern = {
      monday: { available: false, timeSlots: [] },
      tuesday: { available: false, timeSlots: [] },
      wednesday: { available: false, timeSlots: [] },
      thursday: { available: false, timeSlots: [] },
      friday: { available: false, timeSlots: [] },
      saturday: { available: false, timeSlots: [] },
      sunday: { available: false, timeSlots: [] },
    };

    // Mantém as datas específicas como estão (não converte para padrão semanal)
    Object.entries(dateSchedules).forEach(([dateKey, timeSlots]) => {
      specificDates[dateKey] = timeSlots.map(({ start, end }) => `${start}-${end}`);
    });

    // Envia formato híbrido: datas específicas + padrão semanal (vazio por padrão)
    const hybridFormat = {
      specificDates,
      weeklyPattern
    };
    
    onChange?.(hybridFormat);
  };

  const handleDateClick = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date >= today) {
      setSelectedDate(date);
      setError('');
    }
  };

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = subMonths(prev, 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstDayOfNewMonth = startOfMonth(newDate);
      
      if (firstDayOfNewMonth < today) {
        return startOfMonth(today);
      }
      return newDate;
    });
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return days.map((day, index) => {
      const isCurrentMonth = isSameMonth(day, currentMonth);
      const isPast = day < today;
      const dateKey = getDateKey(day);
      const hasSchedule = schedules[dateKey] && schedules[dateKey].length > 0;
      const isSelected = selectedDate && isSameDay(day, selectedDate);

      return (
        <div
          key={index}
          className={cn(
            'aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all cursor-pointer relative',
            !isCurrentMonth && 'text-slate-300 dark:text-slate-600',
            isCurrentMonth && !isPast && 'hover:bg-teal-50 dark:hover:bg-teal-950/20 hover:scale-110',
            isPast && 'text-slate-300 dark:text-slate-500 cursor-not-allowed',
            isSelected && 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg scale-110',
            !isSelected && isCurrentMonth && !isPast && 'text-slate-700 dark:text-slate-300'
          )}
          onClick={() => !isPast && isCurrentMonth && handleDateClick(day)}
        >
          {format(day, 'd')}
          {hasSchedule && (
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </div>
      );
    });
  };

  const getSelectedDateSchedules = () => {
    if (!selectedDate) return [];
    const dateKey = getDateKey(selectedDate);
    return (schedules[dateKey] || []).sort((a, b) => a.start.localeCompare(b.start));
  };

  const selectedSchedules = getSelectedDateSchedules();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            Disponibilidade de Atendimento
          </Label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Selecione os dias e configure os horários disponíveis
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {Object.keys(schedules).length} {Object.keys(schedules).length === 1 ? 'dia' : 'dias'} configurado{Object.keys(schedules).length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calendário */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Header do Calendário */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-teal-600 dark:text-teal-400">
                  {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={prevMonth}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={nextMonth}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Grid do Calendário */}
              <div className="grid grid-cols-7 gap-2">
                {/* Headers dos dias */}
                {DAYS_OF_WEEK.map((day) => (
                  <div
                    key={day}
                    className="text-center font-semibold text-teal-600 dark:text-teal-400 py-2 text-sm"
                  >
                    {day}
                  </div>
                ))}
                {/* Dias do mês */}
                {renderCalendar()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Agendamento */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4 h-full flex flex-col">
              {/* Header */}
              <div>
                <h3 className="text-lg font-semibold text-teal-600 dark:text-teal-400 mb-2">
                  Agendamento de Horários
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedDate
                    ? format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : 'Selecione um dia no calendário'}
                </p>
              </div>

              {/* Adicionar Horário */}
              {selectedDate && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4">
                  <h4 className="font-medium text-slate-900 dark:text-white">Adicionar novo horário</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Hora Inicial</Label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Hora Final</Label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={addTimeSlot}
                    className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Horário
                  </Button>
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* Lista de Horários */}
              <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] space-y-2">
                {!selectedDate ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      Selecione um dia no calendário para configurar horários
                    </p>
                  </div>
                ) : selectedSchedules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Clock className="w-12 h-12 text-slate-300 dark:text-slate-500 mb-3 stroke-current" strokeWidth={1.5} />
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      Nenhum horário agendado para este dia
                    </p>
                  </div>
                ) : (
                  selectedSchedules.map((schedule, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-teal-500 dark:hover:border-teal-600 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 stroke-current" strokeWidth={2} />
                        <span className="font-semibold text-teal-600 dark:text-teal-400">
                          {schedule.start} - {schedule.end}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteSchedule(selectedDate, index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

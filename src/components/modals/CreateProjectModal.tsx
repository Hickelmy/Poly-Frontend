import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plus, Minus, Trash2, Upload, Loader2, X } from 'lucide-react';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import LocationPicker from "@/components/LocationPicker";
import CurrencyInput from '../shared/CurrencyInput';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  user?: any;
}

interface ExpenseDraft {
  type: string;
  description: string;
  cost: string | number;
  quantity: string;
}

interface Expense {
  id: string;
  type: string;
  description: string;
  cost: string | number;
  quantity: string | number;
}

interface LocationState {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

const CATEGORY_OPTIONS = [
  { value: 'seguranca', label: 'Segurança' },
  { value: 'infraestrutura', label: 'Infraestrutura' },
  { value: 'cultura', label: 'Cultura' },
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'lazer', label: 'Lazer' },
  { value: 'outro', label: 'Outro' },
];

const STATUS_OPTIONS = [
  { value: 'proposed', label: 'Proposto (rascunho interno)' },
  { value: 'voting', label: 'Em votação' },
  { value: 'funding', label: 'Arrecadando' },
];

const EXPENSE_TYPE_OPTIONS = [
  { value: 'produto', label: 'Produto' },
  { value: 'profissional', label: 'Contratação de profissional' },
  { value: 'empresa', label: 'Contratação de empresa' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'equipamentos', label: 'Equipamentos' },
  { value: 'outros', label: 'Outros' },
];

function calculateMinVotes(amount: number | string): number {
  if (!amount || amount <= 0) return 10;

  const value = typeof amount === 'number' ? amount : parseFloat(amount as string);

  if (value <= 2000) {
    return 10;
  } else if (value <= 10000) {
    return Math.ceil(10 + (value - 2000) / 500);
  } else if (value <= 50000) {
    return Math.ceil(26 + (value - 10000) / 1000);
  } else {
    return Math.ceil(66 + (value - 50000) / 2000);
  }
}

export default function CreateProjectModal({ open, onClose, user }: CreateProjectModalProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<boolean>(false);

  const isAdminOrGestor = user?.user_role === 'administrador' || user?.user_role === 'gestor';
  const [fundingDate, setFundingDate] = useState<Date | null>(null);
  const [evidences, setEvidences] = useState<string[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState<boolean>(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>({
    type: '',
    description: '',
    cost: '',
    quantity: '1',
  });
  const [formData, setFormData] = useState({
    title: '',
    short_description: '',
    description: '',
    category: '',
    target_amount: '',
    funding_deadline: '',
    status: 'proposed',
  });
  const [location, setLocation] = useState<LocationState>({
    address: '',
    latitude: null,
    longitude: null,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => polysApi.entities.Zone.filter({ active: true }),
  });

  const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  const findZoneIdForLocation = (lat: number | null, lng: number | null): string | null => {
    if (!lat || !lng || zones.length === 0) return null;
    for (const zone of zones as any[]) {
      if (zone.polygon_geojson?.coordinates) {
        const polygon = zone.polygon_geojson.coordinates[0];
        if (isPointInPolygon([lng, lat], polygon)) {
          return zone.id;
        }
      }
    }
    return null;
  };

  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        short_description: '',
        description: '',
        category: '',
        target_amount: '',
        funding_deadline: '',
        status: 'proposed',
      });
      setLocation({
        address: '',
        latitude: null,
        longitude: null,
      });
      setEvidences([]);
      setExpenses([]);
      setExpenseDraft({
        type: '',
        description: '',
        cost: '',
        quantity: '1',
      });
      setFundingDate(null);
    }
  }, [open]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleExpenseChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (field === 'cost') {
      value = value.replace(/[^0-9.,]/g, '');
    }
    setExpenseDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExpenseCostChange = (value: string | number) => {
    setExpenseDraft((prev) => ({ ...prev, cost: value }));
  };

  const handleEditExpense = (id: string, field: string, value: any) => {
    setExpenses((prev) =>
      prev.map((exp) => {
        if (exp.id !== id) return exp;

        if (field === 'quantity') {
          let qty = String(value).replace(/\D/g, '');
          if (qty === '' || qty === '0') qty = '1';
          return { ...exp, quantity: qty };
        }

        if (field === 'cost') {
          return { ...exp, cost: typeof value === 'number' ? value : String(value).replace(/[^0-9.,]/g, '') };
        }

        return { ...exp, [field]: value };
      }),
    );
  };

  const handleEditExpenseCost = (id: string, value: string | number) => {
    setExpenses((prev) =>
      prev.map((exp) => {
        if (exp.id !== id) return exp;
        return { ...exp, cost: value };
      })
    );
  };

  const handleQuantityChange = (raw: string | number) => {
    let value = String(raw).replace(/\D/g, '');
    if (value === '') value = '1';
    setExpenseDraft((prev) => ({
      ...prev,
      quantity: value,
    }));
  };

  const incrementQuantity = () => {
    const current = Number(expenseDraft.quantity || '1');
    const next = Number.isNaN(current) ? 1 : current + 1;
    setExpenseDraft((prev) => ({
      ...prev,
      quantity: String(next),
    }));
  };

  const decrementQuantity = () => {
    const current = Number(expenseDraft.quantity || '1');
    let next = Number.isNaN(current) ? 1 : current - 1;
    if (next < 1) next = 1;
    setExpenseDraft((prev) => ({
      ...prev,
      quantity: String(next),
    }));
  };

  const handleAddExpense = () => {
    if (!expenseDraft.type || !expenseDraft.description || !expenseDraft.cost) {
      toast.error('Preencha tipo, descrição e custo da despesa.');
      return;
    }

    const costNumber = typeof expenseDraft.cost === 'number'
      ? expenseDraft.cost
      : Number(
          String(expenseDraft.cost)
            .replace(/\./g, '')
            .replace(',', '.')
        );

    if (Number.isNaN(costNumber) || costNumber <= 0) {
      toast.error('Informe um custo válido.');
      return;
    }

    const quantityNumber = Number(expenseDraft.quantity || '1');
    if (Number.isNaN(quantityNumber) || quantityNumber <= 0) {
      toast.error('Informe uma quantidade válida.');
      return;
    }

    setExpenses((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: expenseDraft.type,
        description: expenseDraft.description,
        cost: expenseDraft.cost,
        quantity: expenseDraft.quantity,
      },
    ]);

    setExpenseDraft({
      type: '',
      description: '',
      cost: '',
      quantity: '1',
    });
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const parseExpenseCost = (exp: Expense): number => {
    const raw = exp.cost ?? '';
    if (typeof raw === 'number') return raw;
    const num = Number(
      String(raw)
        .replace(/\./g, '')
        .replace(',', '.'),
    );
    return Number.isNaN(num) || num < 0 ? 0 : num;
  };

  const parseExpenseQuantity = (exp: Expense): number => {
    const raw = exp.quantity ?? '1';
    if (typeof raw === 'number') {
      return raw <= 0 ? 1 : raw;
    }
    const num = Number(String(raw).replace(/\D/g, '')) || 1;
    return num <= 0 ? 1 : num;
  };

  const totalExpenses = expenses.reduce((sum, e) => {
    const cost = parseExpenseCost(e);
    const qty = parseExpenseQuantity(e);
    return sum + cost * qty;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Faça login para criar projetos.');
      return;
    }

    const isAdminOrGestor = user.user_role === 'administrador' || user.user_role === 'gestor';

    if (!formData.title?.trim()) {
      toast.error('Título obrigatório', {
        description: 'Preencha o título do projeto.',
      });
      return;
    }

    if (!formData.category) {
      toast.error('Categoria obrigatória', {
        description: 'Selecione uma categoria para o projeto.',
      });
      return;
    }

    if (!location.address || !location.latitude || !location.longitude) {
      toast.error('Localização obrigatória', {
        description: 'Selecione a localização do problema no mapa.',
      });
      return;
    }

    if (!expenses || expenses.length === 0) {
      toast.error('Despesas obrigatórias', {
        description: 'Adicione pelo menos uma despesa ao projeto.',
      });
      return;
    }

    const normalizedExpenses = expenses.map((e) => ({
      ...e,
      cost: parseExpenseCost(e),
      quantity: parseExpenseQuantity(e),
    }));

    const expensesTotal = normalizedExpenses.reduce(
      (sum, e) => sum + (e.cost as number) * (e.quantity as number),
      0,
    );

    if (expensesTotal <= 0) {
      toast.error('Valor inválido', {
        description: 'O valor total das despesas deve ser maior que zero.',
      });
      return;
    }

    const minVotesNumber = calculateMinVotes(expensesTotal);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (fundingDate && fundingDate < today) {
      toast.error('Data inválida', {
        description: 'Prazo de arrecadação não pode ser anterior a hoje.',
      });
      return;
    }

    setSaving(true);
    try {
      const zoneId = findZoneIdForLocation(location.latitude, location.longitude);

      const projectStatus = isAdminOrGestor
        ? (formData.status || 'proposed')
        : 'proposed';

      const payload = {
        title: formData.title,
        short_description: formData.short_description || formData.description?.slice(0, 140),
        description: formData.description,
        category: formData.category,
        target_amount: expensesTotal,
        current_amount: 0,
        min_votes: minVotesNumber,
        votes_count: 0,
        funding_deadline: fundingDate ? fundingDate.toISOString() : null,
        status: projectStatus,
        owner_id: user.id,
        owner_email: user.email,
        location_address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        lat: location.latitude,
        lng: location.longitude,
        zone_id: zoneId,
        evidences,
        expenses: normalizedExpenses,
        expenses_total: expensesTotal,
      };

      await polysApi.entities.Project.create(payload);

      toast.success('Projeto criado com sucesso!', {
        description: `"${formData.title}" foi criado e precisa de ${minVotesNumber} votos para iniciar a arrecadação.`,
        duration: 5000,
      });

      queryClient.invalidateQueries(['projects']);
      onClose();
    } catch (err: any) {
      console.error('Erro ao criar projeto:', err);

      let errorMessage = 'Erro ao criar projeto. Tente novamente.';

      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      toast.error('Erro ao criar projeto', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const minVotes = calculateMinVotes(totalExpenses);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">

        <div className="px-6 pt-5 pb-4 border-b bg-white dark:bg-slate-900 shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Novo Projeto Comunitário
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Proponha uma melhoria para sua comunidade. A meta é calculada automaticamente pelas despesas.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700">

              <div className="p-5 space-y-4">

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={handleChange('title')}
                    placeholder="Ex: Iluminação da Praça Central"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Resumo curto</Label>
                  <Input
                    value={formData.short_description}
                    onChange={handleChange('short_description')}
                    placeholder="Frase rápida explicando o objetivo"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Descrição detalhada</Label>
                  <Textarea
                    value={formData.description}
                    onChange={handleChange('description')}
                    rows={2}
                    placeholder="Descreva o problema, a proposta de solução e o impacto esperado..."
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Localização do problema *</Label>
                  <LocationPicker value={location} onChange={setLocation} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Categoria *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isAdminOrGestor ? (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Status inicial</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Prazo de arrecadação</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn('w-full h-9 justify-start text-left font-normal', !fundingDate && 'text-muted-foreground')}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {fundingDate ? fundingDate.toLocaleDateString('pt-BR') : 'Escolha uma data'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={fundingDate ?? undefined}
                            onSelect={(d) => setFundingDate(d ?? null)}
                            disabled={(d) => {
                              const t = new Date(); t.setHours(0,0,0,0);
                              const x = new Date(d); x.setHours(0,0,0,0);
                              return x < t;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>

                {isAdminOrGestor && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Prazo de arrecadação</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn('w-full h-9 justify-start text-left font-normal', !fundingDate && 'text-muted-foreground')}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fundingDate ? fundingDate.toLocaleDateString('pt-BR') : 'Escolha uma data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={fundingDate ?? undefined}
                          onSelect={(d) => setFundingDate(d ?? null)}
                          disabled={(d) => {
                            const t = new Date(); t.setHours(0,0,0,0);
                            const x = new Date(d); x.setHours(0,0,0,0);
                            return x < t;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {!isAdminOrGestor && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                    <span className="text-base shrink-0">⚠️</span>
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-snug">
                      Seu projeto será criado como <strong>Proposto</strong> e precisará de votos da comunidade antes de iniciar a arrecadação.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-4">

                <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">Evidências do problema</Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Fotos ou prints que comprovem a necessidade
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      {uploadingEvidence ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{uploadingEvidence ? 'Enviando...' : 'Adicionar foto'}</span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.gif"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                          if (!allowed.includes(file.type)) {
                            toast.error('Formato não suportado. Use JPG, PNG, WEBP ou GIF.');
                            e.target.value = '';
                            return;
                          }
                          setUploadingEvidence(true);
                          try {
                            const { file_url } = await polysApi.integrations.Core.UploadFile({ file });
                            setEvidences((prev) => [...prev, file_url]);
                          } catch (err) {
                            console.error(err);
                            toast.error('Erro ao enviar imagem');
                          }
                          setUploadingEvidence(false);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  {evidences.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {evidences.map((img, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 aspect-video">
                          <img src={img} alt={`Evidência ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setEvidences((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg h-20 flex items-center justify-center">
                      <p className="text-xs text-slate-400">Nenhuma evidência adicionada</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                  <div>
                    <Label className="text-sm font-semibold">Despesas previstas *</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      A meta de arrecadação é calculada pela soma das despesas
                    </p>
                  </div>

                  <div className="space-y-2 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={expenseDraft.type}
                          onValueChange={(v) => setExpenseDraft((p) => ({ ...p, type: v }))}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {EXPENSE_TYPE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descrição</Label>
                        <Input
                          value={expenseDraft.description}
                          onChange={handleExpenseChange('description')}
                          placeholder='Ex: "Lixeira de metal"'
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Custo (R$)</Label>
                        <CurrencyInput
                          value={expenseDraft.cost}
                          onChange={handleExpenseCostChange}
                          placeholder="0,00"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qtd.</Label>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={decrementQuantity}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            className="h-8 text-center text-xs"
                            inputMode="numeric"
                            value={expenseDraft.quantity}
                            onChange={(e) => handleQuantityChange(e.target.value)}
                          />
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={incrementQuantity}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Button type="button" className="h-8 text-xs bg-teal-600 hover:bg-teal-700" onClick={handleAddExpense}>
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  {expenses.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-0.5">
                        <span>{expenses.length} {expenses.length === 1 ? 'item' : 'itens'}</span>
                        <span className="text-teal-600 dark:text-teal-400">{fmtBRL(totalExpenses)}</span>
                      </div>
                      <div className="border border-slate-200 dark:border-slate-600 rounded-lg max-h-44 overflow-y-auto bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                        {expenses.map((exp) => (
                          <div key={exp.id} className="px-3 py-2">
                            <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-1.5 items-center">
                              <Select
                                value={exp.type}
                                onValueChange={(v) => handleEditExpense(exp.id, 'type', v)}
                              >
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {EXPENSE_TYPE_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                value={exp.description}
                                onChange={(e) => handleEditExpense(exp.id, 'description', e.target.value)}
                                className="h-7 text-xs"
                              />
                              <CurrencyInput
                                value={exp.cost}
                                onChange={(v: string | number) => handleEditExpenseCost(exp.id, v)}
                                className="h-7 text-xs w-20"
                              />
                              <Input
                                value={exp.quantity}
                                inputMode="numeric"
                                onChange={(e) => handleEditExpense(exp.id, 'quantity', e.target.value)}
                                className="h-7 text-xs w-12 text-center"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => handleRemoveExpense(exp.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {totalExpenses > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 text-center">
                      <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mb-0.5">Meta de arrecadação</p>
                      <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{fmtBRL(totalExpenses)}</p>
                      <p className="text-[10px] text-teal-500 dark:text-teal-500">soma das despesas</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">Votos mínimos</p>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">📊 {minVotes}</p>
                      <p className="text-[10px] text-slate-400">calculado pelo valor</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50 shrink-0 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400 hidden sm:block">
              * campos obrigatórios
            </p>
            <div className="flex items-center gap-3 ml-auto">
              <Button type="button" variant="outline" onClick={onClose} className="h-9">
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-9 bg-teal-600 hover:bg-teal-700 px-6"
                disabled={saving}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                ) : (
                  'Criar Projeto'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

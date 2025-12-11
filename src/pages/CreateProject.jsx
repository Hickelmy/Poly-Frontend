import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { polysApi } from '@/api/polysClient';
import { createPageUrl } from '../utils';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function CreateProject() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fundingDate, setFundingDate] = useState(null);
  const [evidences, setEvidences] = useState([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [expenseDraft, setExpenseDraft] = useState({
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
    min_votes: '10',
    funding_deadline: '',
    status: 'proposed',
  });
  const [location, setLocation] = useState({
    address: '',
    latitude: null,
    longitude: null,
  });

  // Fetch zones for zone_id assignment
  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => polysApi.entities.Zone.filter({ active: true }),
  });

  // Point-in-polygon check
  const isPointInPolygon = (point, polygon) => {
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

  // Find zone_id based on project location
  const findZoneIdForLocation = (lat, lng) => {
    if (!lat || !lng || zones.length === 0) return null;
    for (const zone of zones) {
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
    const loadUser = async () => {
      try {
        const data = await polysApi.auth.me();
        setUser(data);
      } catch {
        // não autenticado
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, []);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleExpenseChange = (field) => (e) => {
    let value = e.target.value;
    if (field === 'cost') {
      // permite apenas dígitos, vírgula e ponto
      value = value.replace(/[^0-9.,]/g, '');
    }
    setExpenseDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditExpense = (id, field, value) => {
    setExpenses((prev) =>
      prev.map((exp) => {
        if (exp.id !== id) return exp;

        if (field === 'quantity') {
          let qty = String(value).replace(/\D/g, '');
          if (qty === '' || qty === '0') qty = '1';
          return { ...exp, quantity: qty };
        }

        if (field === 'cost') {
          const cleaned = String(value).replace(/[^0-9.,]/g, '');
          return { ...exp, cost: cleaned };
        }

        return { ...exp, [field]: value };
      }),
    );
  };

  const handleQuantityChange = (raw) => {
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

    const costNumber = Number(
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
        // mantém como texto para facilitar edição; convertemos para número ao salvar
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

  const handleRemoveExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const parseExpenseCost = (exp) => {
    const raw = exp.cost ?? '';
    if (typeof raw === 'number') return raw;
    const num = Number(
      String(raw)
        .replace(/\./g, '')
        .replace(',', '.'),
    );
    return Number.isNaN(num) || num < 0 ? 0 : num;
  };

  const parseExpenseQuantity = (exp) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Faça login como administrador ou gestor para criar projetos.');
      return;
    }

    if (user.user_role !== 'administrador' && user.user_role !== 'gestor') {
      toast.error('Apenas administradores e gestores podem criar projetos.');
      return;
    }

    if (!formData.title || !formData.category) {
      toast.error('Preencha pelo menos título e categoria.');
      return;
    }

    if (!location.address || !location.latitude || !location.longitude) {
      toast.error('Selecione a localização do problema.');
      return;
    }

    const minVotesNumber = Number(formData.min_votes || 0);
    if (!Number.isFinite(minVotesNumber) || minVotesNumber < 5) {
      toast.error('Os votos mínimos devem ser pelo menos 5.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (fundingDate && fundingDate < today) {
      toast.error('Prazo de arrecadação não pode ser anterior a hoje.');
      return;
    }

    setSaving(true);
    try {
      const normalizedExpenses = expenses.map((e) => ({
        ...e,
        cost: parseExpenseCost(e),
        quantity: parseExpenseQuantity(e),
      }));

      const expensesTotal = normalizedExpenses.reduce(
        (sum, e) => sum + e.cost * e.quantity,
        0,
      );

      // Find zone_id based on project location
      const zoneId = findZoneIdForLocation(location.latitude, location.longitude);

      const payload = {
        title: formData.title,
        short_description: formData.short_description || formData.description?.slice(0, 140),
        description: formData.description,
        category: formData.category,
        // meta financeira automaticamente calculada pela soma das despesas
        target_amount: expensesTotal,
        current_amount: 0,
        min_votes: minVotesNumber,
        votes_count: 0,
        funding_deadline: fundingDate ? fundingDate.toISOString() : null,
        status: formData.status || 'proposed',
        owner_id: user.id,
        owner_email: user.email,
        location_address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        lat: location.latitude, // Para compatibilidade com os filtros do mapa
        lng: location.longitude,
        zone_id: zoneId, // Associa o projeto à zona onde está localizado
        evidences,
        expenses: normalizedExpenses,
        expenses_total: expensesTotal,
      };

      await polysApi.entities.Project.create(payload);

      toast.success('Projeto criado com sucesso!');
      navigate(createPageUrl('Projects'));
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao criar projeto');
    } finally {
      setSaving(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-slate-500">Carregando...</p>
      </div>
    );
  }

  if (!user || (user.user_role !== 'administrador' && user.user_role !== 'gestor')) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Permissão necessária</CardTitle>
            <CardDescription>
              Apenas administradores e gestores podem cadastrar novos projetos de melhoria comunitária.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(createPageUrl('Projects'))}>
              Voltar para projetos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Cadastro de Projeto Comunitário</CardTitle>
          <CardDescription>
            Cadastre um projeto de melhoria para sua comunidade. Os dados são salvos localmente e podem
            ser revisados antes de qualquer integração com o backend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={handleChange('title')}
                placeholder="Ex: Iluminação da Praça Central"
              />
            </div>

            <div className="space-y-2">
              <Label>Resumo curto</Label>
              <Input
                value={formData.short_description}
                onChange={handleChange('short_description')}
                placeholder="Frase rápida explicando o objetivo do projeto"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição detalhada</Label>
              <Textarea
                value={formData.description}
                onChange={handleChange('description')}
                rows={4}
                placeholder="Descreva o problema, a proposta de solução e o impacto esperado..."
              />
            </div>

            {/* Localização */}
            <LocationPicker
              value={location}
              onChange={setLocation}
            />

            {/* Evidências / Imagens */}
            <div className="space-y-3 border rounded-lg p-4 bg-slate-50/70 dark:bg-slate-900/30">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <Label className="font-semibold">Evidências do problema</Label>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Adicione fotos, prints ou imagens que comprovem a necessidade do projeto.
                  </p>
                </div>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                  {uploadingEvidence ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>{uploadingEvidence ? 'Enviando...' : 'Carregar imagem'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      setUploadingEvidence(true);
                      try {
                        const { file_url } = await polysApi.integrations.Core.UploadFile({ file });
                        setEvidences((prev) => [...prev, file_url]);
                      } catch (err) {
                        console.error(err);
                        toast.error('Erro ao enviar imagem de evidência');
                      }
                      setUploadingEvidence(false);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {evidences.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {evidences.map((img, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border">
                      <img
                        src={img}
                        alt={`Evidência ${i + 1}`}
                        className="w-full h-28 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEvidences((prev) => prev.filter((_, index) => index !== i))
                        }
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Despesas previstas */}
            <div className="space-y-3 border rounded-lg p-4 bg-slate-50/70 dark:bg-slate-900/30">
              <div>
                <Label className="font-semibold">Despesas previstas do projeto</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Cadastre os principais custos (produtos, serviços, impostos, etc.) relacionados à execução do projeto.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1 md:col-span-1">
                  <Label>Tipo</Label>
                  <Select
                    value={expenseDraft.type}
                    onValueChange={(value) =>
                      setExpenseDraft((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:col-span-1">
                  <Label>Descrição</Label>
                  <Input
                    value={expenseDraft.description}
                    onChange={handleExpenseChange('description')}
                    placeholder='Ex: "Lixeira de metal"'
                  />
                </div>

                <div className="space-y-1">
                  <Label>Custo (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                      R$
                    </span>
                    <Input
                      value={expenseDraft.cost}
                      onChange={handleExpenseChange('cost')}
                      placeholder="0,00"
                      inputMode="decimal"
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <div className="space-y-1 md:w-40 w-full">
                    <Label>Quantidade</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={decrementQuantity}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        className="text-center"
                        inputMode="numeric"
                        value={expenseDraft.quantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={incrementQuantity}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="mt-2 md:mt-5 w-full md:w-auto bg-teal-600 hover:bg-teal-700"
                    onClick={handleAddExpense}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {expenses.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Itens cadastrados</span>
                    <span>
                      Total previsto:{' '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(totalExpenses)}
                    </span>
                  </div>
                  <div className="border rounded-md max-h-60 overflow-y-auto bg-white dark:bg-slate-900 divide-y">
                    {expenses.map((exp) => (
                      <div key={exp.id} className="px-3 py-2 text-xs sm:text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Tipo</Label>
                            <Select
                              value={exp.type}
                              onValueChange={(value) =>
                                handleEditExpense(exp.id, 'type', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {EXPENSE_TYPE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Descrição</Label>
                            <Input
                              value={exp.description}
                              onChange={(e) =>
                                handleEditExpense(exp.id, 'description', e.target.value)
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">Custo (R$)</Label>
                            <Input
                              value={exp.cost}
                              inputMode="decimal"
                              onChange={(e) =>
                                handleEditExpense(exp.id, 'cost', e.target.value)
                              }
                            />
                          </div>

                          <div className="flex items-end gap-2">
                            <div className="space-y-1 flex-1">
                              <Label className="text-[11px] text-slate-500">Qtd.</Label>
                              <Input
                                value={exp.quantity}
                                inputMode="numeric"
                                onChange={(e) =>
                                  handleEditExpense(exp.id, 'quantity', e.target.value)
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleRemoveExpense(exp.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status inicial</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Meta financeira (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    R$
                  </span>
                  <Input
                    type="text"
                    value={new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(totalExpenses)}
                    readOnly
                    className="pl-9 bg-slate-100 dark:bg-slate-800 cursor-default"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Calculada automaticamente pela soma de todas as despesas x quantidades.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Votos mínimos</Label>
                <Input
                  type="number"
                  min="5"
                  value={formData.min_votes}
                  onChange={handleChange('min_votes')}
                />
              </div>

              <div className="space-y-2">
                <Label>Prazo de arrecadação</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fundingDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fundingDate
                        ? fundingDate.toLocaleDateString('pt-BR')
                        : "Escolha uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={fundingDate}
                      onSelect={setFundingDate}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);
                        return d < today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl('Projects'))}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700"
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Criar Projeto'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



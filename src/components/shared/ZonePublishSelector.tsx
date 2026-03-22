import React from 'react';
import { useSelectedZone } from '@/contexts/SelectedZoneContext';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ZonePublishSelectorProps {
  value: string; // '' = global, zone id = zone-specific
  onChange: (zoneId: string) => void;
}

export default function ZonePublishSelector({ value, onChange }: ZonePublishSelectorProps) {
  const { zones } = useSelectedZone();

  // If user has no zones, don't show selector
  if (!zones || zones.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Onde publicar *</Label>
      <Select value={value || 'global'} onValueChange={(v) => onChange(v === 'global' ? '' : v)}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Selecione onde publicar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="global">Global — Visível para todos</SelectItem>
          {zones.map((zone: any) => (
            <SelectItem key={zone.id} value={zone.id}>
              {zone.name} — Apenas membros
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

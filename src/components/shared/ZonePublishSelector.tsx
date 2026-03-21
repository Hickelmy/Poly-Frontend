import React from 'react';
import { Globe, Lock } from 'lucide-react';
import { useSelectedZone } from '@/contexts/SelectedZoneContext';

interface ZonePublishSelectorProps {
  value: string; // '' = global, zone id = zone-specific
  onChange: (zoneId: string) => void;
}

export default function ZonePublishSelector({ value, onChange }: ZonePublishSelectorProps) {
  const { zones } = useSelectedZone();

  // If user has no zones, don't show selector
  if (!zones || zones.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Onde publicar *</label>
      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => onChange('')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
            value === ''
              ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30 ring-1 ring-teal-500'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          <Globe className={`w-4 h-4 shrink-0 ${value === '' ? 'text-teal-600' : 'text-slate-400'}`} />
          <div>
            <p className="text-sm font-medium">Global</p>
            <p className="text-xs text-slate-500">Visível para todos</p>
          </div>
        </button>
        {zones.map((zone: any) => (
          <button
            key={zone.id}
            type="button"
            onClick={() => onChange(zone.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
              value === zone.id
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30 ring-1 ring-teal-500'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <Lock className={`w-4 h-4 shrink-0 ${value === zone.id ? 'text-teal-600' : 'text-slate-400'}`} />
            <div>
              <p className="text-sm font-medium">{zone.name}</p>
              <p className="text-xs text-slate-500">Visível apenas para membros</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

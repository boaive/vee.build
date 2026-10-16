import { FOUNDATION_HEIGHTS, type BuildQuantities } from '@shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Path = 'shells.A' | 'shells.B' | 'footings' | 'sharedFootings' | 'plinthMetres' | 'deckM2' | 'posts' | 'spandrelMetres' | 'handrailMetres' | 'steps' | 'shades' | 'roof.A' | 'roof.B' | 'solar.A' | 'solar.B' | 'galleryM2' | 'stairFloors';

const GROUPS: { title: string; fields: { path: Path; label: string; unit?: string; decimal?: true }[] }[] = [
  { title: 'Shells', fields: [{ path: 'shells.A', label: 'Shell A' }, { path: 'shells.B', label: 'Shell B' }] },
  {
    title: 'Foundation',
    fields: [
      { path: 'footings', label: 'Plug footings' },
      { path: 'sharedFootings', label: 'of which shared' },
      { path: 'plinthMetres', label: 'L plinth', unit: 'm', decimal: true },
    ],
  },
  {
    title: 'Add-ons',
    fields: [
      { path: 'deckM2', label: 'Deck', unit: 'm²', decimal: true },
      { path: 'posts', label: 'Deck posts' },
      { path: 'spandrelMetres', label: 'Spandrel', unit: 'm', decimal: true },
      { path: 'handrailMetres', label: 'Handrail', unit: 'm', decimal: true },
      { path: 'steps', label: 'Flights of steps' },
      { path: 'shades', label: 'Shades' },
      { path: 'roof.A', label: 'Sloped roofs, A' },
      { path: 'roof.B', label: 'Sloped roofs, B' },
      { path: 'solar.A', label: 'Solar arrays, A' },
      { path: 'solar.B', label: 'Solar arrays, B' },
    ],
  },
  { title: 'Upper floors', fields: [{ path: 'galleryM2', label: 'Gallery', unit: 'm²', decimal: true }, { path: 'stairFloors', label: 'Floors the stair serves' }] },
];

const get = (q: BuildQuantities, p: Path) => p.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], q) as number;
const put = (q: BuildQuantities, p: Path, v: number): BuildQuantities => {
  const [a, b] = p.split('.') as [keyof BuildQuantities, string | undefined];
  return b ? { ...q, [a]: { ...(q[a] as object), [b]: v } } : { ...q, [a]: v };
};

/** The counts a quote is priced from: what the configurator lays out. Start from a preset to get the site's own counts. */
export function QuantitiesForm({ value, onChange, idPrefix = 'q' }: { value: BuildQuantities; onChange: (q: BuildQuantities) => void; idPrefix?: string }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`${idPrefix}-fh`}>
            Foundation height
          </Label>
          <Select value={String(value.foundation.h)} onValueChange={(v) => onChange({ ...value, foundation: { ...value.foundation, h: Number(v) as 0 | 1 | 2 } })}>
            <SelectTrigger id={`${idPrefix}-fh`} className="data w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOUNDATION_HEIGHTS.map((h, i) => (
                <SelectItem key={h} value={String(i)}>
                  {h} mm
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 space-y-1 sm:col-span-2">
          <Label className="text-xs" htmlFor={`${idPrefix}-ft`}>
            Foundation type
          </Label>
          <Select value={value.foundation.type} onValueChange={(v) => onChange({ ...value, foundation: { ...value.foundation, type: v as 'footings' | 'plinth' }, ...(v === 'footings' ? { plinthMetres: 0 } : {}) })}>
            <SelectTrigger id={`${idPrefix}-ft`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="footings">Footings</SelectItem>
              <SelectItem value="plinth">Footings + L plinth</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {GROUPS.map((g) => (
        <fieldset key={g.title}>
          <legend className="eyebrow mb-2">{g.title}</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {g.fields.map((f) => {
              const id = `${idPrefix}-${f.path}`;
              const disabled = f.path === 'plinthMetres' && value.foundation.type === 'footings';
              return (
                <div key={f.path} className="space-y-1">
                  <Label htmlFor={id} className="text-xs">
                    {f.label}
                    {f.unit && <span className="font-normal text-muted-foreground"> ({f.unit})</span>}
                  </Label>
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    step={f.decimal ? 0.1 : 1}
                    inputMode={f.decimal ? 'decimal' : 'numeric'}
                    className="data h-8"
                    disabled={disabled}
                    value={get(value, f.path)}
                    onChange={(e) => {
                      const n = e.target.value === '' ? 0 : Number(e.target.value);
                      if (Number.isFinite(n) && n >= 0) onChange(put(value, f.path, f.decimal ? n : Math.round(n)));
                    }}
                  />
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

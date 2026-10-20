import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { getEntity, saveEntity, type EntityFact, type EntityProfile } from '../../api/dashboard';

const FIELDS: { key: string; label: string; list: boolean }[] = [
  { key: 'name', label: 'Business name', list: false },
  { key: 'description', label: 'Description', list: false },
  { key: 'category', label: 'Category', list: false },
  { key: 'product_type', label: 'Product type', list: false },
  { key: 'products', label: 'Products', list: true },
  { key: 'features', label: 'Features', list: true },
  { key: 'use_cases', label: 'Use cases', list: true },
  { key: 'audiences', label: 'Who it is for', list: true },
  { key: 'locations', label: 'Locations', list: true },
  { key: 'pricing', label: 'Pricing', list: false },
  { key: 'alternate_names', label: 'Other names it is known by', list: true },
  { key: 'same_as', label: 'Profiles elsewhere (https links: LinkedIn, Product Hunt, app stores, ...)', list: true },
  { key: 'logo', label: 'Logo (https image address)', list: false },
];

/** What AI answers make of the name on its own. */
export function brandText(brand: NonNullable<EntityProfile['brand']>): string {
  if (brand.state === 'owned') return `Asked "What is ${brand.name}?", AI answers find this website.`;
  const others = brand.taken_by?.length ? ` describe ${brand.taken_by.slice(0, 3).join(', ')}` : ' do not find this website';
  return `Asked "What is ${brand.name}?", AI answers${others}. Use "${brand.recommended_name}" everywhere; `
    + 'the listing tasks under Actions help search engines and AI assistants recognise the business.';
}

/** Text of a fact for the editor (lists one per line). */
export function factText(fact: EntityFact | undefined): string {
  if (!fact) return '';
  if (fact.items) return fact.items.map((i) => i.value).join('\n');
  return fact.value ?? '';
}

/** "verified (customer)", "verified (site page)", "not verified" … */
export function factStatus(fact: EntityFact | undefined): string {
  if (!fact) return 'not stated';
  const items = fact.items;
  if (items) {
    if (!items.length) return 'not stated on the site';
    const verified = items.filter((i) => i.verified).length;
    return verified === items.length ? 'verified' : `${verified} of ${items.length} verified`;
  }
  if (!fact.value) return 'not stated on the site';
  if (!fact.verified) return 'not verified (inferred)';
  return fact.source === 'customer' ? 'verified (confirmed by you)' : 'verified (on your site)';
}

export default function BusinessFacts({ websiteId }: { websiteId: string }) {
  const [entity, setEntity] = useState<EntityProfile | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getEntity(websiteId)
      .then((e) => {
        setEntity(e);
        setDraft(Object.fromEntries(FIELDS.map((f) => [f.key, factText(e.facts[f.key])])));
      })
      .catch(() => setMessage('Unable to load business facts.'));
  }, [websiteId]);

  const save = async (confirm: boolean) => {
    if (!entity) return;
    const facts: Record<string, string | string[]> = {};
    for (const field of FIELDS) {
      const value = (draft[field.key] ?? '').trim();
      if (value === factText(entity.facts[field.key]).trim() && !confirm) continue;
      if (!value) continue;
      facts[field.key] = field.list ? value.split('\n').map((v) => v.trim()).filter(Boolean) : value;
    }
    setSaving(true);
    setMessage('');
    try {
      const saved = await saveEntity(websiteId, facts, confirm);
      setEntity(saved);
      setMessage(confirm ? 'Facts confirmed. They are published with the next article.' : 'Saved.');
    } catch (err) {
      setMessage(isAxiosError(err) && err.response?.status === 403
        ? 'Only admins can change business facts.' : 'Unable to save business facts.');
    } finally {
      setSaving(false);
    }
  };

  if (!entity) return <div className="card"><div className="muted">{message || 'Loading business facts…'}</div></div>;

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="eyebrow">Source of truth</div>
          <h2>Business facts</h2>
        </div>
        <div className="muted">{entity.status === 'confirmed' ? `Confirmed${entity.confirmed_at ? ` ${new Date(entity.confirmed_at).toLocaleDateString()}` : ''}` : 'Not confirmed yet'}</div>
      </div>
      <p className="muted">
        AI systems describe a business from what they can verify. Only facts confirmed here or stated on
        your own pages are published to your site as structured data and used to check AI answers.
      </p>
      {entity.brand && entity.brand.state !== 'unmeasured' && (
        <p className="muted">{brandText(entity.brand)}</p>
      )}
      {FIELDS.map((field) => (
        <label key={field.key} style={{ display: 'block', marginBottom: 12 }}>
          <div>
            <strong>{field.label}</strong> <span className="muted">— {factStatus(entity.facts[field.key])}</span>
          </div>
          <textarea
            rows={field.list ? 3 : 2}
            style={{ width: '100%' }}
            value={draft[field.key] ?? ''}
            onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
            placeholder={field.list ? 'One per line' : ''}
          />
        </label>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="button secondary" disabled={saving} onClick={() => void save(false)}>Save changes</button>
        <button className="button" disabled={saving} onClick={() => void save(true)}>Confirm these facts</button>
      </div>
      {message && <p className="muted">{message}</p>}
    </div>
  );
}

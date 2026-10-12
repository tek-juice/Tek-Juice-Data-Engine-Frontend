import { useIntelligenceRun } from '../../contexts/IntelligenceRunContext';

/** Website selector; only rendered when the tenant has several websites. */
export default function WebsiteSwitcher() {
  const { website, websites, selectWebsite } = useIntelligenceRun();
  if (websites.length < 2 || !website) return null;
  return (
    <label className="block px-4 py-2 text-xs" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="block mb-1 font-medium" style={{ color: 'var(--text-3)' }}>Website</span>
      <select value={website.id} onChange={event => selectWebsite(event.target.value)}
        className="w-full px-2 py-1.5 rounded text-xs"
        style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
        {websites.map(item => <option key={item.id} value={item.id}>{item.domain}</option>)}
      </select>
    </label>
  );
}

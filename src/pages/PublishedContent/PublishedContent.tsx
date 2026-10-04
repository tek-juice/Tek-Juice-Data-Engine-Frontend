import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  getVisibilityPublished,
} from '../../api/dashboard';
import { listWebsites, type Website } from '../../api/websites';
import type { VisibilityPublishedItem } from '../../types';

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export default function PublishedContent() {
  const [website, setWebsite] = useState<Website | null>(null);
  const [items, setItems] = useState<VisibilityPublishedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [contentType, setContentType] = useState('');

  const load = useCallback(async (refreshMode = false) => {
    try {
      setError('');

      if (refreshMode) setRefreshing(true);
      else setLoading(true);

      const websites = await listWebsites();

      if (!websites.length) {
        setWebsite(null);
        setItems([]);
        setTotal(0);
        return;
      }

      const selectedWebsite = websites[0];
      setWebsite(selectedWebsite);

      const response = await getVisibilityPublished(
        selectedWebsite.id,
        {
          page: 1,
          page_size: 100,
        },
      );

      setItems(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error(err);

      if (isAxiosError(err) && err.response?.status === 404) {
        setError('Published content projection is not available yet.');
      } else {
        setError('Unable to load published content.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !needle ||
        [
          item.target_title,
          item.target_url,
          item.published_url,
          item.opportunity_title,
          item.primary_query,
          item.topic,
          item.content_type,
          item.target_intent,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(needle),
          );

      const matchesType =
        !contentType || item.content_type === contentType;

      return matchesSearch && matchesType;
    });
  }, [items, search, contentType]);

  const contentTypes = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.content_type)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [items],
  );

  const today = useMemo(() => {
    const now = new Date();

    return items.filter((item) => {
      if (!item.published_at) return false;

      const published = new Date(item.published_at);

      return (
        published.getFullYear() === now.getFullYear() &&
        published.getMonth() === now.getMonth() &&
        published.getDate() === now.getDate()
      );
    }).length;
  }, [items]);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Content &amp; Execution</div>
            <h1>Published Content</h1>
          </div>
        </div>

        <div className="card">
          <div className="muted">Loading published content…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Content &amp; Execution</div>
            <h1>Published Content</h1>
          </div>

          <button
            className="button secondary"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} />
            {refreshing ? 'Refreshing…' : 'Retry'}
          </button>
        </div>

        <div className="card empty-state">
          <AlertCircle size={22} />
          <h3>{error}</h3>
          <p className="muted">
            This page reads from the canonical publication projection of the
            execution pipeline.
          </p>
        </div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Content &amp; Execution</div>
            <h1>Published Content</h1>
          </div>
        </div>

        <div className="card empty-state">
          <h3>Connect a website first</h3>
          <p className="muted">
            Published content is scoped to a connected website.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Content &amp; Execution</div>
          <h1>Published Content</h1>
          <p className="muted">
            {website.domain || website.url}
          </p>
        </div>

        <button
          className="button secondary"
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          <RefreshCw size={16} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-4">
        <SummaryCard label="Total published" value={total} />
        <SummaryCard label="Loaded" value={items.length} />
        <SummaryCard label="Published today" value={today} />
        <SummaryCard label="Visible results" value={filtered.length} />
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            className="input"
            placeholder="Search published content, queries, topics…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            className="input"
            value={contentType}
            onChange={(event) => setContentType(event.target.value)}
          >
            <option value="">All content types</option>
            {contentTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <h3>No published content found</h3>
          <p className="muted">
            No published records match the current filters.
          </p>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Content</th>
                  <th>Type</th>
                  <th>Primary query</th>
                  <th>Topic</th>
                  <th>Opportunity</th>
                  <th>Target</th>
                  <th>Published</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.target_title ||
                          item.primary_query ||
                          item.id}
                      </strong>
                    </td>

                    <td>{item.content_type || '—'}</td>

                    <td>{item.primary_query || '—'}</td>

                    <td>{item.topic || '—'}</td>

                    <td>{item.opportunity_title || '—'}</td>

                    <td>
                      {item.published_url ? (
                        <a
                          href={item.published_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-link"
                        >
                          Open
                          <ExternalLink size={14} />
                        </a>
                      ) : (
                        item.target_url || '—'
                      )}
                    </td>

                    <td>
                      {item.published_at
                        ? new Date(
                            item.published_at,
                          ).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

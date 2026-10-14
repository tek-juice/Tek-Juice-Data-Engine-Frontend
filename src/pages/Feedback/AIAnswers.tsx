import { useEffect, useState } from 'react';
import { getAIAnswers, type AIAnswerRecord, type AIAnswersReport } from '../../api/dashboard';

const PLATFORM_NAMES: Record<string, string> = {
  gemini: 'Gemini',
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  perplexity: 'Perplexity',
};

export function platformName(platform: string): string {
  return PLATFORM_NAMES[platform] ?? platform;
}

export const DIAGNOSIS_LABELS: Record<string, string> = {
  crawler_blocked: 'AI crawler blocked or served an empty page',
  not_indexed: 'Site not in the search index',
  answered_from_memory: 'Answered from memory (no web search)',
  no_page_for_question: 'No page on the site answers this',
  competitor_content: 'Competitor pages cited instead',
  third_party_sources: 'Review / community sites cited instead',
  ambiguous_name: 'Answer was about something else with the same name',
  brand_unknown: 'The AI does not know the business yet',
  measurement_failed: 'Not measured',
};

const CATEGORY_LABELS: Record<string, string> = {
  technical_access: 'Technical access',
  content: 'Content',
  external_corroboration: 'External corroboration',
  entity_clarity: 'Business identity',
};

/** The cause line under an answer, unless the answer label already says it. */
export function diagnosisNote(record: AIAnswerRecord): string | null {
  if (!record.diagnosis || record.diagnosis === 'measurement_failed') return null;
  const note = DIAGNOSIS_LABELS[record.diagnosis] ?? record.diagnosis;
  return note === answerLabel(record) ? null : note;
}

function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;
}

/** "+12 pts" against an earlier measurement, or "" when there is none. */
export function delta(now: number | null | undefined, before: number | null | undefined): string {
  if (now === null || now === undefined || before === null || before === undefined) return '';
  const diff = Math.round((now - before) * 100);
  return diff === 0 ? ' (no change)' : ` (${diff > 0 ? '+' : ''}${diff} pts)`;
}

/** One answer, in words: cited, mentioned, or what the AI used instead. */
export function answerLabel(record: AIAnswerRecord): string {
  if (record.error) return `Not measured (${record.error})`;
  if (record.cited) return record.cited_rank ? `Cited (source #${record.cited_rank})` : 'Cited';
  if (record.mentioned && record.recommended) return 'Recommended, not linked';
  if (record.mentioned) return 'Mentioned, not linked';
  if (!record.grounded) return 'Answered from memory (no web search)';
  const others = record.sources.slice(0, 3).map((s) => s.domain).join(', ');
  return others ? `Not cited; used ${others}` : 'Not cited';
}

export default function AIAnswers({ websiteId }: { websiteId: string }) {
  const [report, setReport] = useState<AIAnswersReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAIAnswers(websiteId)
      .then(setReport)
      .catch(() => setError('Unable to load AI answer visibility.'));
  }, [websiteId]);

  if (error) return <div className="card"><div className="muted">{error}</div></div>;
  if (!report) return <div className="card"><div className="muted">Loading AI answer visibility…</div></div>;

  const questions = Array.from(new Set(report.questions.map((q) => q.query_text)));
  const platforms = Object.keys(report.platforms);

  return (
    <>
      <div className="card">
        <div className="section-header">
          <div>
            <div className="eyebrow">AI answer engines</div>
            <h2>Is this website the answer AI assistants give?</h2>
          </div>
        </div>
        {report.configured_platforms.length === 0 ? (
          <p className="muted">No AI platform keys are configured, so AI answers are not measured.</p>
        ) : !report.measured_at ? (
          <p className="muted">
            Not measured yet. Questions are put to {report.configured_platforms.map(platformName).join(', ')} daily.
          </p>
        ) : (
          <div className="detail-grid">
            {platforms.map((p) => {
              const s = report.platforms[p];
              const base = report.baseline?.[p];
              return (
                <div key={p}>
                  <div className="muted">{platformName(p)}</div>
                  <strong>{`Cited ${pct(s.citation_rate)}${delta(s.citation_rate, base?.citation_rate)}`}</strong>
                  <div className="muted">
                    {`Searched the web ${pct(s.retrieval_rate)} · mentioned ${pct(s.mention_rate)}`}
                    {` · recommended ${pct(s.recommendation_rate)}`}
                    {s.avg_citation_position ? ` · avg. source position ${s.avg_citation_position}` : ''}
                  </div>
                  <div className="muted">
                    {`Share of voice ${pct(s.share_of_voice)}`}
                    {s.claims_accurate || s.claims_inaccurate
                      ? ` · claims about the business: ${s.claims_accurate ?? 0} accurate, ${s.claims_inaccurate ?? 0} wrong`
                      : ''}
                    {s.failed ? ` · ${s.failed} not measured` : ''}
                  </div>
                </div>
              );
            })}
            <div>
              <div className="muted">Sent to search engines (IndexNow)</div>
              <strong>
                {report.indexnow ? `${report.indexnow.submitted} of ${report.indexnow.published} pages` : '—'}
              </strong>
              {report.indexnow?.last_problem && (
                <div className="muted">{`Last problem: ${report.indexnow.last_problem}`}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {report.access?.result && (
        <div className="card">
          <h3>Can AI crawlers read the site?</h3>
          <div className="detail-grid">
            {Object.entries(report.access.result.platforms).map(([p, r]) => (
              <div key={p}>
                <div className="muted">{p === 'bing' ? 'Bing (ChatGPT search, Copilot)' : platformName(p)}</div>
                <strong>
                  {r.access === 'ok' ? 'Readable' : r.access === 'blocked' ? 'Blocked'
                    : r.access === 'unreadable' ? 'Empty page served' : 'Unknown'}
                </strong>
              </div>
            ))}
            <div>
              <div className="muted">Pages in the search index</div>
              <strong>{report.indexed_pages ?? 'Not measured'}</strong>
            </div>
            <div>
              <div className="muted">sitemap.xml · llms.txt</div>
              <strong>{`${report.access.result.sitemap ? 'yes' : 'no'} · ${report.access.result.llms_txt ? 'yes' : 'no'}`}</strong>
            </div>
          </div>
        </div>
      )}

      {(report.actions?.length ?? 0) > 0 && (
        <div className="card">
          <h3>Why the site is not cited, and what happens next</h3>
          {report.actions!.map((a) => (
            <div key={a.action} style={{ marginBottom: 12 }}>
              <div className="eyebrow">{`${CATEGORY_LABELS[a.category] ?? a.category}${a.automatic ? ' · automatic' : ' · needs the site owner'}`}</div>
              <strong>{a.action}</strong>
              <p className="muted">{a.detail}</p>
              {a.questions.length > 0 && <div className="muted">{`Questions: ${a.questions.join('; ')}`}</div>}
            </div>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <div className="card">
          <h3>Answers per question</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  {platforms.map((p) => <th key={p}>{platformName(p)}</th>)}
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q}>
                    <td>{q}</td>
                    {platforms.map((p) => {
                      const record = report.questions.find((r) => r.query_text === q && r.platform === p);
                      return (
                        <td key={p}>
                          {record ? answerLabel(record) : '—'}
                          {record && diagnosisNote(record) && (
                            <div className="muted">{diagnosisNote(record)}</div>
                          )}
                          {(record?.competitors_mentioned?.length ?? 0) > 0 && (
                            <div className="muted">{`Competitors named: ${record!.competitors_mentioned!.join(', ')}`}</div>
                          )}
                          {record?.cited_url && (
                            <div><a href={record.cited_url} target="_blank" rel="noreferrer">{record.cited_url}</a></div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report.source_gaps.length > 0 && (
        <div className="card">
          <h3>Sites AI assistants cite instead</h3>
          <p className="muted">
            The next intelligence run prioritises these questions. To be cited instead, the website needs a page
            that answers them better, and a presence on the review, comparison and community sites listed here.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Site</th><th>Questions</th><th>Platforms</th></tr>
              </thead>
              <tbody>
                {report.source_gaps.map((gap) => (
                  <tr key={gap.domain}>
                    <td>
                      {gap.example_url
                        ? <a href={gap.example_url} target="_blank" rel="noreferrer">{gap.domain}</a>
                        : gap.domain}
                    </td>
                    <td>{gap.questions.join('; ')}</td>
                    <td>{gap.platforms.map(platformName).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

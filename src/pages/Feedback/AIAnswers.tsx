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

/** One answer, in words: cited, mentioned, or what the AI used instead. */
export function answerLabel(record: AIAnswerRecord): string {
  if (record.error) return `Not measured (${record.error})`;
  if (record.cited) return record.cited_rank ? `Cited (source #${record.cited_rank})` : 'Cited';
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
              return (
                <div key={p}>
                  <div className="muted">{platformName(p)}</div>
                  <strong>{`Cited in ${s.cited} of ${s.answered} answers`}</strong>
                  <div className="muted">
                    {`Mentioned ${s.mentioned} · searched the web ${s.grounded}`}
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

import { useState, useRef } from 'react';
import { Upload as UploadIcon, CheckCircle2, AlertTriangle, Loader2, FileText, X } from 'lucide-react';
import { uploadDocument } from '../../api/ingest';

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

interface UploadResult {
  filename: string;
  document_id: string;
  status: string;
}

export default function Upload() {
  const [files,    setFiles]    = useState<File[]>([]);
  const [state,    setState]    = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [results,  setResults]  = useState<UploadResult[]>([]);
  const [error,    setError]    = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return;
    const valid = Array.from(incoming).filter(f =>
      /\.(pdf|docx|html|txt|csv|json|md)$/i.test(f.name)
    );
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !names.has(f.name))];
    });
  }

  function remove(name: string) {
    setFiles(prev => prev.filter(f => f.name !== name));
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setState('uploading');
    setError('');
    setResults([]);
    setProgress(0);

    const out: UploadResult[] = [];
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const res = await uploadDocument(file, undefined, pct => {
          // Per-file progress blended with overall position
          setProgress(Math.round(((i / files.length) + (pct / 100 / files.length)) * 100));
        });
        out.push({ filename: file.name, document_id: res.document_id, status: 'queued' });
      } catch {
        failed++;
        out.push({ filename: file.name, document_id: '', status: 'error' });
      }
    }

    setResults(out);
    setProgress(100);
    setState(failed === files.length ? 'error' : 'done');
    if (failed === 0) setFiles([]);
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <header
        className="flex items-center justify-between px-7 py-4 sticky top-0 z-10"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Upload Content
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Seed the engine with content from your product — PDF, HTML, DOCX, TXT, MD
          </p>
        </div>
      </header>

      <div className="px-7 py-6 max-w-2xl space-y-6">

        {/* Why upload section */}
        <div
          className="p-4 text-xs space-y-1.5"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', lineHeight: 1.6 }}
        >
          <p className="font-semibold" style={{ color: 'var(--text)' }}>When to use manual upload</p>
          <p style={{ color: 'var(--text-3)' }}>
            Use this if your website is a JavaScript SPA that the automated crawler couldn't index properly.
            Upload your key pages as HTML files, or paste content as <code>.txt</code> files.
            Once uploaded, the engine runs the full pipeline automatically:
            chunk → embed → gap analysis → AI draft writing.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); }}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          className="flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-colors"
          style={{ border: '2px dashed var(--border)', background: 'var(--surface)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <UploadIcon size={22} style={{ color: 'var(--text-3)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Drop files here or click to browse
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            PDF · DOCX · HTML · TXT · CSV · JSON · MD
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.html,.txt,.csv,.json,.md"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ border: '1px solid var(--border)' }}>
            {files.map(f => (
              <div
                key={f.name}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <FileText size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                <span className="flex-1 text-xs truncate" style={{ color: 'var(--text)' }}>{f.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                <button onClick={() => remove(f.name)} style={{ color: 'var(--text-3)' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || state === 'uploading'}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold disabled:opacity-40 transition-colors"
          style={{ background: 'var(--brand)', color: '#111' }}
        >
          {state === 'uploading'
            ? <><Loader2 size={14} className="animate-spin" /> Uploading… {progress}%</>
            : <><UploadIcon size={14} /> Upload {files.length > 0 ? `${files.length} file${files.length !== 1 ? 's' : ''}` : ''}</>
          }
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ border: '1px solid var(--border)' }}>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                {r.status === 'error'
                  ? <AlertTriangle size={13} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                  : <CheckCircle2 size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
                }
                <span className="flex-1 text-xs truncate" style={{ color: 'var(--text)' }}>{r.filename}</span>
                <span className="text-xs" style={{ color: r.status === 'error' ? 'var(--danger)' : 'var(--success)', fontFamily: 'ui-monospace, monospace' }}>
                  {r.status === 'error' ? 'failed' : 'queued for processing'}
                </span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        {state === 'done' && results.filter(r => r.status !== 'error').length > 0 && (
          <div
            className="flex items-start gap-3 p-4"
            style={{ border: '1px solid rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.06)' }}
          >
            <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--success)' }}>
                Upload complete — pipeline started
              </p>
              <p className="text-xs" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
                Each document is now being chunked, embedded, and gap-analysed automatically.
                Check <strong>Gap Detection</strong> in a few minutes to see results.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

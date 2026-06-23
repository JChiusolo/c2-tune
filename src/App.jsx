import { useState, useCallback, useRef } from 'react';
import Header from './components/Header.jsx';
import VehicleForm from './components/VehicleForm.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import CalibrationReport from './components/CalibrationReport.jsx';
import { streamSection, SECTION_KEYS, SECTION_LABELS } from './api/tuner.js';
import { Zap, Play, RotateCcw, CheckCircle, Loader, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const BLANK_FORM = { year: '', make: '', model: '', miles: '', mods: '', goal: '' };
const MAX_HISTORY = 20;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem('hpta-history') || '[]'); }
  catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem('hpta-history', JSON.stringify(h)); } catch { /* full */ }
}

// ─── Section status pill ───────────────────────────────────────────────────────
// status: 'idle' | 'running' | 'done' | 'error'
function StatusPill({ status }) {
  const cfg = {
    idle:    { color: 'var(--text-3)',   bg: 'transparent',          label: 'Not run' },
    running: { color: 'var(--accent)',   bg: 'var(--accent-dim)',     label: 'Running…' },
    done:    { color: 'var(--success)',  bg: 'var(--success-dim)',    label: 'Complete' },
    error:   { color: 'var(--danger)',   bg: 'var(--danger-dim)',     label: 'Error' },
  }[status] || { color: 'var(--text-3)', bg: 'transparent', label: '' };

  return (
    <span style={{
      fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
      color: cfg.color, background: cfg.bg, borderRadius: '4px', padding: '2px 7px',
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ sectionKey, label, status, result, error, onRun, disabled, usage }) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = status === 'done' || status === 'running';
  const isRunning  = status === 'running';

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${status === 'running' ? 'var(--accent-ring)' : status === 'done' ? 'rgba(16,185,129,0.2)' : status === 'error' ? 'rgba(248,113,113,0.2)' : 'var(--border)'}`,
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* ── Card header row ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 14px',
        background: status === 'running' ? 'var(--accent-dim)' : 'transparent',
        transition: 'background 0.2s',
      }}>
        {/* Status icon */}
        <div style={{ flexShrink: 0, lineHeight: 0 }}>
          {status === 'idle'    && <Zap size={15} color="var(--text-3)" strokeWidth={1.5} />}
          {status === 'running' && (
            <div style={{
              width: 15, height: 15, border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)', borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
          )}
          {status === 'done'  && <CheckCircle size={15} color="var(--success)" strokeWidth={2} />}
          {status === 'error' && <AlertCircle size={15} color="var(--danger)"  strokeWidth={2} />}
        </div>

        {/* Label */}
        <span style={{
          flex: 1, fontSize: '13px', fontWeight: 500,
          color: status === 'running' ? 'var(--accent)' : 'var(--text)',
        }}>
          {label}
        </span>

        {/* Token count */}
        {usage && status === 'done' && (
          <span style={{ fontSize: '10px', color: 'var(--text-3)', flexShrink: 0 }}>
            {usage.outputTokens.toLocaleString()} tok
          </span>
        )}

        {/* Run button */}
        <button
          className="btn-ghost"
          onClick={onRun}
          disabled={disabled || isRunning}
          style={{ padding: '4px 10px', fontSize: '12px', flexShrink: 0 }}
        >
          {isRunning ? <Loader size={12} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Play size={12} />}
          {isRunning ? 'Running' : status === 'done' ? 'Re-run' : 'Run'}
        </button>

        {/* Expand toggle — only when there's content */}
        {(hasContent || status === 'error') && (
          <button
            className="btn-icon"
            onClick={() => setExpanded(e => !e)}
            style={{ flexShrink: 0 }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* ── Expanded output ── */}
      {expanded && (hasContent || status === 'error') && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '16px 18px',
          maxHeight: '520px',
          overflowY: 'auto',
        }}>
          {status === 'error' ? (
            <p style={{ color: 'var(--danger)', fontSize: '13px' }}>{error}</p>
          ) : (
            <CalibrationReport report={result} streaming={isRunning} compact />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Run-all progress bar ──────────────────────────────────────────────────────
function RunAllBar({ done, total, running }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
          {running ? `Running all sections… (${done}/${total} complete)` : `${done}/${total} sections complete`}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{pct}%</span>
      </div>
      <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: '2px',
          background: 'var(--accent)', transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: '40px', textAlign: 'center', gap: '16px',
    }}>
      <div style={{
        width: '52px', height: '52px', background: 'var(--accent-dim)',
        border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Zap size={24} color="var(--accent)" strokeWidth={1.5} />
      </div>
      <div>
        <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
          Ready to calibrate
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, maxWidth: '360px' }}>
          Fill in the vehicle details on the left, then run any section individually or click <strong>Run All</strong> to generate the full calibration plan — each section gets its own dedicated API call so nothing gets cut off.
        </p>
      </div>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [formData, setFormData] = useState(BLANK_FORM);
  const [history,  setHistory]  = useState(loadHistory);

  // Per-section state: { [key]: { status, result, error, usage } }
  const initSections = () =>
    Object.fromEntries(SECTION_KEYS.map(k => [k, { status: 'idle', result: '', error: '', usage: null }]));

  const [sections,    setSections]    = useState(initSections);
  const [runningAll,  setRunningAll]  = useState(false);
  const [anyResult,   setAnyResult]   = useState(false);

  // Refs for accumulating streamed text without stale closures
  const resultRefs = useRef(Object.fromEntries(SECTION_KEYS.map(k => [k, ''])));
  // Track in-flight run-all so we can cancel early if needed
  const runAllAbort = useRef(false);

  // ── Validate form ──────────────────────────────────────────────────────────
  const formValid = formData.year && formData.make && formData.model && formData.mods && formData.goal;

  // ── Run a single section ───────────────────────────────────────────────────
  const runSection = useCallback(async (key) => {
    if (!formValid) return;

    resultRefs.current[key] = '';
    setSections(prev => ({
      ...prev,
      [key]: { status: 'running', result: '', error: '', usage: null },
    }));
    setAnyResult(true);

    try {
      const usage = await streamSection(key, formData, (chunk) => {
        resultRefs.current[key] += chunk;
        setSections(prev => ({
          ...prev,
          [key]: { ...prev[key], status: 'running', result: resultRefs.current[key] },
        }));
      });

      const finalText = resultRefs.current[key];
      setSections(prev => ({
        ...prev,
        [key]: { status: 'done', result: finalText, error: '', usage },
      }));

      // Persist to history per-section
      setHistory(prev => {
        const existing = prev.find(h => h.id === 'current');
        const entry = existing
          ? { ...existing, sections: { ...existing.sections, [key]: { result: finalText, usage } } }
          : {
              id: 'current',
              timestamp: Date.now(),
              ...formData,
              sections: { [key]: { result: finalText, usage } },
            };
        const next = [entry, ...prev.filter(h => h.id !== 'current')].slice(0, MAX_HISTORY);
        saveHistory(next);
        return next;
      });
    } catch (err) {
      setSections(prev => ({
        ...prev,
        [key]: { status: 'error', result: '', error: err.message, usage: null },
      }));
    }
  }, [formData, formValid]);

  // ── Run all sections sequentially ──────────────────────────────────────────
  const runAll = useCallback(async () => {
    if (!formValid || runningAll) return;
    runAllAbort.current = false;
    setRunningAll(true);

    for (const key of SECTION_KEYS) {
      if (runAllAbort.current) break;
      await runSection(key);
    }

    setRunningAll(false);
  }, [formValid, runningAll, runSection]);

  // ── Reset all sections ─────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    runAllAbort.current = true;
    setSections(initSections());
    resultRefs.current = Object.fromEntries(SECTION_KEYS.map(k => [k, '']));
    setAnyResult(false);
    setRunningAll(false);
  }, []);

  // ── History load ───────────────────────────────────────────────────────────
  const handleLoadHistory = useCallback((id) => {
    const entry = history.find(h => h.id === id);
    if (!entry) return;
    setFormData({ year: entry.year, make: entry.make, model: entry.model, miles: entry.miles, mods: entry.mods, goal: entry.goal });
    if (entry.sections) {
      const restored = initSections();
      for (const [k, v] of Object.entries(entry.sections)) {
        if (restored[k]) {
          restored[k] = { status: 'done', result: v.result, error: '', usage: v.usage };
          resultRefs.current[k] = v.result;
        }
      }
      setSections(restored);
      setAnyResult(true);
    }
  }, [history]);

  const handleDeleteHistory = useCallback((id) => {
    setHistory(prev => { const n = prev.filter(h => h.id !== id); saveHistory(n); return n; });
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]); saveHistory([]);
  }, []);

  // ── Counts for progress bar ────────────────────────────────────────────────
  const doneCount = SECTION_KEYS.filter(k => sections[k].status === 'done').length;
  const showProgress = runningAll || doneCount > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
      `}</style>

      <Header />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Sidebar ── */}
        <aside style={{
          width: 'var(--sidebar-w)', flexShrink: 0,
          background: 'var(--surface)', borderRight: '1px solid var(--border)',
          overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column',
        }}>
          <VehicleForm
            data={formData}
            onChange={setFormData}
            loading={runningAll}
            /* no onSubmit — submission is per-section now */
          />
          <HistoryPanel
            history={history}
            onLoad={handleLoadHistory}
            onDelete={handleDeleteHistory}
            onClearAll={handleClearHistory}
          />
        </aside>

        {/* ── Main panel ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!anyResult && !runningAll ? (
            <EmptyState />
          ) : (
            <>
              {showProgress && (
                <RunAllBar done={doneCount} total={SECTION_KEYS.length} running={runningAll} />
              )}

              {/* Section grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {SECTION_KEYS.map(key => (
                  <SectionCard
                    key={key}
                    sectionKey={key}
                    label={SECTION_LABELS[key]}
                    status={sections[key].status}
                    result={sections[key].result}
                    error={sections[key].error}
                    usage={sections[key].usage}
                    onRun={() => runSection(key)}
                    disabled={!formValid || runningAll}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* ── Sticky action bar ── */}
      {formValid && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '24px',
          display: 'flex', gap: '8px', zIndex: 100,
        }}>
          {anyResult && (
            <button
              className="btn-ghost"
              onClick={resetAll}
              style={{ padding: '10px 16px', background: 'var(--surface-2)', backdropFilter: 'blur(8px)' }}
            >
              <RotateCcw size={14} /> Reset all
            </button>
          )}
          <button
            className="btn-primary"
            onClick={runningAll ? () => { runAllAbort.current = true; setRunningAll(false); } : runAll}
            disabled={!formValid}
            style={{ width: 'auto', padding: '10px 20px', backdropFilter: 'blur(8px)' }}
          >
            {runningAll
              ? <><Loader size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Stop</>
              : <><Play size={14} /> Run All Sections</>
            }
          </button>
        </div>
      )}
    </div>
  );
}

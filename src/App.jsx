import { useState, useCallback, useRef } from 'react';
import Header from './components/Header.jsx';
import VehicleForm, { SECTION_BUTTONS } from './components/VehicleForm.jsx';
import CalibrationReport from './components/CalibrationReport.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import { streamSection } from './api/tuner.js';

const BLANK_FORM = { year: '', make: '', model: '', miles: '', mods: '', goal: '' };
const MAX_HISTORY = 20;

function initSectionResults() {
  return Object.fromEntries(
    SECTION_BUTTONS.map(({ key }) => [key, { status: 'idle', result: '', error: '', usage: null }])
  );
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem('hpta-history') || '[]'); }
  catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem('hpta-history', JSON.stringify(h)); } catch { /* storage full */ }
}

export default function App() {
  const [formData,        setFormData]        = useState(BLANK_FORM);
  const [sectionResults,  setSectionResults]  = useState(initSectionResults);
  const [runningKey,      setRunningKey]       = useState(null);
  const [history,         setHistory]          = useState(loadHistory);
  const [activeHistoryId, setActiveHistoryId]  = useState(null);

  // Accumulate streamed text per section without stale-closure issues
  const resultRefs = useRef(
    Object.fromEntries(SECTION_BUTTONS.map(({ key }) => [key, '']))
  );

  // ── Run one section ────────────────────────────────────────────────────────
  const handleRunSection = useCallback(async (key) => {
    if (runningKey) return;

    // Reset this section and mark running
    resultRefs.current[key] = '';
    setRunningKey(key);
    setSectionResults(prev => ({
      ...prev,
      [key]: { status: 'running', result: '', error: '', usage: null },
    }));

    // Scroll output card into view once it mounts
    setTimeout(() => {
      document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    try {
      const usage = await streamSection(formData, key, (chunk) => {
        resultRefs.current[key] += chunk;
        // Update result in state on every chunk → live rendering
        setSectionResults(prev => ({
          ...prev,
          [key]: { ...prev[key], status: 'running', result: resultRefs.current[key] },
        }));
      });

      const finalText = resultRefs.current[key];

      setSectionResults(prev => ({
        ...prev,
        [key]: { status: 'done', result: finalText, error: '', usage },
      }));

      // Persist to history — update existing entry for this session or create new one
      setHistory(prev => {
        const existingIdx = prev.findIndex(h => h.id === activeHistoryId);
        if (existingIdx !== -1) {
          const updated = {
            ...prev[existingIdx],
            sections: { ...prev[existingIdx].sections, [key]: { result: finalText, usage } },
          };
          const next = [...prev];
          next[existingIdx] = updated;
          saveHistory(next);
          return next;
        } else {
          const entry = {
            id:        Date.now().toString(),
            timestamp: Date.now(),
            ...formData,
            sections:  { [key]: { result: finalText, usage } },
          };
          setActiveHistoryId(entry.id);
          const next = [entry, ...prev].slice(0, MAX_HISTORY);
          saveHistory(next);
          return next;
        }
      });

    } catch (err) {
      setSectionResults(prev => ({
        ...prev,
        [key]: { status: 'error', result: '', error: err.message || 'Generation failed.', usage: null },
      }));
    } finally {
      setRunningKey(null);
    }
  }, [runningKey, formData, activeHistoryId]);

  // ── History ────────────────────────────────────────────────────────────────
  const handleLoadHistory = useCallback((id) => {
    const entry = history.find(h => h.id === id);
    if (!entry) return;
    setFormData({
      year: entry.year, make: entry.make, model: entry.model,
      miles: entry.miles, mods: entry.mods, goal: entry.goal,
    });
    const restored = initSectionResults();
    if (entry.sections) {
      for (const [k, v] of Object.entries(entry.sections)) {
        if (restored[k]) {
          restored[k] = { status: 'done', result: v.result, error: '', usage: v.usage };
          resultRefs.current[k] = v.result;
        }
      }
    }
    setSectionResults(restored);
    setActiveHistoryId(id);
    setRunningKey(null);
  }, [history]);

  const handleDeleteHistory = useCallback((id) => {
    setHistory(prev => {
      const next = prev.filter(h => h.id !== id);
      saveHistory(next);
      return next;
    });
    if (activeHistoryId === id) {
      setSectionResults(initSectionResults());
      setActiveHistoryId(null);
    }
  }, [activeHistoryId]);

  const handleClearHistory = useCallback(() => {
    setHistory([]); saveHistory([]);
    setSectionResults(initSectionResults());
    setActiveHistoryId(null);
  }, []);

  const anyActive = SECTION_BUTTONS.some(({ key }) => sectionResults[key].status !== 'idle');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
            onRunSection={handleRunSection}
            runningKey={runningKey}
            sectionResults={sectionResults}
          />
          <HistoryPanel
            history={history}
            activeId={activeHistoryId}
            onLoad={handleLoadHistory}
            onDelete={handleDeleteHistory}
            onClearAll={handleClearHistory}
          />
        </aside>

        {/* ── Main panel ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {!anyActive ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%',
              padding: '40px', textAlign: 'center', gap: '16px',
            }}>
              <div style={{
                width: '52px', height: '52px', background: 'var(--accent-dim)',
                border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                  Ready to calibrate
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, maxWidth: '380px' }}>
                  Fill in the vehicle details and modifications on the left, then click any section
                  button to generate that section's calibration plan. Each section streams live,
                  token by token, with no timeout.
                </p>
              </div>
            </div>
          ) : (
            <CalibrationReport
              vehicle={formData}
              sectionResults={sectionResults}
              SECTION_BUTTONS={SECTION_BUTTONS}
            />
          )}
        </main>

      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import Header from './components/Header.jsx';
import VehicleForm from './components/VehicleForm.jsx';
import CalibrationReport from './components/CalibrationReport.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import { generateTuningPlan } from './api/tuner.js';
import { Zap, FileText } from 'lucide-react';

const BLANK_FORM = { year: '', make: '', model: '', miles: '', mods: '', goal: '' };

const MAX_HISTORY = 20;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('hpta-history') || '[]');
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem('hpta-history', JSON.stringify(history));
  } catch {
    /* storage full or unavailable */
  }
}

// ─── Empty / welcome state ─────────────────────────────────────────────────────
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
        <h2 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
          Ready to calibrate
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.7', maxWidth: '380px' }}>
          Enter the vehicle details, hardware modifications, and client goal on the left —
          the agent will generate a complete HP Tuners VCM Suite calibration plan specific to the build.
        </p>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '360px',
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)', padding: '16px',
      }}>
        {[
          'Platform-specific VE table strategy',
          'Spark timing and knock protection targets',
          'MAF vs. speed density decision',
          'Injector scaling and fuel trim targets',
          'Boost control (if forced induction)',
          'Data logging checklist with red-flag thresholds',
        ].map((item) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: 'var(--accent)', flexShrink: 0,
            }} />
            <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loading state ─────────────────────────────────────────────────────────────
function LoadingState({ vehicle }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: '16px', padding: '40px',
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: '48px', height: '48px', border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text)', marginBottom: '4px' }}>
          Generating calibration plan…
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </p>
      </div>
      {[
        'Analyzing hardware modifications…',
        'Computing VE table strategy…',
        'Selecting MAF / speed density approach…',
        'Generating spark timing targets…',
      ].map((msg, i) => (
        <div
          key={msg}
          style={{
            fontSize: '12px', color: 'var(--text-3)',
            animation: `fadeIn 0.4s ease ${i * 1.2}s both`,
          }}
        >
          {msg}
        </div>
      ))}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [formData, setFormData] = useState(BLANK_FORM);
  const [result, setResult]     = useState(null);
  const [usage, setUsage]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [history, setHistory]   = useState(loadHistory);
  const [activeId, setActiveId] = useState(null);
  const [pendingVehicle, setPendingVehicle] = useState(null);

  // Submit form and call the API
  const handleSubmit = useCallback(async () => {
    setError('');
    setLoading(true);
    setResult(null);
    setPendingVehicle({ ...formData });

    try {
      const { result: text, usage: u } = await generateTuningPlan(formData);
      setResult(text);
      setUsage(u);
      setActiveId(null);

      // Save to history
      const entry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        year:  formData.year,
        make:  formData.make,
        model: formData.model,
        miles: formData.miles,
        mods:  formData.mods,
        goal:  formData.goal,
        result: text,
        usage: u,
      };
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, MAX_HISTORY);
        saveHistory(next);
        return next;
      });
    } catch (err) {
      setError(err.message || 'Failed to generate calibration plan. Check that the server is running and your API key is valid.');
    } finally {
      setLoading(false);
    }
  }, [formData]);

  // Load a history entry
  const handleLoadHistory = useCallback((id) => {
    const entry = history.find((h) => h.id === id);
    if (!entry) return;
    setFormData({ year: entry.year, make: entry.make, model: entry.model, miles: entry.miles, mods: entry.mods, goal: entry.goal });
    setResult(entry.result);
    setUsage(entry.usage || null);
    setPendingVehicle({ year: entry.year, make: entry.make, model: entry.model });
    setActiveId(id);
    setError('');
  }, [history]);

  // Delete one history entry
  const handleDeleteHistory = useCallback((id) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      saveHistory(next);
      return next;
    });
    if (activeId === id) {
      setResult(null);
      setActiveId(null);
    }
  }, [activeId]);

  // Clear all history
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
    setResult(null);
    setActiveId(null);
  }, []);

  const vehicleForDisplay = result ? (pendingVehicle || formData) : formData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Sidebar ── */}
        <aside style={{
          width: 'var(--sidebar-w)',
          flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <VehicleForm
            data={formData}
            onChange={setFormData}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
          <HistoryPanel
            history={history}
            activeId={activeId}
            onLoad={handleLoadHistory}
            onDelete={handleDeleteHistory}
            onClearAll={handleClearHistory}
          />
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading && <LoadingState vehicle={formData} />}

          {!loading && result && (
            <CalibrationReport
              vehicle={vehicleForDisplay}
              report={result}
              usage={usage}
            />
          )}

          {!loading && !result && <EmptyState />}
        </main>
      </div>
    </div>
  );
}

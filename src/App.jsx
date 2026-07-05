import { useState, useCallback } from 'react';
import Header from './components/Header.jsx';
import VehicleForm, { SECTION_BUTTONS } from './components/VehicleForm.jsx';
import CalibrationReport from './components/CalibrationReport.jsx';
import { generateSection } from './api/tuner.js';

const BLANK_FORM = { year:'', make:'', model:'', miles:'', mods:'', goal:'' };

export default function App() {
  const [formData,       setFormData]       = useState(BLANK_FORM);
  const [sectionResults, setSectionResults] = useState({});   // ← always a plain object, never undefined
  const [runningKey,     setRunningKey]     = useState(null);

  const handleRunSection = useCallback(async (key) => {
    setRunningKey(key);

    // Mark as running — scroll the result panel to this card if it exists
    setSectionResults(prev => ({
      ...prev,
      [key]: { status:'running', result:'', error:'', usage:null },
    }));

    // Scroll the section card into view (gives feedback even before content loads)
    setTimeout(() => {
      document.getElementById(`section-${key}`)?.scrollIntoView({ behavior:'smooth', block:'start' });
    }, 80);

    try {
      const data = await generateSection(formData, key);
      setSectionResults(prev => ({
        ...prev,
        [key]: { status:'done', result: data.result, error:'', usage: data.usage || null },
      }));
    } catch (err) {
      setSectionResults(prev => ({
        ...prev,
        [key]: { status:'error', result:'', error: err.message || 'Generation failed.', usage:null },
      }));
    } finally {
      setRunningKey(null);
    }
  }, [formData]);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      <Header />

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width:'var(--sidebar-w)', flexShrink:0,
          background:'var(--surface)', borderRight:'1px solid var(--border)',
          overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column',
        }}>
          <VehicleForm
            data={formData}
            onChange={setFormData}
            onRunSection={handleRunSection}
            runningKey={runningKey}
            sectionResults={sectionResults}   // always {} or populated object — never undefined
          />
        </aside>

        {/* ── Main panel ── */}
        <main style={{ flex:1, overflowY:'auto', padding:'24px' }}>
          <CalibrationReport
            vehicle={formData}
            sectionResults={sectionResults}   // always {} or populated object — never undefined
            SECTION_BUTTONS={SECTION_BUTTONS}
          />
        </main>

      </div>
    </div>
  );
}

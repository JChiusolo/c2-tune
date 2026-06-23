import { Wrench, Target, AlertCircle } from 'lucide-react';

const GOAL_PRESETS = [
  { label: 'Max street power — 93 oct', value: 'Maximum reliable street performance on 93 octane pump gas. Daily driver — must idle cleanly and pass emissions.' },
  { label: 'Street/strip — E85', value: 'Maximum power on E85 ethanol. Street-driven but track use on weekends. No emissions requirement.' },
  { label: 'Tow/haul — economy + torque', value: 'Maximize low-end torque and towing capacity. Optimize fuel economy at cruise. Prioritize reliability and transmission longevity.' },
  { label: 'Race only — no street', value: 'Maximum race power — no street or emissions requirement. Aggressive timing, target max power band, no idle drivability concern.' },
];

const field = {
  marginBottom: '14px',
};

export default function VehicleForm({ data, onChange, onSubmit, loading, error }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value });

  const applyPreset = (value) => onChange({ ...data, goal: value });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
        <Wrench size={14} color="var(--text-3)" />
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Vehicle
        </span>
      </div>

      {/* Year / Make / Model */}
      <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        <div>
          <label htmlFor="year">Year</label>
          <input
            id="year"
            type="number"
            min="1980"
            max="2030"
            placeholder="2022"
            value={data.year}
            onChange={set('year')}
            required
          />
        </div>
        <div>
          <label htmlFor="make">Make</label>
          <input
            id="make"
            type="text"
            placeholder="Chevrolet"
            value={data.make}
            onChange={set('make')}
            required
          />
        </div>
        <div>
          <label htmlFor="model">Model / Engine</label>
          <input
            id="model"
            type="text"
            placeholder="Camaro SS (LT1)"
            value={data.model}
            onChange={set('model')}
            required
          />
        </div>
      </div>

      {/* Mileage */}
      <div style={field}>
        <label htmlFor="miles">Mileage</label>
        <input
          id="miles"
          type="number"
          min="0"
          placeholder="45000"
          value={data.miles}
          onChange={set('miles')}
        />
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 14px' }} />

      {/* Hardware Mods */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
        <Wrench size={14} color="var(--text-3)" />
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Hardware Modifications
        </span>
      </div>

      <div style={field}>
        <label htmlFor="mods">List all hardware mods</label>
        <textarea
          id="mods"
          rows={5}
          placeholder={`List each modification on its own line or comma-separated, including specs:

• Stage 2 cam: 228/236 duration, .595/.598 lift, 114+2 LSA
• LT headers 1-7/8" with high-flow cats
• Kooks cold air intake
• 60lb Delphi fuel injectors
• Magnuson TVS2300 supercharger @ 9 psi
• Walbro 255lph fuel pump`}
          value={data.mods}
          onChange={set('mods')}
          required
          style={{ minHeight: '130px' }}
        />
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 14px' }} />

      {/* Client Goal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
        <Target size={14} color="var(--text-3)" />
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Client Goal
        </span>
      </div>

      {/* Goal presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
        {GOAL_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="btn-ghost"
            style={{ fontSize: '12px', padding: '4px 9px' }}
            onClick={() => applyPreset(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div style={field}>
        <label htmlFor="goal">Describe the build goal</label>
        <textarea
          id="goal"
          rows={3}
          placeholder="e.g. Maximum reliable street/strip power on 93 octane. Daily driver — must idle cleanly and pass OBDII emissions. Target 550whp. Prioritize knock safety over peak power."
          value={data.goal}
          onChange={set('goal')}
          required
          style={{ minHeight: '80px' }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '8px',
          background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.25)',
          borderRadius: 'var(--r)', padding: '10px 12px', marginBottom: '12px',
        }}>
          <AlertCircle size={15} color="var(--danger)" style={{ flexShrink: 0, marginTop: '1px' }} />
          <span style={{ fontSize: '13px', color: 'var(--danger)', lineHeight: '1.5' }}>{error}</span>
        </div>
      )}

      {/* Submit */}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? (
          <>
            <LoadingSpinner />
            Analyzing build…
          </>
        ) : (
          'Generate Calibration Plan'
        )}
      </button>
    </form>
  );
}

function LoadingSpinner() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

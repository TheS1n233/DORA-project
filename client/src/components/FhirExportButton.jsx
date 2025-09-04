// English comments only
import React, { useState } from 'react';
import { exportFhir } from '../lib/services/health.js';

export default function FhirExportButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onClick() {
    setLoading(true);
    setDone(false);
    const r = await exportFhir();
    setLoading(false);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <button className="btn" onClick={onClick} disabled={loading}>
      {loading ? 'Exporting…' : done ? 'Exported ✓' : 'Export FHIR'}
    </button>
  );
}

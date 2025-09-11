// English comments only
import React, { useState } from 'react';
import { exportFhir } from '../lib/services/health.js';

export default function FhirExportButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onClick() {
    setLoading(true);
    setDone(false);
    try {
      await exportFhir();
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (e) {
      // Show a minimal, accessible error hint
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn" onClick={onClick} disabled={loading}>
      {loading ? 'Exporting…' : done ? 'Exported ✓' : 'Export FHIR'}
    </button>
  );
}

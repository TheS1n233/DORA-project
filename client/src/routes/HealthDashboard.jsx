// English comments only
export default function HealthDashboard() {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card md:col-span-2">
        <div className="font-semibold mb-2">Health Diagnosis</div>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          <li>❤️ Heart — 75%</li>
          <li>🫁 Lungs — 90%</li>
          <li>🫃 Stomach — 13%</li>
          <li>🫀 Liver — 44%</li>
        </ul>
      </div>
      <div className="card">
        <div className="font-semibold mb-2">Heart Rate</div>
        <div className="text-3xl">102 bpm</div>
      </div>
    </div>
  )
}

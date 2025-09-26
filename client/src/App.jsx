// client/src/App.jsx
// Render the video calling panel for admin/client
import React from 'react'
import './App.css'
import VideoCallPanel from './components/VideoCallPanel'

function App() {
  return (
    <div style={{ padding: 16 }}>
      <VideoCallPanel />
    </div>
  )
}

export default App

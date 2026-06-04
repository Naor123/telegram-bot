import React, { useState } from 'react'
import BotStatus from './components/BotStatus.jsx'
import Monitor from './components/Monitor.jsx'

export default function App() {
  const [tab, setTab] = useState('bot')
  return (
    <div className="container">
      <h1>Telegram Bot Dashboard</h1>
      <div className="tab-bar">
        <button className={`tab-btn${tab === 'bot' ? ' tab-active' : ''}`} onClick={() => setTab('bot')}>Bot</button>
        <button className={`tab-btn${tab === 'monitor' ? ' tab-active' : ''}`} onClick={() => setTab('monitor')}>Monitor</button>
      </div>
      <div style={{ display: tab === 'bot' ? 'block' : 'none' }}>
        <BotStatus />
      </div>
      <div style={{ display: tab === 'monitor' ? 'block' : 'none' }}>
        <Monitor />
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { getBotInfo, sendMessage, deleteBotHistory } from '../api.js'

export default function BotStatus() {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState(null)

  const fetchInfo = () => {
    getBotInfo()
      .then(data => { setInfo(data); setError(null) })
      .catch(err => { setError(err.message || 'Failed to fetch'); setInfo(null) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchInfo()
    const id = setInterval(fetchInfo, 30000)
    return () => clearInterval(id)
  }, [])

  const handleClear = () => {
    setClearing(true)
    deleteBotHistory()
      .then(() => setConfirm(false))
      .catch(() => {})
      .finally(() => setClearing(false))
  }

  const handleTest = () => {
    setTesting(true)
    setTestMsg(null)
    sendMessage('test')
      .then(() => setTestMsg('ok'))
      .catch(() => setTestMsg('err'))
      .finally(() => {
        setTesting(false)
        setTimeout(() => setTestMsg(null), 3000)
      })
  }

  return (
    <div className="card">
      <div className="card-title">Bot Status</div>
      {loading && <span className="loading">Loading...</span>}
      {!loading && error && (
        <div className="bot-info">
          <span className="badge badge-error">Error</span>
          <span className="bot-detail">{error}</span>
        </div>
      )}
      {!loading && info && (
        <div className="bot-info">
          <span className="badge badge-ok">Online</span>
        </div>
      )}
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={handleTest} disabled={testing}>
          {testing ? 'Sending...' : 'Send Test'}
        </button>
        {testMsg === 'ok' && <span className="inline-msg success">Sent!</span>}
        {testMsg === 'err' && <span className="inline-msg error">Failed</span>}
        {!confirm
          ? <button className="btn btn-danger" onClick={() => setConfirm(true)}>Clear Chat History</button>
          : <span className="toggle-row">
              <span style={{ color: '#f87171' }}>Delete all messages with the bot?</span>
              <button className="btn btn-danger" onClick={handleClear} disabled={clearing}>
                {clearing ? 'Clearing...' : 'Yes, delete'}
              </button>
              <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
            </span>
        }
      </div>
    </div>
  )
}

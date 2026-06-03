import React, { useState, useEffect, useRef } from 'react'
import { getBotInfo, getUpdates, sendMessage, getUserStatus, sendCode, verifyCode, getGroups, getConfig, saveConfig, deleteBotHistory } from './api.js'

function BotStatus() {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  const fetch = () => {
    getBotInfo()
      .then(data => { setInfo(data); setError(null) })
      .catch(err => { setError(err.message || 'Failed to fetch'); setInfo(null) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch()
    const id = setInterval(fetch, 30000)
    return () => clearInterval(id)
  }, [])

  const handleClear = () => {
    setClearing(true)
    deleteBotHistory()
      .then(() => setConfirm(false))
      .catch(() => {})
      .finally(() => setClearing(false))
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
          <span className="bot-detail">
            Username: <span>@{info.username}</span>
          </span>
          <span className="bot-detail">
            ID: <span>{info.id}</span>
          </span>
        </div>
      )}
      <div style={{ marginTop: '1rem' }}>
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

function RecentMessages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = () => {
      getUpdates()
        .then(data => { setMessages((data.messages || []).slice(-10).reverse()); setLoading(false) })
        .catch(() => setLoading(false))
    }
    fetch()
    const id = setInterval(fetch, 5000)
    return () => clearInterval(id)
  }, [])

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts * 1000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="card">
      <div className="card-title">Recent Messages</div>
      {loading && <span className="loading">Loading...</span>}
      {!loading && messages.length === 0 && (
        <div className="empty-state">No messages yet</div>
      )}
      {!loading && messages.length > 0 && (
        <div className="messages-list">
          {messages.map((msg, i) => {
            const from = msg.from
            const name = from
              ? (from.username ? `@${from.username}` : [from.first_name, from.last_name].filter(Boolean).join(' '))
              : 'Unknown'
            return (
              <div className="message-item" key={msg.message_id ?? i}>
                <div className="message-header">
                  <span className="message-from">{name}</span>
                  <span className="message-time">{formatTime(msg.date)}</span>
                </div>
                <div className="message-text">{msg.text || '[non-text message]'}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SendMessageForm() {
  const [chatId, setChatId] = useState('')
  const [text, setText] = useState('')
  const [status, setStatus] = useState(null)
  const [sending, setSending] = useState(false)
  const timerRef = useRef(null)

  const showStatus = (type, msg) => {
    setStatus({ type, msg })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setStatus(null), 3000)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!chatId.trim() || !text.trim()) return
    setSending(true)
    sendMessage(chatId.trim(), text.trim())
      .then(() => { showStatus('success', 'Sent!'); setText('') })
      .catch(err => showStatus('error', err.response?.data?.detail || err.message || 'Send failed'))
      .finally(() => setSending(false))
  }

  return (
    <div className="card">
      <div className="card-title">Send Message</div>
      <form onSubmit={handleSubmit} className="form-row">
        <div className="form-field">
          <label>Chat ID</label>
          <input
            type="text"
            placeholder="e.g. 123456789"
            value={chatId}
            onChange={e => setChatId(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Message</label>
          <textarea
            placeholder="Type your message..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>
        <button className="btn" type="submit" disabled={sending}>
          {sending ? 'Sending...' : 'Send'}
        </button>
        {status && (
          <span className={`inline-msg ${status.type}`}>{status.msg}</span>
        )}
      </form>
    </div>
  )
}

function Monitor() {
  const [authStep, setAuthStep] = useState('checking')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [groups, setGroups] = useState([])
  const [cfg, setCfg] = useState({ monitored_groups: [], keywords: [], destination: '', active: false })
  const [newKeyword, setNewKeyword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadGroupsAndConfig = () => {
    Promise.all([getGroups(), getConfig()])
      .then(([g, c]) => { setGroups(g); setCfg(c) })
      .catch(err => setError(err.message || 'Failed to load'))
  }

  useEffect(() => {
    getUserStatus()
      .then(data => {
        if (data.authorized) {
          setAuthStep('authorized')
          loadGroupsAndConfig()
        } else {
          setAuthStep('phone')
        }
      })
      .catch(() => setAuthStep('phone'))
  }, [])

  const handleSendCode = (e) => {
    e.preventDefault()
    setError('')
    sendCode(phone)
      .then(() => setAuthStep('code'))
      .catch(err => setError(err.response?.data?.detail || err.message || 'Failed to send code'))
  }

  const handleVerify = (e) => {
    e.preventDefault()
    setError('')
    verifyCode(phone, code, password)
      .then(() => {
        setAuthStep('authorized')
        loadGroupsAndConfig()
      })
      .catch(err => setError(err.response?.data?.detail || err.message || 'Verification failed'))
  }

  const persist = (updated) => {
    setCfg(updated)
    setSaving(true)
    saveConfig(updated).finally(() => setSaving(false))
  }

  const toggleGroup = (id) => {
    const has = cfg.monitored_groups.includes(id)
    const updated = { ...cfg, monitored_groups: has ? cfg.monitored_groups.filter(x => x !== id) : [...cfg.monitored_groups, id] }
    persist(updated)
  }

  const removeKeyword = (kw) => {
    persist({ ...cfg, keywords: cfg.keywords.filter(k => k !== kw) })
  }

  const addKeyword = () => {
    const kw = newKeyword.trim()
    if (!kw || cfg.keywords.includes(kw)) return
    persist({ ...cfg, keywords: [...cfg.keywords, kw] })
    setNewKeyword('')
  }

  if (authStep === 'checking') {
    return (
      <div className="card">
        <div className="card-title">Monitor</div>
        <span className="loading">Checking auth...</span>
      </div>
    )
  }

  if (authStep === 'phone') {
    return (
      <div className="card">
        <div className="card-title">Monitor — Sign In</div>
        {error && <span className="inline-msg error">{error}</span>}
        <form onSubmit={handleSendCode} className="form-row">
          <div className="form-field">
            <label>Phone Number</label>
            <input type="text" placeholder="+1234567890" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <button className="btn" type="submit">Send Code</button>
        </form>
      </div>
    )
  }

  if (authStep === 'code') {
    return (
      <div className="card">
        <div className="card-title">Monitor — Verify</div>
        {error && <span className="inline-msg error">{error}</span>}
        <form onSubmit={handleVerify} className="form-row">
          <div className="form-field">
            <label>Code</label>
            <input type="text" placeholder="12345" value={code} onChange={e => setCode(e.target.value)} />
          </div>
          <div className="form-field">
            <label>2FA Password (if enabled)</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn" type="submit">Verify</button>
        </form>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title">Monitor {saving && <span className="loading" style={{ marginLeft: '0.5rem' }}>Saving...</span>}</div>
      {error && <span className="inline-msg error">{error}</span>}

      <div className="monitor-section">
        <div className="monitor-section-title">Groups</div>
        {groups.map(group => (
          <div className="group-item" key={group.id}>
            <input
              type="checkbox"
              checked={cfg.monitored_groups.includes(group.id)}
              onChange={() => toggleGroup(group.id)}
            />
            <span>{group.name || group.title}</span>
            <span className={group.type === 'channel' ? 'badge-channel' : 'badge-group'}>{group.type}</span>
          </div>
        ))}
      </div>

      <div className="monitor-section">
        <div className="monitor-section-title">Keywords</div>
        <div className="keyword-list">
          {cfg.keywords.map(kw => (
            <span className="keyword-tag" key={kw}>
              {kw}
              <button onClick={() => removeKeyword(kw)}>&times;</button>
            </span>
          ))}
        </div>
        <div className="form-row" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <div className="form-field" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="New keyword"
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            />
          </div>
          <button className="btn" type="button" onClick={addKeyword}>Add</button>
        </div>
      </div>

      <div className="monitor-section">
        <div className="monitor-section-title">Destination</div>
        <div className="form-field">
          <input
            type="text"
            placeholder="Chat ID or @username"
            value={cfg.destination}
            onChange={e => setCfg({ ...cfg, destination: e.target.value })}
            onBlur={() => persist(cfg)}
          />
        </div>
      </div>

      <div className="monitor-section">
        <div className="monitor-section-title">Status</div>
        <div className="toggle-row">
          <input
            type="checkbox"
            checked={cfg.active}
            onChange={e => persist({ ...cfg, active: e.target.checked })}
          />
          <span>Active</span>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="container">
      <h1>Telegram Bot Dashboard</h1>
      <BotStatus />
      <RecentMessages />
      <SendMessageForm />
      <Monitor />
    </div>
  )
}

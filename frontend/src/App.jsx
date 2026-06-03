import React, { useState, useEffect, useRef } from 'react'
import { getBotInfo, getUpdates, sendMessage } from './api.js'

function BotStatus() {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

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

export default function App() {
  return (
    <div className="container">
      <h1>Telegram Bot Dashboard</h1>
      <BotStatus />
      <RecentMessages />
      <SendMessageForm />
    </div>
  )
}

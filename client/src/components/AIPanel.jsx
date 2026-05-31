import { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { api } from '../lib/api';

// Simple markdown → HTML (bold, italic, line breaks, bullet lists)
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic *text*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet list lines starting with "- "
    .replace(/(^|\n)(- .+)/g, (_, pre, item) => `${pre}<li>${item.slice(2)}</li>`)
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]*?<\/li>)(?=\s*<li>|$)/g, m => m)
    // Line breaks (but not inside list items)
    .replace(/\n/g, '<br />');
  // Wrap list items in <ul>
  html = html.replace(/(<li>.*?<\/li>(<br \/>)?)+/g, match =>
    `<ul style="margin:.3rem 0 .3rem 1.2rem;padding:0;">${match.replace(/<br \/>/g, '')}</ul>`
  );
  return html;
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`ai-msg ${isUser ? 'ai-msg-user' : 'ai-msg-awa'}`}>
      {!isUser && (
        <div className="ai-msg-avatar">
          <Icon name="sparkles" size={12} />
        </div>
      )}
      {isUser
        ? <div className="ai-msg-bubble">{msg.content}</div>
        : <div className="ai-msg-bubble" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
      }
    </div>
  );
}

export default function AIPanel({ open, onClose, user }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Bonjour${user?.first_name ? ` ${user.first_name}` : ''} ! Je suis Awa, votre assistante IA. Comment puis-je vous aider aujourd'hui ?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await api.post('/awa/chat', {
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        userRole: user?.role,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.content }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Désolée, une erreur est survenue. Veuillez réessayer.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {open && <div className="ai-panel-backdrop" onClick={onClose} />}
      <div className={`ai-panel ${open ? 'open' : ''}`}>
        <div className="ai-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg,#2ec472,#22a05e)',
              display: 'grid', placeItems: 'center', color: '#fff',
            }}>
              <Icon name="sparkles" size={13} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Awa AI</div>
              <div style={{ fontSize: 11, color: 'var(--green)' }}>● En ligne</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>

        <div className="ai-panel-messages">
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && (
            <div className="ai-msg ai-msg-awa">
              <div className="ai-msg-avatar"><Icon name="sparkles" size={12} /></div>
              <div className="ai-msg-bubble ai-typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="ai-panel-input">
          <textarea
            className="ai-input-field"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Posez votre question à Awa…"
            rows={1}
          />
          <button
            className="ai-send-btn"
            onClick={send}
            disabled={!input.trim() || loading}
          >
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

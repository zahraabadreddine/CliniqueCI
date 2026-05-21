// ─── Awa — Assistant IA contextuel pour CliniqueCI ───
// Utilise window.claude.complete pour des réponses réelles, avec
// system prompts adaptés au rôle et au contexte courant.

function buildSystemPrompt(role, ctx) {
  const base = `Tu es Awa, l'assistant IA intégré dans CliniqueCI, un logiciel de gestion pour les cliniques privées d'Abidjan, en Côte d'Ivoire.
Tu réponds toujours en français, de manière concise, professionnelle et chaleureuse.
Tes réponses sont courtes (3 à 6 phrases max). N'utilise pas de markdown lourd, garde des listes simples avec des tirets.
N'invente JAMAIS de données médicales ; quand tu manques d'info, dis-le clairement.
Tu n'es pas un médecin et tu ne poses pas de diagnostic définitif — tu donnes des pistes et tu rappelles l'importance de la consultation.`;

  if (role === 'medecin') {
    return base + `

Tu assistes le médecin (${ctx?.userName || 'Dr.'}). Tu peux :
- Résumer un dossier patient en quelques lignes,
- Suggérer des questions à poser pendant la consultation,
- Proposer des hypothèses différentielles à partir de symptômes,
- Aider à rédiger un plan de prise en charge ou une ordonnance type (à valider par le médecin),
- Repérer des interactions médicamenteuses connues.
Termine toujours par une note de prudence brève si tu donnes une orientation clinique.`;
  }
  if (role === 'secretaire') {
    return base + `

Tu assistes la secrétaire (${ctx?.userName || 'Rana'}). Tu peux :
- Aider à organiser le planning et trouver le meilleur créneau,
- Rédiger un message WhatsApp/SMS de rappel ou de confirmation court (max 320 caractères),
- Expliquer une procédure simple à un patient au téléphone,
- Détecter des doubles réservations.`;
  }
  // patient
  return base + `

Tu assistes un patient. Tu peux :
- Aider à comprendre des symptômes (sans diagnostiquer),
- Indiquer si une consultation semble urgente, courante, ou non urgente,
- Expliquer une ordonnance ou une posologie en mots simples,
- Aider à choisir le bon type de médecin (généraliste, pédiatre, etc.),
- Rappeler quoi apporter à la consultation.
Si le patient décrit un signe d'urgence (douleur thoracique forte, perte de connaissance, hémorragie, signes d'AVC...), dis-lui d'appeler immédiatement le 185 (SAMU) ou de se rendre aux urgences.`;
}

function defaultSuggestions(role, ctx) {
  if (role === 'medecin') {
    if (ctx?.patientName) {
      return [
        `Résume le dossier de ${ctx.patientName} en 3 lignes`,
        `Quelles questions poser pour "${ctx.reason || 'cette consultation'}" ?`,
        `Y a-t-il une interaction entre les médicaments actuels ?`,
        `Propose un plan de prise en charge`,
      ];
    }
    return [
      'Résume ma journée et patients prioritaires',
      'Quels patients ont un suivi en retard ?',
      'Donne-moi 3 hypothèses pour des céphalées + fièvre',
      'Rappelle-moi les contre-indications de la Metformine',
    ];
  }
  if (role === 'secretaire') {
    return [
      'Rédige un SMS de rappel pour les RDV de demain',
      'Quel est le créneau le moins chargé cette semaine ?',
      'Comment expliquer un retard à un patient ?',
      'Détecte des doubles réservations aujourd\'hui',
    ];
  }
  return [
    'J\'ai des maux de tête depuis 2 jours, dois-je consulter ?',
    'Comment se préparer pour une consultation ?',
    'Quel médecin pour mon enfant de 3 ans ?',
    'Expliquer ma dernière ordonnance simplement',
  ];
}

function summarizeContext(role, ctx, store) {
  if (!ctx) return '';
  const parts = [];
  if (role === 'medecin') {
    if (ctx.patientId) {
      const p = store.patients.find(x => x.id === ctx.patientId);
      if (p) {
        parts.push(`Patient en consultation : ${p.firstName} ${p.lastName}, ${p.age} ans, groupe ${p.bloodType}.`);
        if (p.allergies?.length) parts.push(`Allergies : ${p.allergies.join(', ')}.`);
        if (p.chronic?.length) parts.push(`Antécédents chroniques : ${p.chronic.join(', ')}.`);
        const rx = store.prescriptions.filter(r => r.patientId === p.id && r.status === 'active');
        if (rx.length) {
          const meds = rx.flatMap(r => r.items.map(i => i.med));
          parts.push(`Traitements en cours : ${meds.join('; ')}.`);
        }
        if (ctx.reason) parts.push(`Motif de visite : ${ctx.reason}.`);
      }
    } else {
      const today = window.CCI.todayStr;
      const todays = store.appointments.filter(a => a.date === today);
      parts.push(`Aujourd'hui : ${todays.length} RDV planifiés, dont ${todays.filter(a => a.status === 'waiting').length} en salle d'attente.`);
    }
  } else if (role === 'secretaire') {
    const today = window.CCI.todayStr;
    const todays = store.appointments.filter(a => a.date === today);
    parts.push(`Aujourd'hui : ${todays.length} RDV au planning, ${todays.filter(a => a.status === 'confirmed').length} confirmés, ${todays.filter(a => a.status === 'waiting').length} en attente d'accueil.`);
  } else if (role === 'patient' && ctx.patientId) {
    const p = store.patients.find(x => x.id === ctx.patientId);
    if (p) {
      parts.push(`Tu parles avec ${p.firstName}, ${p.age} ans.`);
      if (p.allergies?.length) parts.push(`Allergies connues : ${p.allergies.join(', ')}.`);
    }
  }
  return parts.length ? 'Contexte actuel: ' + parts.join(' ') : '';
}

const WELCOME = {
  medecin: "Bonjour Docteur. Je suis Awa, votre assistant. Je peux vous aider à analyser un dossier, préparer une ordonnance ou résumer votre journée. Que souhaitez-vous ?",
  secretaire: "Bonjour Rana ! Je suis Awa. Je peux rédiger des SMS de rappel, organiser le planning, ou repérer des conflits de RDV. Comment puis-je aider ?",
  patient: "Bonjour, je suis Awa, votre assistant santé. Posez-moi vos questions sur vos symptômes, votre ordonnance ou la prise de RDV. Attention : je ne remplace pas une consultation médicale.",
};

function AIAgentPanel({ open, onClose, role, context, currentUser }) {
  const store = useStore();
  const [messages, setMessages] = useState([
    { id: 'welcome', from: 'ai', text: WELCOME[role] || WELCOME.patient },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef(null);

  // Reset welcome when role changes
  useEffect(() => {
    setMessages([{ id: 'welcome', from: 'ai', text: WELCOME[role] || WELCOME.patient }]);
  }, [role]);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const suggestions = useMemo(() => defaultSuggestions(role, context), [role, context]);

  async function ask(text) {
    if (!text.trim() || loading) return;
    const userMsg = { id: 'u-' + Date.now(), from: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const sys = buildSystemPrompt(role, { userName: currentUser?.firstName, ...context });
    const ctxSummary = summarizeContext(role, context, store);

    // Build conversational history (last 8 turns) as messages array
    const history = messages.slice(-8).filter(m => m.id !== 'welcome').map(m => ({
      role: m.from === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    const fullMessages = [
      ...history,
      { role: 'user', content: ctxSummary ? `${ctxSummary}\n\nQuestion : ${text.trim()}` : text.trim() },
    ];

    try {
      const reply = await window.claude.complete({
        system: sys,
        messages: fullMessages,
      });
      setMessages(prev => [...prev, { id: 'a-' + Date.now(), from: 'ai', text: reply || '…' }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: 'e-' + Date.now(), from: 'ai',
        text: "Désolé, je n'ai pas pu obtenir de réponse. Réessayez dans un instant.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([{ id: 'welcome', from: 'ai', text: WELCOME[role] || WELCOME.patient }]);
  }

  return (
    <aside className={`ai-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="ai-header">
        <div className="ai-avatar">A</div>
        <div>
          <div className="ai-title">Awa <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11 }}>· assistant IA</span></div>
          <div className="ai-subtitle">en ligne · contexte {role}</div>
        </div>
        <div className="ai-close row" style={{ gap: 4 }}>
          <button className="icon-btn" onClick={clearChat} title="Nouvelle conversation"><Icon name="refresh" size={16}/></button>
          <button className="icon-btn" onClick={onClose}><Icon name="close"/></button>
        </div>
      </div>

      <div className="ai-messages" ref={scrollerRef}>
        {context?.patientId && (
          <div className="ai-msg system">
            <Icon name="info" size={11} style={{ verticalAlign: '-2px' }}/>
            {' '}contexte : {(() => {
              const p = store.patients.find(x => x.id === context.patientId);
              return p ? `${p.firstName} ${p.lastName}` : context.patientId;
            })()}
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`ai-msg ${m.from}`}>{m.text}</div>
        ))}
        {loading && (
          <div className="ai-msg ai loading"><span/><span/><span/></div>
        )}
      </div>

      {!loading && messages.length <= 2 && (
        <div className="ai-suggestions">
          {suggestions.slice(0, 4).map((s, i) => (
            <button key={i} className="ai-suggestion" onClick={() => ask(s)}>
              <Icon name="sparkles" size={11} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--green)' }}/>
              {s}
            </button>
          ))}
        </div>
      )}

      <form className="ai-input" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <input
          type="text"
          placeholder={role === 'patient' ? "Posez votre question…" : "Demandez à Awa…"}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          <Icon name="send" size={15}/>
        </button>
      </form>
    </aside>
  );
}

// Floating trigger button
function AITriggerButton({ onClick, label = "Demander à Awa" }) {
  return (
    <button className="ai-trigger-btn" onClick={onClick}>
      <span className="ai-mark"><Icon name="sparkles" size={12}/></span>
      <span>{label}</span>
    </button>
  );
}

Object.assign(window, { AIAgentPanel, AITriggerButton });

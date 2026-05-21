// ─── Login / Role selection ───

function LoginScreen({ onLogin }) {
  const roles = [
    {
      id: 'medecin',
      label: 'Dr. Aminata Koné',
      sub: 'Médecin · Médecine générale',
      avatarBg: 'green',
      emoji: '👩‍⚕️',
      user: { id: 'med-1', firstName: 'Aminata', lastName: 'Koné', role: 'medecin', initials: 'AK', color: '#0d7a5f' },
    },
    {
      id: 'secretaire',
      label: 'Rana Touré',
      sub: 'Secrétaire médicale',
      avatarBg: 'gold',
      emoji: '👩‍💼',
      user: { id: 'sec-1', firstName: 'Rana', lastName: 'Touré', role: 'secretaire', initials: 'RT', color: '#c8a84b' },
    },
    {
      id: 'patient',
      label: 'Karim Meïté',
      sub: 'Patient · 31 ans',
      avatarBg: 'blue',
      emoji: '🧑',
      user: { id: 'pat-1', firstName: 'Karim', lastName: 'Meïté', role: 'patient', initials: 'KM', color: '#2f6bd6' },
    },
  ];

  return (
    <div className="login-screen">
      <div className="login-left">
        <div>
          <div className="brand-mark" style={{ width: 36, height: 36, marginBottom: '1rem', background: 'var(--green-light)' }}>C</div>
          <div className="login-brand">Clinique<em>CI</em></div>
          <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, marginTop: '.25rem', letterSpacing: '.05em' }}>
            La gestion clinique, simple comme un message.
          </div>
        </div>
        <div>
          <div className="login-quote">
            «&nbsp;Si une pizzeria peut me donner un créneau en ligne à minuit, pourquoi pas mon médecin ?&nbsp;»
          </div>
          <div className="login-quote-attr">Karim, 31 ans · Entretien terrain · Mai 2026</div>
        </div>
        <div className="login-foot">
          Cohorte Juin 2026 · Abidjan · Côte d'Ivoire
        </div>
      </div>

      <div className="login-right">
        <h1>Bienvenue.</h1>
        <p>Sélectionnez un profil pour explorer l'application dans le rôle correspondant. Le prototype inclut l'assistant IA <strong style={{ color: 'var(--green)' }}>Awa</strong>.</p>
        <div className="role-cards">
          {roles.map(r => (
            <button key={r.id} className="role-card" onClick={() => onLogin(r.user)}>
              <div className={`role-avatar ${r.avatarBg}`}>{r.emoji}</div>
              <div>
                <div className="role-name">{r.label}</div>
                <div className="role-sub">{r.sub}</div>
              </div>
              <div className="role-arrow"><Icon name="arrow" size={18}/></div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', background: '#fff', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
          <Icon name="shield" size={18} color="var(--green)"/>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--ink)' }}>Multi-tenant sécurisé.</strong> Chaque clinique a son espace isolé. Les données patients ne se mélangent jamais entre cabinets.
          </div>
        </div>

        <button
          onClick={() => window.CCI.reset()}
          style={{
            marginTop: '1rem', alignSelf: 'flex-start',
            color: 'var(--muted)', fontSize: 11, padding: '.35rem 0',
          }}
        >
          ↻ Réinitialiser les données de démo
        </button>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;

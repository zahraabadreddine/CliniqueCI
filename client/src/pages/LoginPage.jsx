import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';
import Logo from '../components/Logo';

/* ─── Demo credentials ──────────────────────────────────────────────────── */
const DEMOS = [
  { id: 'admin',     label: 'Admin',      emoji: '🏥', email: 'admin@clinique-plateau.ci',      password: 'Password123!' },
  { id: 'doctor',    label: 'Médecin',    emoji: '👩‍⚕️', email: 'dr.kone@clinique-plateau.ci',    password: 'Password123!' },
  { id: 'secretary', label: 'Secrétaire', emoji: '👩‍💼', email: 'secretaire@clinique-plateau.ci', password: 'Password123!' },
  { id: 'patient',   label: 'Patient',    emoji: '🧑',  email: 'karim.meite@email.ci',           password: 'Password123!' },
];

/* ─── Background floating medical icons ────────────────────────────────── */
const BG_ICONS = [
  { type: 'cross', top: '7%',  left: '5%',  size: 58, color: '#d4a017', opacity: .10, anim: 'lnFloat',  dur: 18, delay: 0   },
  { type: 'heart', top: '5%',  left: '82%', size: 48, color: '#c8732a', opacity: .12, anim: 'lnFloat2', dur: 22, delay: 1.4 },
  { type: 'ecg',   top: '74%', left: '68%', size: 78, color: '#2d8a52', opacity: .10, anim: 'lnFloat',  dur: 20, delay: 2   },
  { type: 'cross', top: '70%', left: '9%',  size: 44, color: '#d4a017', opacity: .09, anim: 'lnFloat2', dur: 16, delay: 0.8 },
  { type: 'pill',  top: '42%', left: '91%', size: 52, color: '#c8732a', opacity: .11, anim: 'lnFloat',  dur: 24, delay: 3   },
  { type: 'heart', top: '44%', left: '2%',  size: 54, color: '#2d8a52', opacity: .08, anim: 'lnFloat2', dur: 19, delay: 1   },
  { type: 'drop',  top: '9%',  left: '60%', size: 36, color: '#d4a017', opacity: .11, anim: 'lnFloat',  dur: 21, delay: 2.5 },
  { type: 'ecg',   top: '85%', left: '21%', size: 68, color: '#c8732a', opacity: .08, anim: 'lnFloat2', dur: 23, delay: 0.5 },
  { type: 'drop',  top: '19%', left: '91%', size: 38, color: '#d4a017', opacity: .10, anim: 'lnFloat',  dur: 17, delay: 0.3 },
  { type: 'cross', top: '4%',  left: '47%', size: 32, color: '#2d8a52', opacity: .09, anim: 'lnFloat2', dur: 25, delay: 1.8 },
  { type: 'pill',  top: '88%', left: '52%', size: 44, color: '#d4a017', opacity: .08, anim: 'lnFloat',  dur: 20, delay: 1.2 },
  { type: 'heart', top: '58%', left: '87%', size: 42, color: '#d4a017', opacity: .09, anim: 'lnFloat2', dur: 18, delay: 2.8 },
];

/* ─── CSS ───────────────────────────────────────────────────────────────── */
const CSS = `
  html, body { background: #071409 !important; margin: 0; padding: 0; }

  @keyframes lnFadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lnSpin { to { transform: rotate(360deg); } }
  @keyframes lnShake {
    0%,100% { transform: translateX(0); }
    20%,60% { transform: translateX(-5px); }
    40%,80% { transform: translateX(5px); }
  }
  @keyframes lnFloat {
    0%,100% { transform: translate(0,  0px); }
    50%     { transform: translate(5px, -12px); }
  }
  @keyframes lnFloat2 {
    0%,100% { transform: translate(0,  0px); }
    50%     { transform: translate(-7px, 10px); }
  }
  @keyframes lnPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(26,92,56,.4); }
    50%     { box-shadow: 0 0 0 8px rgba(26,92,56,0); }
  }

  /* ── Inputs ── */
  .ln-input {
    width: 100%; box-sizing: border-box;
    background: #faf5ec;
    border: 1.5px solid #e2cdb4;
    border-radius: 11px;
    color: #1a1208;
    padding: .8rem 1.05rem;
    font-size: .93rem;
    font-family: 'DM Sans', system-ui, sans-serif;
    outline: none;
    transition: border-color .2s, box-shadow .2s, background .2s;
  }
  .ln-input::placeholder { color: #b8a080; }
  .ln-input:focus {
    border-color: #c8732a;
    background: #fffaf3;
    box-shadow: 0 0 0 3.5px rgba(200,115,42,.15);
  }
  .ln-input:-webkit-autofill,
  .ln-input:-webkit-autofill:hover,
  .ln-input:-webkit-autofill:focus {
    -webkit-text-fill-color: #1a1208;
    -webkit-box-shadow: 0 0 0 1000px #faf5ec inset;
    transition: background-color 9999s ease-in-out 0s;
  }

  /* ── Pills (light card context) ── */
  .ln-pill {
    display: flex; flex-direction: column; align-items: center;
    gap: .35rem;
    background: rgba(26,92,56,.05);
    border: 1.5px solid rgba(26,92,56,.15);
    border-radius: 13px;
    padding: .65rem .3rem;
    cursor: pointer; flex: 1; min-width: 0;
    transition: all .2s cubic-bezier(.22,1,.36,1);
  }
  .ln-pill:hover:not(:disabled) {
    background: rgba(26,92,56,.1);
    border-color: rgba(26,92,56,.35);
    transform: translateY(-2px);
    box-shadow: 0 5px 18px rgba(26,92,56,.15);
  }
  .ln-pill.active {
    background: rgba(26,92,56,.12);
    border-color: rgba(26,92,56,.45);
    box-shadow: 0 0 0 3px rgba(26,92,56,.1);
  }
  .ln-pill:disabled { opacity: .4; cursor: not-allowed; transform: none !important; }

  /* ── Submit ── */
  .ln-submit {
    width: 100%; padding: .94rem;
    background: linear-gradient(135deg, #1a5c38 0%, #2d8a52 100%);
    border: none; border-radius: 12px;
    color: #fff; font-weight: 700; font-size: .96rem;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: .55rem;
    box-shadow: 0 4px 22px rgba(26,92,56,.45);
    transition: all .2s cubic-bezier(.22,1,.36,1);
    font-family: 'DM Sans', inherit; letter-spacing: .015em;
  }
  .ln-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 30px rgba(26,92,56,.55);
    background: linear-gradient(135deg, #1f6e42 0%, #38a060 100%);
  }
  .ln-submit:disabled { opacity: .45; cursor: not-allowed; }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .ln-card { padding: 2rem 1.4rem 2.4rem !important; }
    .ln-demos { gap: .35rem !important; }
  }
`;

/* ─── SVG medical icon renderer ────────────────────────────────────────── */
function MedIcon({ type, size, color }) {
  const c = color || 'currentColor';
  if (type === 'cross') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
      <path d="M9 0h6v9h9v6h-9v9H9v-9H0V9h9z"/>
    </svg>
  );
  if (type === 'heart') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
      <path d="M12 21S3 14.5 3 8.5A5.5 5.5 0 0 1 12 4.257 5.5 5.5 0 0 1 21 8.5C21 14.5 12 21 12 21z"/>
    </svg>
  );
  if (type === 'ecg') return (
    <svg width={size} height={size * .38} viewBox="0 0 50 19" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="0,9.5 8,9.5 12,1.5 16,17.5 20,9.5 28,9.5 31,5 34,14 37,9.5 50,9.5"/>
    </svg>
  );
  if (type === 'pill') return (
    <svg width={size} height={size * .48} viewBox="0 0 36 17" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round">
      <rect x="1" y="1" width="34" height="15" rx="7.5"/>
      <line x1="18" y1="1" x2="18" y2="16"/>
    </svg>
  );
  if (type === 'drop') return (
    <svg width={size * .75} height={size} viewBox="0 0 18 24" fill={c}>
      <path d="M9 1C9 1 1 11.5 1 16.5a8 8 0 0 0 16 0C17 11.5 9 1 9 1z"/>
    </svg>
  );
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   LoginPage
══════════════════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();
  const { login }  = useContext(AuthContext);
  const navigate   = useNavigate();
  const [serverError, setServerError] = useState('');
  const [activeRole,  setActiveRole]  = useState(null);

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const res  = await api.post('/auth/login', data);
      login(res.user);
      const role = res.user?.role;
      if (role === 'doctor')         navigate('/doctor-home');
      else if (role === 'secretary') navigate('/secretary-home');
      else if (role === 'patient')   navigate('/patient');
      else                           navigate('/dashboard');
    } catch (err) {
      setServerError(err?.error || 'Email ou mot de passe incorrect');
    }
  };

  const handleDemo = (d) => {
    setActiveRole(d.id);
    setValue('email',    d.email);
    setValue('password', d.password);
    setTimeout(() => handleSubmit(onSubmit)(), 120);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(150deg, #071409 0%, #0d2010 30%, #1e0d05 65%, #091308 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1rem',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{CSS}</style>

      {/* ── Ambient radial glow behind card ── */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(45,138,82,.14) 0%, transparent 65%)',
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute',
        top: '30%', left: '20%',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(212,160,23,.08) 0%, transparent 65%)',
        pointerEvents: 'none',
        animation: 'lnFloat 22s ease-in-out infinite',
      }}/>
      <div style={{
        position: 'absolute',
        top: '60%', left: '70%',
        width: 350, height: 350,
        background: 'radial-gradient(circle, rgba(200,115,42,.08) 0%, transparent 65%)',
        pointerEvents: 'none',
        animation: 'lnFloat2 26s ease-in-out infinite',
      }}/>

      {/* ── Floating medical icons ── */}
      {BG_ICONS.map((ic, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: ic.top, left: ic.left,
          opacity: ic.opacity,
          animation: `${ic.anim} ${ic.dur}s ease-in-out infinite ${ic.delay}s`,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          <MedIcon type={ic.type} size={ic.size} color={ic.color}/>
        </div>
      ))}

      {/* ── Back button ── */}
      <BackButton onClick={() => navigate('/')}/>

      {/* ══════════════════════════ CARD ══════════════════════════════════ */}
      <div
        className="ln-card"
        style={{
          position: 'relative', zIndex: 1,
          background: '#fffcf5',
          borderRadius: 22,
          padding: '2.6rem 2.8rem 3rem',
          width: '100%',
          maxWidth: 445,
          boxShadow:
            '0 2px 4px rgba(0,0,0,.04), ' +
            '0 12px 40px rgba(0,0,0,.35), ' +
            '0 32px 80px rgba(0,0,0,.4), ' +
            '0 0 0 1px rgba(212,160,23,.16)',
          animation: 'lnFadeUp .55s cubic-bezier(.22,1,.36,1) both',
        }}
      >
        {/* ── Gold accent top bar ── */}
        <div style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: 3,
          background: 'linear-gradient(90deg, transparent, #d4a017, #c8732a, #d4a017, transparent)',
          borderRadius: '0 0 4px 4px',
          opacity: .75,
        }}/>

        {/* ── Logo ── */}
        <div style={{ marginBottom: '1.8rem', animation: 'lnFadeUp .4s .05s both' }}>
          <Logo size={36} textColor="#1a1208" textSize="1.25rem" dimCI={true}/>
        </div>

        {/* ── Heading ── */}
        <div style={{ marginBottom: '2rem', animation: 'lnFadeUp .4s .08s both' }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.85rem', fontWeight: 800,
            color: '#1a1208', margin: '0 0 .35rem',
            letterSpacing: '-.025em', lineHeight: 1.15,
          }}>
            Connexion
          </h2>
          <p style={{ fontSize: 13.5, color: '#8c7060', margin: 0, lineHeight: 1.5 }}>
            Accédez à votre espace de travail
          </p>
        </div>

        {/* ── Demo pills ── */}
        <div style={{ marginBottom: '1.8rem', animation: 'lnFadeUp .4s .11s both' }}>
          <p style={{
            fontSize: 10.5, fontWeight: 700, color: '#a08060',
            textTransform: 'uppercase', letterSpacing: '.09em',
            margin: '0 0 .72rem',
          }}>
            Accès démo
          </p>
          <div className="ln-demos" style={{ display: 'flex', gap: '.45rem' }}>
            {DEMOS.map((d, i) => (
              <button
                key={d.id}
                className={`ln-pill${activeRole === d.id ? ' active' : ''}`}
                onClick={() => handleDemo(d)}
                disabled={isSubmitting}
              >
                <span style={{ fontSize: '1.12rem', lineHeight: 1 }}>
                  {isSubmitting && activeRole === d.id ? (
                    <span style={{
                      display: 'inline-block', width: 14, height: 14,
                      borderRadius: '50%',
                      border: '2px solid rgba(26,92,56,.25)',
                      borderTopColor: '#1a5c38',
                      animation: 'lnSpin .65s linear infinite',
                    }}/>
                  ) : d.emoji}
                </span>
                <span style={{
                  fontSize: 10.5, fontWeight: 700,
                  color: '#2d6645', lineHeight: 1.2, whiteSpace: 'nowrap',
                }}>
                  {d.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '.75rem',
          marginBottom: '1.8rem',
          animation: 'lnFadeUp .4s .14s both',
        }}>
          <div style={{ flex: 1, height: 1, background: '#e8d8c4' }}/>
          <span style={{ fontSize: 11, color: '#b8a080', fontWeight: 500, whiteSpace: 'nowrap' }}>
            ou vos identifiants
          </span>
          <div style={{ flex: 1, height: 1, background: '#e8d8c4' }}/>
        </div>

        {/* ── Server error ── */}
        {serverError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.5rem',
            padding: '.65rem .9rem', marginBottom: '1rem',
            background: 'rgba(220,38,38,.06)',
            border: '1px solid rgba(220,38,38,.2)',
            borderRadius: 10, fontSize: 13, color: '#b91c1c',
            animation: 'lnShake .35s ease both',
          }}>
            <Icon name="warning" size={13} color="#b91c1c"/>
            {serverError}
          </div>
        )}

        {/* ── Form ── */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            display: 'flex', flexDirection: 'column', gap: '1.4rem',
            animation: 'lnFadeUp .4s .17s both',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <label style={{
              fontSize: 10.5, fontWeight: 700, color: '#7c5c3a',
              textTransform: 'uppercase', letterSpacing: '.07em',
            }}>
              Adresse e-mail
            </label>
            <input
              type="email"
              className="ln-input"
              placeholder="vous@clinique.ci"
              autoComplete="email"
              {...register('email', { required: 'Email requis' })}
            />
            {errors.email && (
              <span style={{ fontSize: 12, color: '#b91c1c', marginTop: 1 }}>
                {errors.email.message}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <label style={{
              fontSize: 10.5, fontWeight: 700, color: '#7c5c3a',
              textTransform: 'uppercase', letterSpacing: '.07em',
            }}>
              Mot de passe
            </label>
            <input
              type="password"
              className="ln-input"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password', { required: 'Mot de passe requis' })}
            />
            {errors.password && (
              <span style={{ fontSize: 12, color: '#b91c1c', marginTop: 1 }}>
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="ln-submit"
            disabled={isSubmitting}
            style={{ marginTop: '.3rem' }}
          >
            {isSubmitting ? (
              <>
                <span style={{
                  width: 15, height: 15, borderRadius: '50%',
                  border: '2.5px solid rgba(255,255,255,.4)',
                  borderTopColor: '#fff',
                  display: 'inline-block',
                  animation: 'lnSpin .7s linear infinite',
                }}/>
                Connexion en cours…
              </>
            ) : (
              <>
                Se connecter
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12M11 5l5 5-5 5" stroke="#fff" strokeWidth="1.9"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* ── Footer ── */}
        <div style={{
          marginTop: '1.7rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          animation: 'lnFadeUp .4s .2s both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.42rem',
            fontSize: 11.5, color: '#b8a080',
          }}>
            <Icon name="shield" size={11} color="#c8732a"/>
            <span>Connexion chiffrée</span>
          </div>
          <Link
            to="/register"
            style={{
              fontSize: 12.5, color: '#7c5c3a',
              textDecoration: 'none', fontWeight: 600,
              transition: 'color .15s',
            }}
          >
            Créer un compte →
          </Link>
        </div>

        {/* ── Bottom location badge ── */}
        <div style={{
          marginTop: '1.8rem', paddingTop: '1.5rem',
          borderTop: '1px solid #e8d8c4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '.5rem',
          animation: 'lnFadeUp .4s .22s both',
        }}>
          <span style={{ fontSize: 9.5, color: '#c8a87a', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 600 }}>
            🇨🇮 &nbsp;Abidjan · Côte d'Ivoire
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Back button ────────────────────────────────────────────────────────── */
function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed', top: '1.1rem', left: '1.1rem', zIndex: 200,
        display: 'inline-flex', alignItems: 'center', gap: '.42rem',
        background: 'rgba(255,252,240,.07)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(212,160,23,.2)',
        borderRadius: 50,
        padding: '.42rem 1.05rem',
        fontSize: '.82rem', fontWeight: 600,
        color: 'rgba(255,240,200,.65)',
        cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(0,0,0,.25)',
        transition: 'all .18s cubic-bezier(.22,1,.36,1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background  = 'rgba(212,160,23,.12)';
        e.currentTarget.style.borderColor = 'rgba(212,160,23,.4)';
        e.currentTarget.style.color       = 'rgba(255,240,200,.9)';
        e.currentTarget.style.transform   = 'translateX(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background  = 'rgba(255,252,240,.07)';
        e.currentTarget.style.borderColor = 'rgba(212,160,23,.2)';
        e.currentTarget.style.color       = 'rgba(255,240,200,.65)';
        e.currentTarget.style.transform   = '';
      }}
    >
      <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
        <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Accueil
    </button>
  );
}

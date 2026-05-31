import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';
import Logo from '../components/Logo';

/* ─── Background floating medical icons ────────────────────────────────── */
const BG_ICONS = [
  { type: 'cross', top: '6%',  left: '4%',  size: 58, color: '#d4a017', opacity: .10, anim: 'rgFloat',  dur: 18, delay: 0   },
  { type: 'heart', top: '5%',  left: '83%', size: 48, color: '#c8732a', opacity: .12, anim: 'rgFloat2', dur: 22, delay: 1.4 },
  { type: 'ecg',   top: '76%', left: '69%', size: 78, color: '#2d8a52', opacity: .10, anim: 'rgFloat',  dur: 20, delay: 2   },
  { type: 'cross', top: '71%', left: '8%',  size: 44, color: '#d4a017', opacity: .09, anim: 'rgFloat2', dur: 16, delay: 0.8 },
  { type: 'pill',  top: '40%', left: '92%', size: 52, color: '#c8732a', opacity: .11, anim: 'rgFloat',  dur: 24, delay: 3   },
  { type: 'heart', top: '45%', left: '2%',  size: 54, color: '#2d8a52', opacity: .08, anim: 'rgFloat2', dur: 19, delay: 1   },
  { type: 'drop',  top: '10%', left: '61%', size: 36, color: '#d4a017', opacity: .11, anim: 'rgFloat',  dur: 21, delay: 2.5 },
  { type: 'ecg',   top: '86%', left: '22%', size: 68, color: '#c8732a', opacity: .08, anim: 'rgFloat2', dur: 23, delay: 0.5 },
  { type: 'drop',  top: '18%', left: '90%', size: 38, color: '#d4a017', opacity: .10, anim: 'rgFloat',  dur: 17, delay: 0.3 },
  { type: 'cross', top: '3%',  left: '46%', size: 32, color: '#2d8a52', opacity: .09, anim: 'rgFloat2', dur: 25, delay: 1.8 },
  { type: 'pill',  top: '89%', left: '53%', size: 44, color: '#d4a017', opacity: .08, anim: 'rgFloat',  dur: 20, delay: 1.2 },
  { type: 'heart', top: '57%', left: '88%', size: 42, color: '#d4a017', opacity: .09, anim: 'rgFloat2', dur: 18, delay: 2.8 },
];

/* ─── CSS ───────────────────────────────────────────────────────────────── */
const CSS = `
  html, body { background: #071409 !important; margin: 0; padding: 0; }

  @keyframes rgFadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rgSpin { to { transform: rotate(360deg); } }
  @keyframes rgShake {
    0%,100% { transform: translateX(0); }
    20%,60% { transform: translateX(-5px); }
    40%,80% { transform: translateX(5px); }
  }
  @keyframes rgFloat {
    0%,100% { transform: translate(0,  0px); }
    50%     { transform: translate(5px, -12px); }
  }
  @keyframes rgFloat2 {
    0%,100% { transform: translate(0,  0px); }
    50%     { transform: translate(-7px, 10px); }
  }

  /* ── Inputs ── */
  .rg-input {
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
  .rg-input::placeholder { color: #b8a080; }
  .rg-input:focus {
    border-color: #c8732a;
    background: #fffaf3;
    box-shadow: 0 0 0 3.5px rgba(200,115,42,.15);
  }
  .rg-input:-webkit-autofill,
  .rg-input:-webkit-autofill:hover,
  .rg-input:-webkit-autofill:focus {
    -webkit-text-fill-color: #1a1208;
    -webkit-box-shadow: 0 0 0 1000px #faf5ec inset;
    transition: background-color 9999s ease-in-out 0s;
  }

  /* ── Submit ── */
  .rg-submit {
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
  .rg-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 30px rgba(26,92,56,.55);
    background: linear-gradient(135deg, #1f6e42 0%, #38a060 100%);
  }
  .rg-submit:disabled { opacity: .45; cursor: not-allowed; }

  /* ── Responsive ── */
  @media (max-width: 520px) {
    .rg-card { padding: 2rem 1.4rem 2.4rem !important; }
    .rg-name-row { grid-template-columns: 1fr !important; }
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
   RegisterPage
══════════════════════════════════════════════════════════════════════════ */
export default function RegisterPage() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const { login } = useContext(AuthContext);
  const navigate  = useNavigate();
  const [serverError, setServerError] = useState('');

  const password = watch('password');

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const res = await api.post('/auth/register', data);
      login(res.user);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err?.error || "Erreur lors de l'inscription");
    }
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

      {/* ── Ambient radial glows ── */}
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
        animation: 'rgFloat 22s ease-in-out infinite',
      }}/>
      <div style={{
        position: 'absolute',
        top: '60%', left: '70%',
        width: 350, height: 350,
        background: 'radial-gradient(circle, rgba(200,115,42,.08) 0%, transparent 65%)',
        pointerEvents: 'none',
        animation: 'rgFloat2 26s ease-in-out infinite',
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
      <BackButton onClick={() => navigate('/login')}/>

      {/* ══════════════════════════ CARD ══════════════════════════════════ */}
      <div
        className="rg-card"
        style={{
          position: 'relative', zIndex: 1,
          background: '#fffcf5',
          borderRadius: 22,
          padding: '2.6rem 2.8rem 3rem',
          width: '100%',
          maxWidth: 480,
          boxShadow:
            '0 2px 4px rgba(0,0,0,.04), ' +
            '0 12px 40px rgba(0,0,0,.35), ' +
            '0 32px 80px rgba(0,0,0,.4), ' +
            '0 0 0 1px rgba(212,160,23,.16)',
          animation: 'rgFadeUp .55s cubic-bezier(.22,1,.36,1) both',
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
        <div style={{ marginBottom: '1.8rem', animation: 'rgFadeUp .4s .05s both' }}>
          <Logo size={36} textColor="#1a1208" textSize="1.25rem" dimCI={true}/>
        </div>

        {/* ── Heading ── */}
        <div style={{ marginBottom: '2rem', animation: 'rgFadeUp .4s .08s both' }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.85rem', fontWeight: 800,
            color: '#1a1208', margin: '0 0 .35rem',
            letterSpacing: '-.025em', lineHeight: 1.15,
          }}>
            Créer un compte
          </h2>
          <p style={{ fontSize: 13.5, color: '#8c7060', margin: 0, lineHeight: 1.5 }}>
            Ouvrez l'espace de votre clinique en quelques minutes
          </p>
        </div>

        {/* ── Server error ── */}
        {serverError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.5rem',
            padding: '.65rem .9rem', marginBottom: '1.2rem',
            background: 'rgba(220,38,38,.06)',
            border: '1px solid rgba(220,38,38,.2)',
            borderRadius: 10, fontSize: 13, color: '#b91c1c',
            animation: 'rgShake .35s ease both',
          }}>
            <Icon name="warning" size={13} color="#b91c1c"/>
            {serverError}
          </div>
        )}

        {/* ── Form ── */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            display: 'flex', flexDirection: 'column', gap: '1.3rem',
            animation: 'rgFadeUp .4s .11s both',
          }}
        >
          {/* Clinic name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <label style={{
              fontSize: 10.5, fontWeight: 700, color: '#7c5c3a',
              textTransform: 'uppercase', letterSpacing: '.07em',
            }}>
              Nom de la clinique
            </label>
            <input
              type="text"
              className="rg-input"
              placeholder="Clinique du Plateau"
              autoComplete="organization"
              {...register('clinic_name', { required: 'Nom de clinique requis' })}
            />
            {errors.clinic_name && (
              <span style={{ fontSize: 12, color: '#b91c1c', marginTop: 1 }}>
                {errors.clinic_name.message}
              </span>
            )}
          </div>

          {/* First name + Last name */}
          <div className="rg-name-row" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
              <label style={{
                fontSize: 10.5, fontWeight: 700, color: '#7c5c3a',
                textTransform: 'uppercase', letterSpacing: '.07em',
              }}>
                Prénom
              </label>
              <input
                type="text"
                className="rg-input"
                placeholder="Aminata"
                autoComplete="given-name"
                {...register('first_name', { required: 'Requis' })}
              />
              {errors.first_name && (
                <span style={{ fontSize: 12, color: '#b91c1c', marginTop: 1 }}>
                  {errors.first_name.message}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
              <label style={{
                fontSize: 10.5, fontWeight: 700, color: '#7c5c3a',
                textTransform: 'uppercase', letterSpacing: '.07em',
              }}>
                Nom
              </label>
              <input
                type="text"
                className="rg-input"
                placeholder="Touré"
                autoComplete="family-name"
                {...register('last_name', { required: 'Requis' })}
              />
              {errors.last_name && (
                <span style={{ fontSize: 12, color: '#b91c1c', marginTop: 1 }}>
                  {errors.last_name.message}
                </span>
              )}
            </div>
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <label style={{
              fontSize: 10.5, fontWeight: 700, color: '#7c5c3a',
              textTransform: 'uppercase', letterSpacing: '.07em',
            }}>
              Adresse e-mail
            </label>
            <input
              type="email"
              className="rg-input"
              placeholder="admin@clinique.ci"
              autoComplete="email"
              {...register('email', { required: 'Email requis' })}
            />
            {errors.email && (
              <span style={{ fontSize: 12, color: '#b91c1c', marginTop: 1 }}>
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <label style={{
              fontSize: 10.5, fontWeight: 700, color: '#7c5c3a',
              textTransform: 'uppercase', letterSpacing: '.07em',
            }}>
              Mot de passe
            </label>
            <input
              type="password"
              className="rg-input"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('password', {
                required: 'Mot de passe requis',
                minLength: { value: 8, message: '8 caractères minimum' },
              })}
            />
            {errors.password && (
              <span style={{ fontSize: 12, color: '#b91c1c', marginTop: 1 }}>
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Confirm password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <label style={{
              fontSize: 10.5, fontWeight: 700, color: '#7c5c3a',
              textTransform: 'uppercase', letterSpacing: '.07em',
            }}>
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              className="rg-input"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('confirm_password', {
                required: 'Confirmation requise',
                validate: v => v === password || 'Les mots de passe ne correspondent pas',
              })}
            />
            {errors.confirm_password && (
              <span style={{ fontSize: 12, color: '#b91c1c', marginTop: 1 }}>
                {errors.confirm_password.message}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="rg-submit"
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
                  animation: 'rgSpin .7s linear infinite',
                }}/>
                Création en cours…
              </>
            ) : (
              <>
                Créer mon espace
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
          animation: 'rgFadeUp .4s .2s both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.42rem',
            fontSize: 11.5, color: '#b8a080',
          }}>
            <Icon name="shield" size={11} color="#c8732a"/>
            <span>Données chiffrées</span>
          </div>
          <Link
            to="/login"
            style={{
              fontSize: 12.5, color: '#7c5c3a',
              textDecoration: 'none', fontWeight: 600,
              transition: 'color .15s',
            }}
          >
            Déjà un compte →
          </Link>
        </div>

        {/* ── Bottom location badge ── */}
        <div style={{
          marginTop: '1.8rem', paddingTop: '1.5rem',
          borderTop: '1px solid #e8d8c4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '.5rem',
          animation: 'rgFadeUp .4s .22s both',
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
      Connexion
    </button>
  );
}

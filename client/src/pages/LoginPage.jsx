import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

const DEMO_ROLES = [
  {
    id: 'doctor',
    label: 'Dr. Aminata Koné',
    sub: 'Médecin · Médecine générale',
    emoji: '👩‍⚕️',
    cls: 'green',
    email: 'aminata@clinique-plateau.ci',
    password: 'Password123!',
  },
  {
    id: 'secretary',
    label: 'Rana Touré',
    sub: 'Secrétaire médicale',
    emoji: '👩‍💼',
    cls: 'gold',
    email: 'rana@clinique-plateau.ci',
    password: 'Password123!',
  },
  {
    id: 'patient',
    label: 'Karim Meïté',
    sub: 'Patient · 31 ans',
    emoji: '🧑',
    cls: 'blue',
    email: 'karim@email.ci',
    password: 'Password123!',
  },
];

export default function LoginPage() {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const res = await api.post('/auth/login', data);
      login(res.user);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err?.error || 'Email ou mot de passe incorrect');
    }
  };

  const handleRoleCard = (role) => {
    setValue('email', role.email);
    setValue('password', role.password);
    setShowForm(true);
    setTimeout(() => handleSubmit(onSubmit)(), 100);
  };

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
        <p>
          Sélectionnez un profil pour explorer l'application, ou connectez-vous avec vos identifiants.
          Le prototype inclut l'assistante IA <strong style={{ color: 'var(--green)' }}>Awa</strong>.
        </p>

        <div className="role-cards">
          {DEMO_ROLES.map(r => (
            <button
              key={r.id}
              className="role-card"
              onClick={() => handleRoleCard(r)}
              disabled={isSubmitting}
            >
              <div className={`role-avatar ${r.cls}`}>{r.emoji}</div>
              <div>
                <div className="role-name">{r.label}</div>
                <div className="role-sub">{r.sub}</div>
              </div>
              <div className="role-arrow">
                {isSubmitting
                  ? <span className="spinner" style={{ width: 16, height: 16 }} />
                  : <Icon name="arrow" size={18} />
                }
              </div>
            </button>
          ))}
        </div>

        <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>ou</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {serverError && (
          <div style={{
            padding: '.75rem 1rem', marginBottom: '1rem',
            background: 'var(--red-soft)', border: '1px solid var(--red)',
            borderRadius: 10, fontSize: 13, color: 'var(--red)',
            display: 'flex', alignItems: 'center', gap: '.5rem',
          }}>
            <Icon name="warning" size={15} />
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              className="input"
              {...register('email', { required: 'Email requis' })}
              placeholder="vous@clinique.ci"
            />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className="field">
            <label>Mot de passe</label>
            <input
              type="password"
              className="input"
              {...register('password', { required: 'Mot de passe requis' })}
              placeholder="••••••••"
            />
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '.75rem', padding: '1rem 1.25rem', background: '#fff', borderRadius: 12, border: '1px solid var(--border)' }}>
          <Icon name="shield" size={18} color="var(--green)" />
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--ink)' }}>Multi-tenant sécurisé.</strong> Chaque clinique a son espace isolé. Les données patients ne se mélangent jamais entre cabinets.
          </div>
        </div>

        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          Nouvelle clinique ?{' '}
          <Link to="/register" style={{ color: 'var(--green)', fontWeight: 500 }}>
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}

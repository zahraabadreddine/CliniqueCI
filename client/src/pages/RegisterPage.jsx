import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AuthContext } from '../App';
import { api } from '../lib/api';

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

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
    <div className="login-screen" style={{ gridTemplateColumns: '1fr' }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '3rem 1.5rem',
        minHeight: '100vh', background: 'var(--cream)',
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'var(--green)', color: '#fff',
              display: 'grid', placeItems: 'center',
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700, fontSize: 22,
              margin: '0 auto 1rem',
            }}>
              C
            </div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '2rem', fontWeight: 700, color: 'var(--ink)',
              marginBottom: '.35rem',
            }}>
              Clinique<em style={{ color: 'var(--green)', fontStyle: 'italic' }}>CI</em>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              Créez l'espace de votre clinique
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            {serverError && (
              <div style={{
                background: 'var(--red-soft)', border: '1px solid var(--red)',
                color: 'var(--red)', padding: '.65rem .9rem', borderRadius: 8,
                fontSize: 13, marginBottom: '1.25rem',
              }}>
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="field">
                <label>Nom de la clinique</label>
                <input
                  className="input"
                  placeholder="Clinique du Plateau"
                  {...register('clinic_name', { required: 'Nom requis' })}
                />
                {errors.clinic_name && <span className="form-error">{errors.clinic_name.message}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field">
                  <label>Prénom</label>
                  <input
                    className="input"
                    placeholder="Aminata"
                    {...register('first_name', { required: 'Requis' })}
                  />
                  {errors.first_name && <span className="form-error">{errors.first_name.message}</span>}
                </div>
                <div className="field">
                  <label>Nom</label>
                  <input
                    className="input"
                    placeholder="Touré"
                    {...register('last_name', { required: 'Requis' })}
                  />
                  {errors.last_name && <span className="form-error">{errors.last_name.message}</span>}
                </div>
              </div>

              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="admin@clinique.ci"
                  {...register('email', { required: 'Email requis' })}
                />
                {errors.email && <span className="form-error">{errors.email.message}</span>}
              </div>

              <div className="field">
                <label>Mot de passe</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Requis',
                    minLength: { value: 8, message: '8 caractères minimum' },
                  })}
                />
                {errors.password && <span className="form-error">{errors.password.message}</span>}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isSubmitting}
                style={{ width: '100%', justifyContent: 'center', marginTop: '.25rem' }}
              >
                {isSubmitting ? 'Création...' : 'Créer mon espace'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 13, color: 'var(--muted)' }}>
              Déjà un compte ?{' '}
              <Link to="/login" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

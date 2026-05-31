import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

/* ─── IntersectionObserver hook ─────────────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ─── Static data ────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: '🗓️',
    title: 'Agenda intelligent',
    desc: 'Planification visuelle par semaine, détection de conflits, rappels automatiques par SMS.',
    color: '#22a05e',
    bg: 'linear-gradient(135deg,#e2f8ec 0%,#a3e8c3 100%)',
  },
  {
    icon: '👤',
    title: 'Dossiers patients',
    desc: 'Historique médical complet, ordonnances, antécédents et documents — tout en un seul endroit.',
    color: '#0d7a5f',
    bg: 'linear-gradient(135deg,#d0f4e1 0%,#9de8c7 100%)',
  },
  {
    icon: '💊',
    title: 'Prescriptions',
    desc: 'Rédigez, imprimez et archivez les ordonnances en quelques secondes depuis la consultation.',
    color: '#b8860b',
    bg: 'linear-gradient(135deg,#fef3d3 0%,#f6e5a0 100%)',
  },
  {
    icon: '🧾',
    title: 'Facturation',
    desc: 'Génération automatique de factures, suivi des paiements, export comptable en un clic.',
    color: '#b8860b',
    bg: 'linear-gradient(135deg,#fef3d3 0%,#f6e5a0 100%)',
  },
  {
    icon: '📊',
    title: 'Statistiques',
    desc: "Tableau de bord temps réel : taux de remplissage, revenus, patients actifs et tendances.",
    color: '#22a05e',
    bg: 'linear-gradient(135deg,#e2f8ec 0%,#a3e8c3 100%)',
  },
  {
    icon: '🔒',
    title: 'Sécurité & RGPD',
    desc: "Données chiffrées, accès par rôle, journaux d'audit. Conforme aux exigences africaines.",
    color: '#c0392b',
    bg: 'linear-gradient(135deg,#fdecea 0%,#f9cac6 100%)',
  },
];

const ROLES = [
  {
    emoji: '🩺',
    title: 'Médecin',
    desc: 'Consultez votre agenda, rédigez des ordonnances, suivez chaque patient. Votre clinique dans votre poche.',
    gradient: 'linear-gradient(135deg,#d1fae5 0%,#a7f3d0 100%)',
    accent: '#059669',
  },
  {
    emoji: '📋',
    title: 'Secrétaire',
    desc: "Gérez l'accueil, créez les rendez-vous, suivez la file d'attente. Moins de papier, plus d'efficacité.",
    gradient: 'linear-gradient(135deg,#fef3d3 0%,#f0d97a 100%)',
    accent: '#b8860b',
  },
  {
    emoji: '🏥',
    title: 'Administrateur',
    desc: "Vue d'ensemble complète : utilisateurs, statistiques, audit. Pilotez votre clinique avec précision.",
    gradient: 'linear-gradient(135deg,#fef3d3 0%,#f0d97a 100%)',
    accent: '#b8860b',
  },
  {
    emoji: '🧑‍⚕️',
    title: 'Patient',
    desc: 'Prenez rendez-vous, consultez vos ordonnances et suivez votre parcours de soins simplement.',
    gradient: 'linear-gradient(135deg,#d0f4e1 0%,#9de8c7 100%)',
    accent: '#0d7a5f',
  },
];

const MINI_APPTS = [
  { time: '08:30', name: 'Konan Adjoua',     type: 'Consultation',  dot: '#22a05e' },
  { time: '09:00', name: 'Bamba Sékou',      type: 'Suivi cardio',  dot: '#facc15' },
  { time: '09:45', name: 'Yao Emmanuelle',   type: 'Pédiatrie',     dot: '#6ed8a1' },
  { time: '10:15', name: 'Diallo Fatim...',  type: 'Bilan général', dot: '#2ec472' },
];

const PLANS = [
  {
    name: 'Démarrage',
    price: '19 900',
    period: 'FCFA / mois',
    tagline: 'Idéal pour une petite clinique ou un cabinet solo.',
    highlight: false,
    badge: null,
    features: [
      '1 médecin inclus',
      "Jusqu'à 300 patients / mois",
      'Agenda & rendez-vous',
      'Dossiers patients',
      'Facturation de base',
      'Support par e-mail',
    ],
    cta: 'Commencer gratuitement',
    ctaStyle: 'outline',
  },
  {
    name: 'Clinique',
    price: '39 900',
    period: 'FCFA / mois',
    tagline: 'La formule la plus choisie par les cliniques actives.',
    highlight: true,
    badge: 'Recommandé',
    features: [
      "Jusqu'à 5 médecins",
      'Patients illimités',
      'Agenda + planning hebdomadaire',
      'Prescriptions & ordonnances',
      'Facturation avancée + exports',
      'Statistiques & tableau de bord',
      'Support prioritaire WhatsApp',
    ],
    cta: 'Essai gratuit 14 jours',
    ctaStyle: 'solid',
  },
  {
    name: 'Premium',
    price: '69 900',
    period: 'FCFA / mois',
    tagline: 'Pour les groupes de cliniques et structures multi-sites.',
    highlight: false,
    badge: null,
    features: [
      'Médecins illimités',
      'Multi-sites & multi-entités',
      'Toutes les fonctionnalités Clinique',
      "Journaux d'audit complets",
      'Intégrations API sur mesure',
      'Manager de compte dédié',
      'SLA 99.9% garanti',
    ],
    cta: 'Contacter les ventes',
    ctaStyle: 'outline',
  },
];

const STATS_STRIP = [
  { value: '2 400+', label: 'Patients suivis' },
  { value: '18',     label: 'Cliniques actives' },
  { value: '99.8%',  label: 'Disponibilité' },
  { value: '< 2s',   label: 'Temps de réponse' },
];

/* ─── Reusable icon ──────────────────────────────────────────────────────── */
function Icon({ name, size = 20, color = 'currentColor' }) {
  const s = { width: size, height: size, flexShrink: 0 };
  if (name === 'arrow-right')
    return (
      <svg viewBox="0 0 20 20" fill="none" style={s}>
        <path d="M4 10h12M11 5l5 5-5 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (name === 'check')
    return (
      <svg viewBox="0 0 20 20" fill="none" style={s}>
        <path d="M4 10l4.5 4.5L16 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (name === 'star')
    return (
      <svg viewBox="0 0 20 20" fill={color} style={s}>
        <path d="M10 1.5l2.472 4.927 5.528.803-4 3.9.944 5.5L10 14.01l-4.944 2.62.944-5.5-4-3.9 5.528-.803z" />
      </svg>
    );
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [featRef,    featInView]    = useInView(0.08);
  const [africaRef,  africaInView]  = useInView(0.1);
  const [rolesRef,   rolesInView]   = useInView(0.08);
  const [pricingRef, pricingInView] = useInView(0.06);
  const [ctaRef,     ctaInView]     = useInView(0.15);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── nav links ── */
  const NAV = [
    { label: 'Fonctionnalités', id: 'features' },
    { label: 'Pour qui ?',      id: 'roles'    },
    { label: 'Tarifs',          id: 'pricing'  },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif", overflowX: 'hidden', background: '#fff' }}>

      {/* ── Inject keyframes ────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap');

        @keyframes ldHeroGrad {
          0%  { background-position: 0% 60%; }
          50% { background-position: 100% 40%; }
          100%{ background-position: 0% 60%; }
        }
        @keyframes ldFloat {
          0%,100% { transform: translateY(0) scale(1); }
          50%     { transform: translateY(-22px) scale(1.04); }
        }
        @keyframes ldFadeUp {
          from { opacity:0; transform: translateY(28px); }
          to   { opacity:1; transform: translateY(0); }
        }
        @keyframes ldPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,160,94,.55); }
          50%     { box-shadow: 0 0 0 6px rgba(34,160,94,0); }
        }
        @keyframes ldShimmer {
          from { background-position: -200% center; }
          to   { background-position: 200% center; }
        }
        @keyframes ldSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ldOrb1 { 0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-40px) scale(1.08)} }
        @keyframes ldOrb2 { 0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-25px,35px) scale(.96)} }
        @keyframes ldOrb3 { 0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(20px,25px) scale(1.06)} }

        .ld-nav-link {
          color: rgba(255,255,255,.75);
          font-size: .9rem;
          font-weight: 500;
          text-decoration: none;
          padding: .3rem 0;
          border-bottom: 2px solid transparent;
          transition: color .2s, border-color .2s;
          cursor: pointer;
          background: none;
          border-top: none;
          border-left: none;
          border-right: none;
        }
        .ld-nav-link:hover { color: #fff; border-bottom-color: rgba(255,255,255,.5); }
        .ld-nav-link.scrolled { color: #374151; }
        .ld-nav-link.scrolled:hover { color: #22a05e; border-bottom-color: #22a05e; }

        .ld-feat-card {
          background: #fff;
          border: 1px solid #e8e8e0;
          border-radius: 18px;
          padding: 1.75rem;
          transition: transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s;
          cursor: default;
        }
        .ld-feat-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(0,0,0,.09);
        }
        .ld-role-card {
          border-radius: 20px;
          padding: 1.75rem 1.5rem;
          transition: transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s;
          cursor: default;
        }
        .ld-role-card:hover {
          transform: translateY(-7px) scale(1.02);
          box-shadow: 0 24px 60px rgba(0,0,0,.13);
        }
        .ld-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: .55rem;
          padding: .85rem 2rem;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s;
          text-decoration: none;
          border: none;
        }
        .ld-cta-btn:hover {
          transform: translateY(-3px);
        }
        .ld-cta-primary {
          background: #22a05e;
          color: #fff;
          box-shadow: 0 6px 24px rgba(34,160,94,.38);
        }
        .ld-cta-primary:hover {
          box-shadow: 0 12px 36px rgba(34,160,94,.48);
        }
        .ld-cta-ghost {
          background: rgba(255,255,255,.14);
          color: #fff;
          border: 1.5px solid rgba(255,255,255,.35) !important;
          backdrop-filter: blur(8px);
        }
        .ld-cta-ghost:hover {
          background: rgba(255,255,255,.22);
        }
        .ld-cta-white {
          background: #fff;
          color: #22a05e;
          box-shadow: 0 6px 24px rgba(0,0,0,.18);
        }
        .ld-cta-white:hover {
          box-shadow: 0 12px 36px rgba(0,0,0,.26);
        }
        .ld-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: .45rem;
          padding: .35rem .85rem;
          border-radius: 50px;
          font-size: .78rem;
          font-weight: 600;
          letter-spacing: .02em;
        }
        .ld-section-label {
          display: inline-block;
          padding: .3rem .9rem;
          border-radius: 50px;
          font-size: .78rem;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
          margin-bottom: 1rem;
        }
        .ld-glass {
          background: rgba(255,255,255,.10);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 20px;
        }
        .ld-inview {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity .65s cubic-bezier(.22,1,.36,1), transform .65s cubic-bezier(.22,1,.36,1);
        }
        .ld-inview.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .ld-inview-item {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity .55s cubic-bezier(.22,1,.36,1), transform .55s cubic-bezier(.22,1,.36,1);
        }
        .ld-inview-item.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .ld-pricing-card {
          background: #fff;
          border: 1.5px solid #e8e8e0;
          border-radius: 22px;
          padding: 2.25rem 2rem;
          display: flex;
          flex-direction: column;
          transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s;
        }
        .ld-pricing-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 24px 60px rgba(0,0,0,.1);
        }
        .ld-pricing-card.featured {
          border-color: #22a05e;
          box-shadow: 0 8px 40px rgba(34,160,94,.18);
          transform: translateY(-10px);
          position: relative;
          z-index: 2;
        }
        .ld-pricing-card.featured:hover {
          transform: translateY(-16px);
          box-shadow: 0 28px 70px rgba(34,160,94,.22);
        }
        .ld-pricing-btn-outline {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .45rem;
          padding: .8rem 1.5rem;
          border-radius: 50px;
          font-size: .92rem;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s cubic-bezier(.22,1,.36,1);
          border: 1.5px solid #22a05e;
          background: transparent;
          color: #22a05e;
          margin-top: auto;
        }
        .ld-pricing-btn-outline:hover {
          background: #22a05e;
          color: #fff;
          transform: translateY(-2px);
        }
        .ld-pricing-btn-solid {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .45rem;
          padding: .8rem 1.5rem;
          border-radius: 50px;
          font-size: .92rem;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s cubic-bezier(.22,1,.36,1);
          border: none;
          background: #22a05e;
          color: #fff;
          box-shadow: 0 4px 18px rgba(34,160,94,.35);
          margin-top: auto;
        }
        .ld-pricing-btn-solid:hover {
          background: #1a8a4e;
          box-shadow: 0 8px 28px rgba(34,160,94,.45);
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          .ld-pricing-grid { grid-template-columns: 1fr !important; }
          .ld-pricing-card.featured { transform: none !important; }
        }
        @media (max-width: 768px) {
          .ld-hero-right { display: none !important; }
          .ld-desktop-nav { display: none !important; }
          .ld-feat-grid { grid-template-columns: 1fr !important; }
          .ld-roles-grid { grid-template-columns: 1fr 1fr !important; }
          .ld-stats-strip { grid-template-columns: 1fr 1fr !important; }
          .ld-hero-headline { font-size: clamp(2.2rem, 8vw, 3.2rem) !important; }
        }
        @media (max-width: 480px) {
          .ld-roles-grid { grid-template-columns: 1fr !important; }
          .ld-stats-strip { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════
          NAVBAR
      ═══════════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        padding: '0 max(1.5rem, calc((100vw - 1120px)/2))',
        transition: 'background .3s, box-shadow .3s, backdrop-filter .3s',
        background: scrolled ? 'rgba(255,255,255,.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,.07)' : 'none',
      }}>
        {/* Logo */}
        <div style={{ cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <Logo
            size={32}
            textSize="1.2rem"
            textColor={scrolled ? '#22a05e' : '#fff'}
            dimCI={scrolled}
          />
        </div>

        {/* Desktop nav */}
        <div className="ld-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '1.8rem', marginLeft: 'auto', marginRight: '1.5rem' }}>
          {NAV.map(n => (
            <button key={n.id} className={`ld-nav-link${scrolled ? ' scrolled' : ''}`} onClick={() => scrollTo(n.id)}>
              {n.label}
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/login')}
          style={{
            marginLeft: 'auto',
            padding: '.5rem 1.3rem',
            borderRadius: 50,
            border: scrolled ? '1.5px solid #22a05e' : '1.5px solid rgba(255,255,255,.55)',
            background: scrolled ? '#22a05e' : 'rgba(255,255,255,.12)',
            color: scrolled ? '#fff' : '#fff',
            fontSize: '.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all .22s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = scrolled
              ? '0 6px 20px rgba(34,160,94,.35)'
              : '0 6px 20px rgba(0,0,0,.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          Se connecter
        </button>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(150deg, #071409 0%, #0d2010 35%, #0f1c0b 65%, #091208 100%)',
        backgroundSize: '300% 300%',
        animation: 'ldHeroGrad 18s ease infinite',
        display: 'flex',
        alignItems: 'center',
        padding: '100px max(1.5rem, calc((100vw - 1120px)/2)) 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Background orbs */}
        {[
          { size: 520, top: '-15%', left: '-10%',  bg: 'radial-gradient(circle, rgba(46,196,114,.28) 0%, transparent 70%)', anim: 'ldOrb1 14s ease-in-out infinite' },
          { size: 380, top: '40%',  right: '-8%',  bg: 'radial-gradient(circle, rgba(34,160,94,.20) 0%, transparent 70%)', anim: 'ldOrb2 18s ease-in-out infinite' },
          { size: 260, bottom: '5%',left: '30%',   bg: 'radial-gradient(circle, rgba(110,216,161,.14) 0%, transparent 70%)', anim: 'ldOrb3 11s ease-in-out infinite' },
        ].map((o, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: o.size,
            height: o.size,
            top: o.top,
            left: o.left,
            right: o.right,
            bottom: o.bottom,
            background: o.bg,
            borderRadius: '50%',
            animation: o.anim,
            pointerEvents: 'none',
          }} />
        ))}

        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* ── Left column ── */}
        <div style={{ maxWidth: 560, flex: '1 1 560px', position: 'relative', zIndex: 1 }}>

          {/* Badge */}
          <div className="ld-pill-badge" style={{
            background: 'rgba(34,160,94,.12)',
            border: '1px solid rgba(34,160,94,.3)',
            color: '#6ed8a1',
            marginBottom: '1.75rem',
            animation: 'ldFadeUp .6s cubic-bezier(.22,1,.36,1) both',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#6ed8a1',
              display: 'inline-block', animation: 'ldPulse 2.2s ease-in-out infinite',
              flexShrink: 0,
            }} />
            Conçu pour les cliniques d'Abidjan
          </div>

          {/* Headline */}
          <h1 className="ld-hero-headline" style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 800,
            fontSize: 'clamp(2.6rem, 5vw, 3.8rem)',
            lineHeight: 1.12,
            color: '#fff',
            margin: '0 0 1.5rem',
            letterSpacing: '-.02em',
            animation: 'ldFadeUp .65s .08s cubic-bezier(.22,1,.36,1) both',
          }}>
            La gestion de clinique<br />
            <span style={{
              background: 'linear-gradient(90deg, #6ed8a1 0%, #22a05e 50%, #a3e8c3 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'ldShimmer 4s linear infinite',
              display: 'inline-block',
            }}>
              réinventée pour l'Afrique
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.1rem',
            lineHeight: 1.7,
            color: 'rgba(255,255,255,.65)',
            margin: '0 0 2.2rem',
            maxWidth: 480,
            animation: 'ldFadeUp .65s .16s cubic-bezier(.22,1,.36,1) both',
          }}>
            CliniqueCI unifie rendez-vous, dossiers patients, ordonnances et facturation dans une plateforme élégante —
            accessible depuis n'importe quel téléphone.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex', gap: '1rem', flexWrap: 'wrap',
            animation: 'ldFadeUp .65s .24s cubic-bezier(.22,1,.36,1) both',
          }}>
            <button className="ld-cta-btn ld-cta-primary" onClick={() => navigate('/login')}>
              Commencer gratuitement
              <Icon name="arrow-right" size={18} color="#fff" />
            </button>
            <button className="ld-cta-btn ld-cta-ghost" onClick={() => scrollTo('features')}>
              Découvrir les fonctionnalités
            </button>
          </div>

          {/* Trust strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '2.5rem',
            animation: 'ldFadeUp .65s .32s cubic-bezier(.22,1,.36,1) both',
          }}>
            {/* Avatars */}
            <div style={{ display: 'flex' }}>
              {['👩🏾‍⚕️','👨🏿‍⚕️','👩🏽‍⚕️'].map((em, i) => (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: `hsl(${142 + i * 18},55%,32%)`,
                  border: '2px solid rgba(255,255,255,.25)',
                  marginLeft: i === 0 ? 0 : -10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.9rem',
                }}>{em}</div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
                {[0,1,2,3,4].map(i => <Icon key={i} name="star" size={12} color="#facc15" />)}
              </div>
              <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.5)', margin: 0 }}>
                Adopté par <strong style={{ color: 'rgba(255,255,255,.8)' }}>18 cliniques</strong> à Abidjan
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: App mockup ── */}
        <div className="ld-hero-right" style={{
          flex: '0 0 420px',
          marginLeft: '3rem',
          position: 'relative',
          zIndex: 1,
          animation: 'ldFadeUp .7s .15s cubic-bezier(.22,1,.36,1) both',
        }}>
          {/* Glow behind card */}
          <div style={{
            position: 'absolute', inset: -30,
            background: 'radial-gradient(circle, rgba(46,196,114,.35) 0%, transparent 70%)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }} />

          {/* Main glass card */}
          <div className="ld-glass" style={{ padding: '1.5rem', position: 'relative' }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '.72rem', color: 'rgba(255,255,255,.5)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  Agenda du jour
                </p>
                <p style={{ margin: '.15rem 0 0', fontSize: '.92rem', color: '#fff', fontWeight: 600 }}>
                  Jeudi 28 mai 2026
                </p>
              </div>
              <div style={{
                background: 'rgba(34,160,94,.18)',
                border: '1px solid rgba(34,160,94,.35)',
                borderRadius: 50,
                padding: '.25rem .65rem',
                fontSize: '.72rem',
                color: '#6ed8a1',
                fontWeight: 600,
              }}>
                4 RDV
              </div>
            </div>

            {/* Appointment list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {MINI_APPTS.map((a, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,.07)',
                  borderRadius: 12,
                  padding: '.7rem .9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.8rem',
                  animation: `ldFadeUp .5s ${.1 + i * .08}s cubic-bezier(.22,1,.36,1) both`,
                  transition: 'background .2s',
                }}>
                  <span style={{
                    fontSize: '.78rem',
                    color: 'rgba(255,255,255,.45)',
                    fontWeight: 600,
                    minWidth: 36,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{a.time}</span>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(255,255,255,.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.8rem', flexShrink: 0,
                  }}>👤</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '.83rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</p>
                    <p style={{ margin: 0, fontSize: '.72rem', color: 'rgba(255,255,255,.45)' }}>{a.type}</p>
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: a.dot,
                    boxShadow: `0 0 8px ${a.dot}`,
                    flexShrink: 0,
                    animation: 'ldPulse 2.5s ease-in-out infinite',
                  }} />
                </div>
              ))}
            </div>

            {/* Mini KPI strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.55rem', marginTop: '1rem' }}>
              {[
                { label: 'Arrivés',  value: '2', color: '#6ed8a1' },
                { label: 'Attendus', value: '2', color: '#facc15' },
                { label: 'Payés',    value: '2', color: '#22a05e' },
              ].map((k, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,.06)',
                  borderRadius: 10,
                  padding: '.6rem .5rem',
                  textAlign: 'center',
                }}>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: k.color }}>{k.value}</p>
                  <p style={{ margin: 0, fontSize: '.68rem', color: 'rgba(255,255,255,.4)' }}>{k.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Floating badge: activity */}
          <div style={{
            position: 'absolute',
            bottom: -18,
            left: -22,
            background: 'rgba(255,255,255,.95)',
            borderRadius: 12,
            padding: '.6rem .9rem',
            boxShadow: '0 12px 40px rgba(0,0,0,.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '.55rem',
            animation: 'ldFloat 5s 1s ease-in-out infinite',
          }}>
            <div style={{ fontSize: 18 }}>📊</div>
            <div>
              <p style={{ margin: 0, fontSize: '.72rem', fontWeight: 700, color: '#111' }}>+38% patients</p>
              <p style={{ margin: 0, fontSize: '.65rem', color: '#888' }}>vs. mois dernier</p>
            </div>
          </div>

          {/* Floating badge: notification */}
          <div style={{
            position: 'absolute',
            top: -14,
            right: -18,
            background: '#22a05e',
            borderRadius: 10,
            padding: '.5rem .8rem',
            boxShadow: '0 8px 28px rgba(34,160,94,.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '.45rem',
            animation: 'ldFloat 6s .5s ease-in-out infinite',
          }}>
            <span style={{ fontSize: 14 }}>✅</span>
            <p style={{ margin: 0, fontSize: '.72rem', fontWeight: 600, color: '#fff' }}>RDV confirmé</p>
          </div>
        </div>
      </section>

      {/* ─── Stats strip ──────────────────────────────────────────────────── */}
      <section style={{
        background: '#22a05e',
        padding: '2rem max(1.5rem, calc((100vw - 1120px)/2))',
      }}>
        <div className="ld-stats-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.5rem' }}>
          {STATS_STRIP.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '2rem', color: '#fff' }}>{s.value}</p>
              <p style={{ margin: '.25rem 0 0', fontSize: '.85rem', color: 'rgba(255,255,255,.65)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="features" style={{
        background: '#faf9f5',
        padding: '100px max(1.5rem, calc((100vw - 1120px)/2))',
      }}>
        {/* Header */}
        <div ref={featRef} className={`ld-inview${featInView ? ' visible' : ''}`} style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div className="ld-section-label" style={{ background: '#e2f8ec', color: '#22a05e' }}>
            Fonctionnalités
          </div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 800,
            fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
            color: '#0a1a14',
            margin: '.5rem 0 1rem',
            letterSpacing: '-.02em',
          }}>
            Tout ce dont votre clinique a besoin
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#555', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
            Une plateforme pensée pour les réalités africaines — rapide sur mobile, intuitive, et puissante.
          </p>
        </div>

        {/* Cards */}
        <div className="ld-feat-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gap: '1.25rem',
        }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="ld-feat-card ld-inview-item"
              style={{
                transitionDelay: `${i * .06}s`,
                ...(featInView ? { opacity: 1, transform: 'translateY(0)' } : {}),
              }}
            >
              {/* Icon */}
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: f.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem',
                marginBottom: '1rem',
              }}>
                {f.icon}
              </div>
              <h3 style={{ margin: '0 0 .5rem', fontWeight: 700, fontSize: '1.05rem', color: '#111', letterSpacing: '-.01em' }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: '.88rem', color: '#666', lineHeight: 1.65 }}>{f.desc}</p>

              {/* Bottom accent */}
              <div style={{
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '.35rem',
                fontSize: '.78rem',
                fontWeight: 600,
                color: f.color,
              }}>
                <Icon name="check" size={16} color={f.color} />
                Inclus dans tous les plans
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          BUILT FOR AFRICA
      ═══════════════════════════════════════════════════════════════════ */}
      <section ref={africaRef} style={{
        background: 'linear-gradient(135deg, #071409 0%, #0d2010 60%, #091208 100%)',
        padding: '100px max(1.5rem, calc((100vw - 1120px)/2))',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative orb */}
        <div style={{
          position: 'absolute', top: '50%', right: '5%', transform: 'translateY(-50%)',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,160,94,.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className={`ld-inview${africaInView ? ' visible' : ''}`} style={{
          maxWidth: 680, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1,
        }}>
          <div className="ld-section-label" style={{ background: 'rgba(34,160,94,.12)', color: '#6ed8a1', border: '1px solid rgba(34,160,94,.28)' }}>
            Notre mission
          </div>

          <blockquote style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
            color: '#fff',
            margin: '1.25rem 0',
            lineHeight: 1.35,
            letterSpacing: '-.01em',
          }}>
            "Les cliniques africaines méritent des outils à la hauteur de leur ambition."
          </blockquote>

          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,.55)', lineHeight: 1.7, marginBottom: '2rem' }}>
            Conçu à Abidjan, CliniqueCI comprend les contraintes locales : connectivité variable,
            usage mobile dominant, et besoin d'une interface en français accessible à tous.
          </p>

          {/* Checkpoints */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '.75rem' }}>
            {[
              '✅ Optimisé pour les réseaux mobiles',
              '✅ Interface 100% en français',
              '✅ Support WhatsApp intégré',
              '✅ Adapté aux petites cliniques',
            ].map((item, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 8,
                padding: '.45rem 1rem',
                fontSize: '.83rem',
                color: 'rgba(255,255,255,.8)',
                fontWeight: 500,
              }}>{item}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ROLES
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="roles" style={{
        background: '#fff',
        padding: '100px max(1.5rem, calc((100vw - 1120px)/2))',
      }}>
        <div ref={rolesRef} className={`ld-inview${rolesInView ? ' visible' : ''}`} style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div className="ld-section-label" style={{ background: '#e2f8ec', color: '#22a05e' }}>
            Pour qui ?
          </div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 800,
            fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
            color: '#0a1a14',
            margin: '.5rem 0 1rem',
            letterSpacing: '-.02em',
          }}>
            Une plateforme pour chaque rôle
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#555', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Chaque membre de votre équipe dispose d'une interface adaptée à ses besoins spécifiques.
          </p>
        </div>

        <div className="ld-roles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.25rem' }}>
          {ROLES.map((r, i) => (
            <div
              key={r.title}
              className="ld-role-card ld-inview-item"
              style={{
                background: r.gradient,
                transitionDelay: `${i * .07}s`,
                ...(rolesInView ? { opacity: 1, transform: 'translateY(0)' } : {}),
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>{r.emoji}</div>
              <h3 style={{ margin: '0 0 .5rem', fontWeight: 700, fontSize: '1.05rem', color: '#111', letterSpacing: '-.01em' }}>{r.title}</h3>
              <p style={{ margin: '0 0 1.25rem', fontSize: '.86rem', color: '#444', lineHeight: 1.6 }}>{r.desc}</p>
              <button
                onClick={() => navigate('/login')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.35rem',
                  fontSize: '.82rem',
                  fontWeight: 700,
                  color: r.accent,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  letterSpacing: '.01em',
                }}
                onMouseEnter={e => e.currentTarget.style.gap = '.55rem'}
                onMouseLeave={e => e.currentTarget.style.gap = '.35rem'}
              >
                Se connecter <Icon name="arrow-right" size={15} color={r.accent} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          PRICING
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="pricing" style={{
        padding: '100px max(1.5rem, calc((100vw - 1120px)/2))',
        background: '#faf9f5',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle bg orb */}
        <div style={{ position:'absolute', top:'-10%', right:'-5%', width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle, rgba(34,160,94,.05) 0%, transparent 70%)', pointerEvents:'none' }} />

        {/* Section header */}
        <div
          ref={pricingRef}
          className={`ld-inview${pricingInView ? ' visible' : ''}`}
          style={{ textAlign: 'center', marginBottom: '3.5rem' }}
        >
          <span className="ld-section-label" style={{ background: 'rgba(34,160,94,.1)', color: '#22a05e' }}>Tarifs</span>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 800,
            fontSize: 'clamp(1.9rem, 4vw, 2.75rem)',
            color: '#0e1a16',
            margin: '0 0 1rem',
            letterSpacing: '-.025em',
            lineHeight: 1.15,
          }}>
            Simple, transparent, sans surprise
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#6b7280', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Choisissez la formule adaptée à la taille de votre structure.
            Pas de frais cachés — résiliable à tout moment.
          </p>
        </div>

        {/* Pricing cards grid */}
        <div className="ld-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem', alignItems: 'start' }}>
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={`ld-pricing-card ld-inview-item${plan.highlight ? ' featured' : ''}`}
              style={{
                transitionDelay: `${i * .08}s`,
                ...(pricingInView ? { opacity: 1, transform: plan.highlight ? 'translateY(-10px)' : 'translateY(0)' } : {}),
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '.35rem',
                    background: 'linear-gradient(90deg, #22a05e, #2ec472)',
                    color: '#fff',
                    fontSize: '.72rem',
                    fontWeight: 700,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    padding: '.3rem .85rem',
                    borderRadius: 50,
                  }}>
                    <Icon name="star" size={11} color="rgba(255,220,80,1)" />
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan name */}
              <h3 style={{ margin: '0 0 .4rem', fontSize: '1.15rem', fontWeight: 700, color: '#0e1a16', letterSpacing: '-.01em' }}>{plan.name}</h3>
              <p style={{ margin: '0 0 1.5rem', fontSize: '.85rem', color: '#6b7280', lineHeight: 1.55 }}>{plan.tagline}</p>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.35rem', marginBottom: '1.75rem' }}>
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 800,
                  fontSize: '2.4rem',
                  color: plan.highlight ? '#22a05e' : '#0e1a16',
                  lineHeight: 1,
                  letterSpacing: '-.03em',
                }}>{plan.price}</span>
                <span style={{ fontSize: '.82rem', color: '#9ca3af', marginBottom: '.3rem', fontWeight: 500 }}>{plan.period}</span>
              </div>

              {/* Feature list */}
              <ul style={{ margin: '0 0 2rem', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '.65rem', flexGrow: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '.55rem', fontSize: '.875rem', color: '#374151', lineHeight: 1.5 }}>
                    <span style={{
                      flexShrink: 0,
                      marginTop: '1px',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: plan.highlight ? 'rgba(34,160,94,.12)' : '#e2f8ec',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon name="check" size={13} color="#22a05e" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <button
                className={plan.ctaStyle === 'solid' ? 'ld-pricing-btn-solid' : 'ld-pricing-btn-outline'}
                onClick={() => navigate('/login')}
              >
                {plan.cta}
                <Icon name="arrow-right" size={16} color={plan.ctaStyle === 'solid' ? '#fff' : '#22a05e'} />
              </button>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '.83rem', color: '#9ca3af' }}>
          Tous les prix sont HT · TVA applicable selon la réglementation ivoirienne · Facturation mensuelle ou annuelle (−15%)
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CTA
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="cta" style={{
        background: 'linear-gradient(135deg, #22a05e 0%, #156b3d 50%, #1a8a4e 100%)',
        padding: '100px max(1.5rem, calc((100vw - 1120px)/2))',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Orbs */}
        <div style={{ position:'absolute', top:'-20%', right:'-5%', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,.07) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-25%', left:'-5%',  width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,.06) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div ref={ctaRef} className={`ld-inview${ctaInView ? ' visible' : ''}`} style={{ position: 'relative', zIndex: 1 }}>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            color: '#fff',
            margin: '0 0 1rem',
            letterSpacing: '-.02em',
            lineHeight: 1.2,
          }}>
            Prêt à moderniser votre clinique ?
          </p>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,.7)', margin: '0 0 2.5rem', maxWidth: 500, marginLeft:'auto', marginRight:'auto', lineHeight: 1.7 }}>
            Rejoignez les cliniques qui font confiance à CliniqueCI pour piloter leur activité au quotidien.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="ld-cta-btn ld-cta-white" onClick={() => navigate('/login')}>
              Démarrer maintenant
              <Icon name="arrow-right" size={18} color="#22a05e" />
            </button>
            <button className="ld-cta-btn ld-cta-ghost" onClick={() => scrollTo('features')}>
              Voir les fonctionnalités
            </button>
          </div>

          <p style={{ marginTop: '1.75rem', fontSize: '.82rem', color: 'rgba(255,255,255,.45)' }}>
            Aucune carte bancaire requise · Accès immédiat · Support en français
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════════ */}
      <footer style={{
        background: '#06110d',
        padding: '3.5rem max(1.5rem, calc((100vw - 1120px)/2)) 2rem',
        color: 'rgba(255,255,255,.45)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem', marginBottom: '2.5rem' }}>
          {/* Brand */}
          <div style={{ maxWidth: 260 }}>
            <div style={{ marginBottom: '.85rem' }}>
              <Logo size={30} textSize="1.1rem" />
            </div>
            <p style={{ margin: 0, fontSize: '.85rem', lineHeight: 1.65 }}>
              La plateforme de gestion de clinique conçue pour l'Afrique de l'Ouest.
            </p>
          </div>

          {/* Links */}
          {[
            { heading: 'Produit', links: ['Fonctionnalités', 'Tarifs', 'Sécurité', 'Roadmap'] },
            { heading: 'Entreprise', links: ['À propos', 'Blog', 'Carrières', 'Contact'] },
            { heading: 'Support', links: ['Documentation', 'Formation', 'WhatsApp', 'Statut'] },
          ].map(col => (
            <div key={col.heading}>
              <p style={{ margin: '0 0 .75rem', fontSize: '.8rem', fontWeight: 700, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{col.heading}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                {col.links.map(l => (
                  <span key={l} style={{ fontSize: '.86rem', cursor: 'pointer', transition: 'color .2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = ''}
                  >{l}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,.08)',
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '.75rem',
          fontSize: '.8rem',
        }}>
          <p style={{ margin: 0 }}>© 2026 CliniqueCI · Abidjan, Côte d'Ivoire</p>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            {['Confidentialité', "Conditions d'utilisation", 'Cookies'].map(l => (
              <span key={l} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = ''}
              >{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useId } from 'react';

/**
 * Logo CliniqueCI
 *   size      : taille du mark SVG (px)
 *   textColor : couleur du wordmark  — défaut : var(--ink) pour fonds clairs
 *   textSize  : font-size du wordmark
 *   showName  : afficher le wordmark à côté du mark
 *   inverted  : true = wordmark blanc (fonds sombres comme la sidebar)
 *   style     : style inline supplémentaire sur le wrapper
 */
export default function Logo({
  size      = 36,
  textColor,          // si non fourni, calculé depuis inverted
  textSize  = '1.05rem',
  showName  = true,
  inverted  = false,
  style     = {},
}) {
  const raw = useId();
  const gid = 'lg' + raw.replace(/[^a-z0-9]/gi, '');

  const wordColor = textColor ?? (inverted ? 'rgba(255,255,255,.92)' : 'var(--ink)');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', ...style }}>

      {/* ── Mark ────────────────────────────────────────────────────────── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      >
        <defs>
          {/* Gradient principal — teal profond */}
          <linearGradient id={gid} x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#18a070" />
            <stop offset="100%" stopColor="#085a42" />
          </linearGradient>

          {/* Reflet lumineux en haut */}
          <linearGradient id={gid + 's'} x1="0" y1="0" x2="0" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.20)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
          </linearGradient>
        </defs>

        {/* Fond arrondi */}
        <rect width="44" height="44" rx="12" fill={`url(#${gid})`} />

        {/* Reflet haut */}
        <rect width="44" height="22" rx="12" fill={`url(#${gid}s)`} />

        {/* Croix médicale — barre horizontale */}
        <rect x="13"   y="19.5" width="18" height="5" rx="2.5" fill="white" />
        {/* Croix médicale — barre verticale */}
        <rect x="19.5" y="13"   width="5" height="18" rx="2.5" fill="white" />

        {/* Accent pulse — petit dot en haut à droite (monitoring) */}
        <circle cx="35.5" cy="8.5" r="4.2" fill="rgba(255,255,255,0.18)" />
        <circle cx="35.5" cy="8.5" r="2.4" fill="rgba(255,255,255,0.82)" />
      </svg>

      {/* ── Wordmark ─────────────────────────────────────────────────────── */}
      {showName && (
        <span style={{
          fontFamily:    "'DM Sans', system-ui, sans-serif",
          fontSize:      textSize,
          fontWeight:    700,
          color:         wordColor,
          letterSpacing: '-.025em',
          lineHeight:    1,
          userSelect:    'none',
        }}>
          Clinique
          <span style={{
            color:      'var(--green)',
            fontWeight: 800,
            /* sur fond sombre le vert trop foncé passe mal → éclaircir */
            filter:     inverted ? 'brightness(1.55)' : 'none',
          }}>CI</span>
        </span>
      )}
    </div>
  );
}

/**
 * Vercel Edge Function — proxy transparent vers le backend Render.
 *
 * Pourquoi une Edge Function plutôt qu'un simple "rewrite" dans vercel.json ?
 * Le CDN Vercel peut supprimer les headers Set-Cookie des réponses proxiées,
 * ce qui empêche Safari iOS (ITP) de stocker les cookies httpOnly d'authentification.
 * Ici on reconstruit la Response explicitement avec TOUS les headers upstream,
 * y compris Set-Cookie — Safari reçoit donc les cookies en first-party et les garde.
 */
export const config = { runtime: 'edge' };

const BACKEND = 'https://cliniqueci-api.onrender.com';

export default async function handler(req) {
  const { pathname, search } = new URL(req.url);

  // pathname = /api/auth/login  →  target = https://…onrender.com/api/auth/login
  const targetUrl = `${BACKEND}${pathname}${search}`;

  // Transmettre tous les headers sauf "host" (qui doit pointer sur onrender.com)
  const headers = new Headers(req.headers);
  headers.delete('host');

  const isBodyless = req.method === 'GET' || req.method === 'HEAD';

  try {
    const upstream = await fetch(targetUrl, {
      method:  req.method,
      headers,
      body:    isBodyless ? null : req.body,
      // Nécessaire pour le streaming du body dans le runtime Edge
      ...(isBodyless ? {} : { duplex: 'half' }),
    });

    // Reconstruire la réponse avec TOUS les headers upstream (Set-Cookie inclus)
    return new Response(upstream.body, {
      status:     upstream.status,
      statusText: upstream.statusText,
      headers:    upstream.headers,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erreur proxy — impossible de joindre le serveur.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

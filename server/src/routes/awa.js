const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');

// ─── Context builder: fetch live clinic data for richer AI responses ──────────
async function buildClinicContext(db, orgId, userId, userRole) {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const dateLabel = today.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const [org] = await db('organizations').where({ id: orgId }).select('name');
    const clinicName = org?.name || 'la clinique';

    // Today's appointments
    const todayAppts = await db('appointments')
      .where({ organization_id: orgId })
      .whereRaw("DATE(scheduled_at) = ?", [todayStr])
      .select('status', 'reason', 'scheduled_at')
      .orderBy('scheduled_at', 'asc')
      .limit(20);

    const apptStats = {
      total: todayAppts.length,
      pending: todayAppts.filter(a => a.status === 'pending').length,
      confirmed: todayAppts.filter(a => a.status === 'confirmed').length,
      waiting: todayAppts.filter(a => a.status === 'waiting').length,
      inRoom: todayAppts.filter(a => a.status === 'in-room').length,
      completed: todayAppts.filter(a => a.status === 'completed').length,
      cancelled: todayAppts.filter(a => a.status === 'cancelled').length,
    };

    // Patient count
    const [{ count: patientCount }] = await db('patients')
      .where({ organization_id: orgId })
      .count('id as count');

    // This month's invoice stats
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const invoicesMonth = await db('invoices')
      .where({ organization_id: orgId })
      .where('created_at', '>=', monthStart)
      .select('status', 'amount');

    const invoiceStats = {
      total: invoicesMonth.length,
      paid: invoicesMonth.filter(i => i.status === 'paid').length,
      pending: invoicesMonth.filter(i => i.status === 'pending').length,
      totalAmount: invoicesMonth.reduce((s, i) => s + Number(i.amount || 0), 0),
    };

    // Doctor-specific: their own appointments today
    let doctorContext = '';
    if (userRole === 'doctor') {
      const myAppts = await db('appointments')
        .where({ organization_id: orgId, doctor_id: userId })
        .whereRaw("DATE(scheduled_at) = ?", [todayStr])
        .join('patients', 'appointments.patient_id', 'patients.id')
        .select(
          'appointments.status',
          'appointments.reason',
          'appointments.scheduled_at',
          'patients.first_name',
          'patients.last_name',
        )
        .orderBy('appointments.scheduled_at', 'asc')
        .limit(10);

      if (myAppts.length > 0) {
        doctorContext = `\n\n## Vos consultations aujourd'hui (${myAppts.length}):\n`;
        myAppts.forEach(a => {
          const heure = new Date(a.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          doctorContext += `- ${heure} · ${a.first_name} ${a.last_name} · ${a.reason || 'Consultation générale'} · Statut: ${a.status}\n`;
        });
      }
    }

    return {
      clinicName,
      dateLabel,
      apptStats,
      patientCount: Number(patientCount),
      invoiceStats,
      doctorContext,
    };
  } catch {
    // Context injection is best-effort — never block the AI response
    return null;
  }
}

// ─── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt(role, context) {
  const date = context?.dateLabel || new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const clinic = context?.clinicName || 'la clinique';

  const base = `Tu es **Awa**, l'assistante IA intelligente intégrée à **CliniqueCI** — une application SaaS de gestion de cliniques privées à Abidjan, Côte d'Ivoire.

**Date d'aujourd'hui :** ${date}
**Clinique :** ${clinic}

## Règles absolues
- Tu réponds TOUJOURS en français, avec un langage adapté à l'interlocuteur
- Tu es précise, utile et concise (pas de remplissage inutile)
- Tu utilises le formatage Markdown (gras, listes) pour la lisibilité
- Tu connais le contexte ivoirien : FCFA, système de santé local, noms locaux
- Tu n'inventes PAS de données patients — tu travailles uniquement avec ce que l'utilisateur te communique
- Si tu n'es pas sûre, tu le dis clairement plutôt que d'inventer`;

  const rolePrompts = {
    doctor: `${base}

## Ton rôle avec le médecin
Tu es un assistant médical expert. Tu aides le médecin à :
- **Rédiger des notes de consultation** structurées (motif, anamnèse, examen, diagnostic, conduite)
- **Structurer des ordonnances** avec posologie claire
- **Explorer des diagnostics différentiels** pour les cas complexes
- **Répondre aux questions** de pharmacologie, protocoles, et médecine générale
- **Préparer des résumés** avant consultation

## Limites médicales importantes
- Tu PROPOSES des pistes — jamais de diagnostic définitif
- Tu rappelles toujours l'importance de l'examen clinique physique
- Pour les urgences, tu orientes vers les protocoles d'urgence

${context?.doctorContext || ''}
${context?.apptStats ? `\n## Agenda aujourd'hui : ${context.apptStats.total} RDV (${context.apptStats.confirmed} confirmés, ${context.apptStats.completed} terminés, ${context.apptStats.waiting} en attente)` : ''}`,

    secretary: `${base}

## Ton rôle avec la secrétaire médicale
Tu es une assistante administrative efficace. Tu aides à :
- **Gérer et optimiser l'agenda** : créneaux, conflits, rappels patients
- **Rédiger des communications** : SMS/emails de rappel, confirmations de RDV
- **Suivre les paiements** : factures en attente, rappels de règlement
- **Accueillir et orienter** les patients

## Ce que tu NE fais PAS pour la secrétaire
- Jamais d'accès aux notes médicales confidentielles ou diagnostics
- Jamais de validation d'actes médicaux

${context?.apptStats ? `\n## Agenda aujourd'hui : ${context.apptStats.total} RDV total
- En attente : ${context.apptStats.pending} · Confirmés : ${context.apptStats.confirmed}
- Salle d'attente : ${context.apptStats.waiting} · En consultation : ${context.apptStats.inRoom}
- Terminés : ${context.apptStats.completed} · Annulés : ${context.apptStats.cancelled}` : ''}
${context?.invoiceStats ? `\n## Facturation ce mois : ${context.invoiceStats.total} factures · ${context.invoiceStats.pending} en attente · ${context.invoiceStats.totalAmount.toLocaleString('fr-FR')} FCFA total` : ''}`,

    admin: `${base}

## Ton rôle avec l'administrateur
Tu es un assistant de gestion stratégique. Tu aides à :
- **Analyser les performances** : taux d'occupation, CA, tendances
- **Optimiser les processus** : planification, ressources humaines
- **Générer des rapports** : activité, finances, qualité de service
- **Identifier des axes d'amélioration** opérationnelle

${context?.apptStats ? `\n## Aujourd'hui : ${context.apptStats.total} RDV · ${context.apptStats.completed} terminés` : ''}
${context?.patientCount ? `**Patients enregistrés :** ${context.patientCount}` : ''}
${context?.invoiceStats ? `**Ce mois :** ${context.invoiceStats.total} factures · ${context.invoiceStats.paid} payées · ${context.invoiceStats.totalAmount.toLocaleString('fr-FR')} FCFA` : ''}`,

    patient: `${base}

## Ton rôle avec le patient
Tu es une assistante patiente et bienveillante. Tu aides le patient à :
- **Comprendre son parcours de soins** à la clinique
- **Se préparer à sa consultation** : documents à apporter, questions à poser
- **Comprendre des termes médicaux** courants (vulgarisés, pas techniques)
- **Gérer ses rendez-vous** : prise, modification, annulation

## Limites importantes avec les patients
- JAMAIS de diagnostic ou d'interprétation de résultats d'examens
- Pour toute question médicale précise → orienter vers le médecin
- En cas d'urgence → orienter vers le SAMU (15) ou les urgences

Tu t'exprimes simplement, avec empathie, sans jargon médical.`,
  };

  return rolePrompts[role] || rolePrompts.patient;
}

// ─── Fallback demo responses (when API unavailable) ──────────────────────────
function getDemoResponse(message, userRole, context) {
  const msg = (message || '').toLowerCase();
  const clinic = context?.clinicName || 'la clinique';

  if (msg.match(/bonjour|salut|bonsoir|hello|hi\b|coucou/)) {
    const greetings = {
      doctor: `Bonjour Docteur ! Je suis **Awa**, votre assistante IA.\n\n${context?.doctorContext ? `Voici votre agenda :\n${context.doctorContext}\n\n` : ''}Je peux vous aider à rédiger vos notes de consultation, explorer des diagnostics différentiels ou structurer une ordonnance. Par quoi commençons-nous ?`,
      secretary: `Bonjour ! Je suis **Awa**.\n\n${context?.apptStats ? `📅 Aujourd'hui : **${context.apptStats.total} rendez-vous** (${context.apptStats.confirmed} confirmés, ${context.apptStats.waiting} en salle d'attente).\n\n` : ''}Comment puis-je vous aider avec l'agenda ou les patients ?`,
      admin: `Bonjour ! Je suis **Awa**, votre assistante de gestion.\n\n${context?.patientCount ? `**${context.patientCount} patients** enregistrés à ${clinic}.\n` : ''}${context?.invoiceStats ? `Ce mois : **${context.invoiceStats.totalAmount.toLocaleString('fr-FR')} FCFA** de facturation.\n\n` : ''}Que souhaitez-vous analyser ?`,
      patient: `Bonjour ! Je suis **Awa**, l'assistante de ${clinic}. Je suis là pour vous aider à préparer votre consultation ou répondre à vos questions sur la clinique.\n\nComment puis-je vous aider ?`,
    };
    return greetings[userRole] || greetings.patient;
  }

  if (msg.match(/agend|rendez.?vous|planning|cr.neau|rdv|aujourd.hui|journée|planning/)) {
    if (context?.apptStats && context.apptStats.total > 0) {
      const s = context.apptStats;
      return `📅 **Agenda d'aujourd'hui — ${clinic}**\n\n- **Total :** ${s.total} rendez-vous\n- **Confirmés :** ${s.confirmed}\n- **En salle d'attente :** ${s.waiting}\n- **En consultation :** ${s.inRoom}\n- **Terminés :** ${s.completed}\n- **Annulés :** ${s.cancelled}\n\nVoulez-vous que je vous aide à rédiger des rappels patients ou à optimiser les créneaux ?`;
    }
    return `📅 Votre agenda est vide pour aujourd'hui.\n\nVoulez-vous que je vous aide à planifier des créneaux ou à rédiger un message de disponibilité pour les patients ?`;
  }

  if (msg.match(/note|consultation|r.dige|compte.?rendu|cr.dite|prescrip/)) {
    return `**Modèle de note de consultation**\n\n**Motif de consultation :** _(à dicter)_\n\n**Anamnèse :**\nPatient de ___ ans, se présente pour...\n\n**Examen clinique :**\n- TA : ___/___ mmHg · FC : ___ bpm · Temp : ___°C\n- Examen général : ...\n\n**Diagnostic retenu :**\n\n**Conduite à tenir :**\n- Traitement : ...\n- Examens complémentaires : ...\n\n**Prochain contrôle :** ___\n\n---\n_Dictez-moi les éléments et je rédige la note complète._`;
  }

  if (msg.match(/ordonnance|prescription|médicament|posologie/)) {
    return `**Assistant ordonnance** ✍️\n\nDictez-moi les médicaments, dosages et durées — je formate l'ordonnance.\n\nExemple : *"Paracétamol 500mg, 3 fois par jour pendant 5 jours"*\n\nJe structurerai le tout avec les informations de la clinique et les conseils au patient.`;
  }

  if (msg.match(/facture|paiement|caisse|facturation|argent|montant|solde|finances?/)) {
    if (context?.invoiceStats) {
      const inv = context.invoiceStats;
      return `💰 **Facturation — ce mois**\n\n- **Total factures :** ${inv.total}\n- **Payées :** ${inv.paid}\n- **En attente :** ${inv.pending}\n- **Montant total :** ${inv.totalAmount.toLocaleString('fr-FR')} FCFA\n\nVoulez-vous que je génère un message de relance pour les factures impayées ?`;
    }
    return `Je peux vous aider à suivre les factures et préparer des relances de paiement. Consultez le module **Facturation** pour le détail des règlements en attente.`;
  }

  if (msg.match(/patient|dossier|ant.c.dent|malade|nom/)) {
    return `Je peux vous aider à préparer un résumé patient. Communiquez-moi :\n\n1. **Le nom du patient** (je n'ai pas accès directement aux dossiers)\n2. **Le motif de consultation**\n3. **Les antécédents pertinents**\n\nJe structurerai un résumé clair pour la consultation.`;
  }

  const fallbacks = {
    doctor: `Comment puis-je vous aider, Docteur ?\n\n- 📋 **Rédiger une note de consultation**\n- 💊 **Structurer une ordonnance**\n- 🔬 **Explorer des diagnostics différentiels**\n- 📊 **Résumer un dossier patient**`,
    secretary: `Comment puis-je vous aider ?\n\n- 📅 **Vérifier l'agenda du jour**\n- 📨 **Rédiger un rappel patient**\n- 💰 **Suivre les factures en attente**\n- 📞 **Préparer un message d'accueil**`,
    admin: `Comment puis-je vous aider ?\n\n- 📈 **Analyser l'activité de la clinique**\n- 💰 **Rapport financier mensuel**\n- 👥 **Suivi des patients et médecins**\n- ⚙️ **Recommandations d'optimisation**`,
    patient: `Comment puis-je vous aider ?\n\n- 📅 **Votre prochain rendez-vous**\n- ❓ **Questions sur la clinique**\n- 📋 **Comment se préparer à une consultation**\n- 🏥 **Informations générales de santé**`,
  };
  return fallbacks[userRole] || fallbacks.patient;
}

// ─── Route ───────────────────────────────────────────────────────────────────
module.exports = function awaRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  router.post('/chat', async (req, res, next) => {
    try {
      const { messages, userRole } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages requis' });
      }

      // Fetch real clinic context
      const context = await buildClinicContext(db, req.orgId, req.user.id, userRole);
      const systemPrompt = buildSystemPrompt(userRole, context);
      const lastUserMsg = messages.filter(m => m.role === 'user').at(-1)?.content || '';

      if (!process.env.ANTHROPIC_API_KEY) {
        return res.json({ content: getDemoResponse(lastUserMsg, userRole, context) });
      }

      try {
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        // Anthropic API requires messages to start with a 'user' message.
        // The frontend may include an initial assistant greeting (UI chrome) —
        // strip any leading assistant messages before sending to the API.
        let apiMessages = messages.map(m => ({
          role: m.role,
          content: String(m.content),
        }));
        const firstUserIdx = apiMessages.findIndex(m => m.role === 'user');
        if (firstUserIdx === -1) {
          // No user message at all — nothing to send to the AI
          return res.json({ content: getDemoResponse(lastUserMsg, userRole, context) });
        }
        if (firstUserIdx > 0) {
          apiMessages = apiMessages.slice(firstUserIdx);
        }

        const response = await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          system: systemPrompt,
          messages: apiMessages,
        });

        return res.json({ content: response.content[0].text });
      } catch (apiErr) {
        // Fallback to demo for quota / billing errors — log for diagnostics
        if (apiErr.status === 429 || apiErr.status === 402) {
          console.warn('[Awa] API quota/billing error, falling back to demo:', apiErr.status);
          return res.json({ content: getDemoResponse(lastUserMsg, userRole, context) });
        }
        // 400: malformed request — log and fall back so the user isn't blocked
        if (apiErr.status === 400) {
          console.error('[Awa] API 400 error:', apiErr.message || apiErr);
          return res.json({ content: getDemoResponse(lastUserMsg, userRole, context) });
        }
        throw apiErr;
      }
    } catch (err) {
      next(err);
    }
  });

  return router;
};

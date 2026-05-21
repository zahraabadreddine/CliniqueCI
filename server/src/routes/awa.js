const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const authenticate = require('../middleware/authenticate');
const tenant = require('../middleware/tenant');

const SYSTEM_PROMPTS = {
  doctor: `Tu es Awa, l'assistante IA de CliniqueCI, une application de gestion de cliniques à Abidjan.
Tu assistes le médecin : aide à rédiger des notes de consultation, préparer des résumés patients, suggérer des diagnostics différentiels, et répondre aux questions médicales générales.
Tu réponds toujours en français, de manière concise et professionnelle.
Tu ne poses jamais de diagnostic définitif — tu proposes des pistes et rappelles l'importance de l'examen clinique.
Tu n'as pas accès aux données patients réelles sauf celles que le médecin te communique dans la conversation.`,

  secretary: `Tu es Awa, l'assistante IA de CliniqueCI, une application de gestion de cliniques à Abidjan.
Tu assistes la secrétaire médicale : aide à gérer le planning, rédiger des messages aux patients, optimiser les créneaux, et répondre aux questions administratives.
Tu réponds toujours en français, de manière claire et pratique.`,

  patient: `Tu es Awa, l'assistante IA de CliniqueCI, une application de gestion de cliniques à Abidjan.
Tu es une assistante bienveillante qui aide les patients à comprendre leur parcours de soins, prendre des rendez-vous, et répondre à leurs questions générales sur la santé.
Tu réponds toujours en français, simplement et avec empathie.
Ne pose jamais de diagnostic — oriente toujours vers le médecin pour toute question médicale précise.`,

  admin: `Tu es Awa, l'assistante IA de CliniqueCI, une application de gestion de cliniques à Abidjan.
Tu assistes l'administrateur : aide à analyser les données de la clinique, optimiser les processus, et répondre aux questions de gestion.
Tu réponds toujours en français, de manière professionnelle.`,
};

// Demo responses for when the API has no credits (realistic responses for clinic demo)
function getDemoResponse(message, userRole) {
  const msg = (message || '').toLowerCase();

  // Greeting / identity
  if (msg.match(/bonjour|salut|bonsoir|hello|qui es.?tu|présente|présentation/)) {
    return `Bonjour ! Je suis **Awa**, votre assistante IA intégrée à CliniqueCI. 🌿

Je suis conçue pour aider l'équipe de la clinique à :
- **Préparer des résumés** de dossiers patients avant consultation
- **Rédiger des notes** médicales et administratives
- **Optimiser le planning** et gérer les rendez-vous
- **Répondre aux questions** médicales et administratives courantes

Comment puis-je vous aider aujourd'hui ?`;
  }

  // Appointment / agenda
  if (msg.match(/rendez.?vous|agenda|planning|créneau|disponib/)) {
    if (userRole === 'secretary' || userRole === 'admin') {
      return `Pour optimiser votre agenda d'aujourd'hui, voici mes suggestions :

📅 **Gestion des créneaux**
- Vous avez 4 rendez-vous confirmés ce matin
- Je recommande de garder un créneau tampon de 15 min entre les consultations longues
- Ousmane Diallo (09h00) est marqué "Confirmé" — pensez à préparer son dossier

📞 **Rappels patients**
Les patients avec rendez-vous cet après-midi n'ont pas encore reçu leur SMS de rappel. Souhaitez-vous que je rédige un message de rappel type ?`;
    }
    return `Voici vos rendez-vous du jour :

**08h30** — Karim Meïté · Consultation générale ✅ Terminé
**09h00** — Ousmane Diallo · Renouvellement ordonnance 🔵 Confirmé
**10h00** — Fatou Koné · Contrôle tension artérielle ✅ Terminé
**11h30** — Karim Meïté · Bilan sanguin ✅ Terminé

Souhaitez-vous que je prépare un résumé du dossier d'Ousmane Diallo avant sa consultation ?`;
  }

  // Patient summary / dossier
  if (msg.match(/résumé|dossier|patient|antécédent|historique/)) {
    return `**Résumé patient — Ousmane Diallo**
📋 *Préparé par Awa AI*

**Motif de la visite :** Renouvellement d'ordonnance

**Antécédents notables :**
- Hypertension artérielle traitée depuis 2 ans
- Diabète de type 2 sous metformine

**Dernière consultation :** Mars 2026
- TA : 135/85 mmHg (contrôlée)
- Glycémie à jeun : 1,15 g/L

**Médicaments en cours :**
- Amlodipine 5mg · 1cp/jour
- Metformine 500mg · 2cp/jour

**Points d'attention :** Rappeler la surveillance glycémique régulière et la diète.

*Ce résumé est généré à titre indicatif. Vérifiez toujours le dossier complet avant consultation.*`;
  }

  // Diagnosis / medical question
  if (msg.match(/diagnostic|symptôme|traitement|médicament|maladie|douleur|fièvre|tension/)) {
    return `**Pistes diagnostiques à considérer** *(avis non médical — pour discussion uniquement)*

Sur la base des symptômes décrits, les hypothèses à explorer avec l'examen clinique :

1. **Hypothèse principale** — À détailler selon les constantes vitales et l'anamnèse complète
2. **Diagnostic différentiel** — Plusieurs étiologies sont envisageables

📌 **Rappel important :** Je peux vous aider à structurer vos notes et explorer des pistes, mais le diagnostic final appartient au clinicien après examen complet du patient.

Souhaitez-vous que je vous aide à rédiger la note de consultation ?`;
  }

  // Invoice / billing
  if (msg.match(/facture|paiement|tarif|prix|facturation|caisse/)) {
    return `**Aperçu facturation du jour**

💰 **Statistiques (aujourd'hui)**
- Consultations facturées : 3
- Total encaissé : 45 000 FCFA
- En attente de règlement : 15 000 FCFA (1 facture)

📊 **Ce mois-ci**
- Chiffre d'affaires : 380 000 FCFA
- Consultations : 28
- Taux de recouvrement : 94%

Souhaitez-vous que je génère un rapport de facturation détaillé ?`;
  }

  // Prescription / ordonnance
  if (msg.match(/ordonnance|prescription|médicament|posologie/)) {
    return `**Assistant ordonnance** ✍️

Je peux vous aider à structurer une ordonnance. Voici un modèle standard :

---
*Clinique du Plateau — Dr. [Nom]*
*Date : 21 Mai 2026*

**Patient :** [Nom complet]

**Prescriptions :**
1. [Médicament] [Dosage] — [Posologie] pendant [durée]
2. [Médicament] [Dosage] — [Posologie] pendant [durée]

**Conseils :** [Instructions particulières]

*Prochain contrôle : [Date]*
---

Dictez-moi les médicaments à inclure et je formate l'ordonnance pour vous.`;
  }

  // Note / rédaction
  if (msg.match(/note|rédige|écris|compte.?rendu|rapport/)) {
    return `Bien sûr, je peux vous aider à rédiger. Voici une structure suggérée :

**Note de consultation**

**Motif :** [À préciser]
**Anamnèse :** Le patient se présente pour...
**Examen clinique :** TA : _/_ mmHg · FC : _ bpm · Temp : _°C
**Diagnostic retenu :** [À préciser]
**Conduite à tenir :** [Traitement / examens complémentaires]
**Prochain RDV :** [Date]

Donnez-moi les éléments de la consultation et je rédigerai la note complète.`;
  }

  // Statistics / reporting
  if (msg.match(/statistique|rapport|analyse|performance|chiffre/)) {
    return `**Tableau de bord analytique — Mai 2026**

📈 **Activité clinique**
- Consultations ce mois : 28 (+12% vs avril)
- Nouveaux patients : 8
- Taux d'occupation : 78%

⏱️ **Efficacité**
- Durée moyenne de consultation : 22 min
- Taux de présence aux RDV : 91%
- Délai moyen d'attente : 8 min

🏆 **Points forts**
- Excellente fidélisation patients (72% de retours)
- Créneaux du mardi matin très demandés

💡 **Recommandation :** Ajouter un créneau le mardi après-midi pour absorber la demande.`;
  }

  // Generic / fallback demo
  const roleResponses = {
    doctor: `Je suis à votre disposition, Docteur. Je peux vous aider à :
- **Préparer vos consultations** avec des résumés patients
- **Rédiger vos notes** de consultation et ordonnances
- **Explorer des diagnostics différentiels** pour les cas complexes
- **Répondre à vos questions** médicales générales

Quelle est votre demande ?`,

    secretary: `Bonjour ! Je peux vous aider avec :
- **La gestion de l'agenda** et des rendez-vous
- **La rédaction de messages** aux patients
- **Le suivi des factures** et paiements
- **Les rappels** et notifications patients

Comment puis-je vous assister ?`,

    admin: `Bonjour ! En tant qu'administrateur, je peux vous fournir :
- **Des analyses de performance** de la clinique
- **Des rapports financiers** et statistiques
- **Des recommandations** pour optimiser les processus
- **Un suivi** des indicateurs clés

Que souhaitez-vous analyser ?`,

    patient: `Bonjour ! Je suis là pour vous aider. Je peux :
- **Vous informer** sur votre prochain rendez-vous
- **Répondre à vos questions** générales sur la clinique
- **Vous orienter** vers le bon médecin selon vos besoins

Pour toute question médicale précise, votre médecin reste votre référence. Comment puis-je vous aider ?`,
  };

  return roleResponses[userRole] || roleResponses.patient;
}

module.exports = function awaRoutes(db) {
  const router = express.Router();
  router.use(authenticate, tenant);

  router.post('/chat', async (req, res, next) => {
    try {
      const { messages, userRole } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages requis' });
      }

      const systemPrompt = SYSTEM_PROMPTS[userRole] || SYSTEM_PROMPTS.patient;

      if (!process.env.ANTHROPIC_API_KEY) {
        const lastUserMsg = messages.filter(m => m.role === 'user').at(-1)?.content || '';
        return res.json({ content: getDemoResponse(lastUserMsg, userRole) });
      }

      try {
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const response = await client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        });

        return res.json({ content: response.content[0].text });
      } catch (apiErr) {
        // If API has no credits or is unavailable, fall back to demo mode
        if (apiErr.status === 400 || apiErr.status === 429 || apiErr.status === 402) {
          const lastUserMsg = messages.filter(m => m.role === 'user').at(-1)?.content || '';
          return res.json({ content: getDemoResponse(lastUserMsg, userRole) });
        }
        throw apiErr;
      }
    } catch (err) {
      next(err);
    }
  });

  return router;
};

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const db = require('./lib/db');
const errorHandler = require('./middleware/errorHandler');
const authenticate = require('./middleware/authenticate');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const patientsRoutes = require('./routes/patients');
const appointmentsRoutes = require('./routes/appointments');
const consultationsRoutes = require('./routes/consultations');
const prescriptionsRoutes = require('./routes/prescriptions');
const invoicesRoutes = require('./routes/invoices');
const awaRoutes = require('./routes/awa');
const auditLogsRoutes = require('./routes/auditLogs');
const notificationsRoutes = require('./routes/notifications');
// New feature routes
const stockRoutes = require('./routes/stock');
const queueRoutes = require('./routes/queue');
const smsRemindersRoutes = require('./routes/smsReminders');
const consentRoutes = require('./routes/consent');
const gdprRoutes = require('./routes/gdpr');
const recordSharesRoutes = require('./routes/recordShares');
const { startSmsCron } = require('./services/smsCron');

// Enable DB-backed is_active check in the authenticate middleware
authenticate.init(db);

const app = express();

// En production (Render), le frontend React est servi depuis le même serveur Express
// → même origine → pas de CORS sur les appels API.
// En développement, on accepte localhost:* pour le proxy Vite.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // En production same-origin, les requêtes API n'ont pas d'origin croisée
    // mais on accepte quand même CLIENT_URL si défini (ex: tests externes)
    const allowed = process.env.CLIENT_URL;
    if (allowed && origin === allowed) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes(db));
app.use('/api/users', usersRoutes(db));
app.use('/api/patients', patientsRoutes(db));
app.use('/api/appointments', appointmentsRoutes(db));
app.use('/api/consultations', consultationsRoutes(db));
app.use('/api/prescriptions', prescriptionsRoutes(db));
app.use('/api/invoices', invoicesRoutes(db));
app.use('/api/awa', awaRoutes(db));
app.use('/api/audit-logs', auditLogsRoutes(db));
app.use('/api/notifications', notificationsRoutes(db));
// New feature routes
app.use('/api/stock', stockRoutes(db));
app.use('/api/queue', queueRoutes(db));
app.use('/api/sms-reminders', smsRemindersRoutes(db));
app.use('/api/consent', consentRoutes(db));
app.use('/api/gdpr', gdprRoutes(db));
app.use('/api/record-shares', recordSharesRoutes(db));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// En production, servir le build React comme fichiers statiques
// (même serveur = même origine = cookies httpOnly sans problème)
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // Catch-all SPA : toute route non-API renvoie index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startSmsCron(db);
  });
}

module.exports = app;

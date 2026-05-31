require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
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

app.use(cors({
  origin: (origin, callback) => {
    // En développement, accepter tous les ports localhost
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // En production, n'accepter que CLIENT_URL
    const allowed = process.env.CLIENT_URL || 'http://localhost:5173';
    callback(origin === allowed ? null : new Error('CORS non autorisé'), origin === allowed);
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

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startSmsCron(db);
  });
}

module.exports = app;

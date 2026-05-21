require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), override: true });
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const db = require('./lib/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const patientsRoutes = require('./routes/patients');
const appointmentsRoutes = require('./routes/appointments');
const consultationsRoutes = require('./routes/consultations');
const prescriptionsRoutes = require('./routes/prescriptions');
const invoicesRoutes = require('./routes/invoices');
const awaRoutes = require('./routes/awa');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

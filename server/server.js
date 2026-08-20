const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, getDBStatus } = require('./config/db');
const seedDatabase = require('./seed/seedData');
const { initMaintenanceCron } = require('./utils/cronAlerts');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/machines', require('./routes/machines'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/maintenance', require('./routes/maintenance'));

// System Health & Info Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'Keltron Component Complex Limited - MPP Section EMS',
    db: getDBStatus(),
    timestamp: new Date().toISOString()
  });
});

// Seed API endpoint for manual re-seeding if needed
app.post('/api/seed', async (req, res) => {
  try {
    await seedDatabase();
    res.json({ message: 'Database successfully re-seeded with MPP section employees and machines.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

// Initialize Server
connectDB().then(async () => {
  // Seed Database on launch if no employees exist
  const Employee = require('./models/Employee');
  const empCount = await Employee.countDocuments();
  if (empCount === 0) {
    console.log('📦 Database empty. Seeding initial MPP section employee roster & machines...');
    await seedDatabase();
  }

  // Initialize Maintenance Cron Job
  initMaintenanceCron();

  app.listen(PORT, () => {
    console.log(`🚀 Keltron MPP EMS Server running on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  });
}).catch(err => {
  console.error('Server startup error:', err);
});

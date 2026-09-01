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

// Public Privacy Policy Endpoint (Required for Google Play Store Compliance)
app.get(['/privacy-policy', '/api/privacy-policy'], (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Keltron MPP EMS</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 24px; background-color: #f8fafc; }
    .container { background: #ffffff; padding: 36px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    h1 { color: #0284c7; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    h2 { color: #0f172a; margin-top: 24px; }
    .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 13px; margin-bottom: 16px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
    .contact-box { background: #f1f5f9; padding: 16px; border-radius: 8px; margin-top: 24px; border-left: 4px solid #0284c7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Official Privacy Policy</div>
    <h1>Keltron MPP EMS — Privacy Policy</h1>
    <p><strong>Last Updated:</strong> August 30, 2026</p>

    <p>This Privacy Policy applies to the <strong>Keltron MPP EMS (Employee Management System)</strong> mobile application and web platform developed for <strong>Keltron Component Complex Ltd (MPP Section)</strong>, Kannur, Kerala.</p>

    <h2>1. Information We Collect</h2>
    <ul>
      <li><strong>Employee Profile Data:</strong> Employee Token Number, Full Name, Department, Designation, Assigned Shift Schedule, and Contact Details for workforce identity and payroll processing.</li>
      <li><strong>Location Data (Foreground & Background):</strong> The app collects precise and approximate location data using <code>ACCESS_FINE_LOCATION</code>, <code>ACCESS_BACKGROUND_LOCATION</code>, and <code>FOREGROUND_SERVICE_LOCATION</code> permissions to enable automated attendance recording (Auto Punch-In and Auto Punch-Out) when entering or leaving the 300-meter perimeter of the Keltron Kannur Plant.</li>
      <li><strong>Attendance & Work Logs:</strong> Punch-in times, punch-out times, total hours worked, overtime hours, and shift status.</li>
    </ul>

    <h2>2. Use of Background Location</h2>
    <p><strong>Keltron MPP EMS requires background location access to provide automated geofence attendance tracking.</strong></p>
    <ul>
      <li>Location data is accessed in the background even when the app is closed or not in use, solely to determine if the employee has entered or exited the authorized Keltron Kannur plant perimeter (11.983878° N, 75.374253° E).</li>
      <li>Location coordinates are evaluated strictly on-device to compute boundary distances. Location data is NOT tracked continuously outside the shift attendance windows and is NEVER sold, rented, or shared with any third parties or advertisers.</li>
    </ul>

    <h2>3. Data Protection & Security</h2>
    <p>We implement enterprise-grade cryptographic security and strict role-based access control (RBAC) to ensure that employee records, attendance timestamps, and payroll details are securely stored and protected against unauthorized access.</p>

    <h2>4. Data Retention & Deletion</h2>
    <p>Attendance records and employee profiles are retained securely for the duration of the employee's employment in accordance with statutory labor regulations. Employees may request data review or correction by contacting the site administrator.</p>

    <h2>5. Contact Us</h2>
    <div class="contact-box">
      <p><strong>Keltron Component Complex Limited (KCCL)</strong><br>
      MPP Section, Kalliasseri, Kannur, Kerala - 670562, India<br>
      <strong>Developer & Privacy Inquiries:</strong> <a href="mailto:dinildasc@gmail.com">dinildasc@gmail.com</a></p>
    </div>
  </div>
</body>
</html>`);
});

// Serverless DB Connection Middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
    res.status(500).json({ error: 'Database Connection Error' });
  }
});

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

if (require.main === module) {
  connectDB().then(async () => {
    const Employee = require('./models/Employee');
    const empCount = await Employee.countDocuments();
    if (empCount === 0) {
      console.log('📦 Database empty. Seeding initial MPP section employee roster & machines...');
      await seedDatabase();
    }
    initMaintenanceCron();

    app.listen(PORT, () => {
      console.log(`🚀 Keltron MPP EMS Server running on port ${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📜 Privacy Policy: http://localhost:${PORT}/privacy-policy`);
    });
  }).catch(err => {
    console.error('Server startup error:', err);
  });
}

module.exports = app;

# Keltron Component Complex Limited - MPP Section Employee Management System (EMS)

Full-stack MERN Employee Management System (EMS) designed specifically for the **MPP (Manufacturing Section)** of **Keltron Component Complex Limited**, managing over 40 active employees, 12 specialized machines, automated weekly shift rosters, punch-in/out attendance, 25th-25th billing cycle payroll calculations, and machine cleaning cron alerts.

## 🚀 Key Features

- **Site Admin & Supervisor Control**: Unique Site Admin (`/admin`) to appoint Supervisors by Token Number. Supervisor approval required before new employee accounts can punch in.
- **Machine Expertise Matching**: Registration collects machine expertise for MPP Winding (5), Testing (3), and Metalizing (4) machines.
- **Automated Weekly Shift Scheduler**: Generates notice-board formatted shift rosters matching official Keltron notices (Shift 1, Shift 2, Shift 3 minimal crew, and General Shift female priority).
- **Attendance & Punch-in/out**: Live digital clock terminal capturing timestamps and automatic overtime (>7.5 hrs).
- **Payroll & Salary Engine**: Calculates payroll for 25th to 25th cycle with 2x Overtime rate and 2x Sunday wages.
- **Machine Cleaning Alerts**: Scheduled cron system for 2-week Metalizing central cleaning and 1-month General machine cleaning alerts.
- **MongoDB Atlas Cluster Support**: Supports cloud MongoDB Atlas with local MongoDB fallback.

## 🛠️ Project Setup

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..

# Start full-stack application (Server on 5000, Client on 5173)
npm run dev
```

## 🌐 API Routes

- `POST /api/auth/register`: Public Employee Registration (Pending Approval)
- `POST /api/auth/login`: Account Authentication
- `POST /api/auth/create-supervisor`: Appoint Supervisor by Token No (Site Admin only)
- `GET /api/employees`: List active workforce
- `POST /api/employees/approve/:id`: Supervisor / Site Admin account approval
- `POST /api/shifts/auto-generate`: Automated Weekly Shift Roster Generator
- `POST /api/attendance/punch-in`: Clock Punch In (Requires Supervisor Approval)
- `POST /api/attendance/punch-out`: Clock Punch Out
- `POST /api/payroll/calculate`: Batch Payroll Engine (25th-25th Cycle)
- `GET /api/maintenance`: Machine Cleaning Cron Alerts

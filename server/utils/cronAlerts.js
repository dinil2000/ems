const cron = require('node-cron');
const Machine = require('../models/Machine');
const MaintenanceAlert = require('../models/MaintenanceAlert');

const checkMaintenanceAlerts = async () => {
  try {
    const machines = await Machine.find({ status: 'Operational' });
    const now = new Date();

    for (const m of machines) {
      // 1. Metalizing Machine 2-Week Central Cleaning Check
      if (m.category === 'Metalizing') {
        const lastClean = m.lastCentralCleaned || new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
        const daysDiff = (now - new Date(lastClean)) / (1000 * 60 * 60 * 24);

        if (daysDiff >= 14) {
          const nextDue = new Date(new Date(lastClean).getTime() + 14 * 24 * 60 * 60 * 1000);
          await MaintenanceAlert.findOneAndUpdate(
            {
              machineId: m.machineId,
              alertType: 'Central Cleaning - Metalizing (Every 2 Weeks)',
              status: { $in: ['Pending', 'Overdue'] },
            },
            {
              machineId: m.machineId,
              machineCategory: 'Metalizing',
              alertType: 'Central Cleaning - Metalizing (Every 2 Weeks)',
              frequencyDays: 14,
              lastCleanedDate: lastClean,
              nextDueDate: nextDue,
              status: daysDiff > 14 ? 'Overdue' : 'Pending',
              notes: `Vacuum chamber & electrode central cleaning due for Metalizing machine #${m.machineId}.`,
            },
            { upsert: true, new: true }
          );
        }
      }

      // 2. All MPP Machines 1-Month General Cleaning Check
      const lastGenClean = m.lastGeneralCleaned || new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
      const genDaysDiff = (now - new Date(lastGenClean)) / (1000 * 60 * 60 * 24);

      if (genDaysDiff >= 30) {
        const nextDue = new Date(new Date(lastGenClean).getTime() + 30 * 24 * 60 * 60 * 1000);
        await MaintenanceAlert.findOneAndUpdate(
          {
            machineId: m.machineId,
            alertType: 'General Machine Cleaning (Every 1 Month)',
            status: { $in: ['Pending', 'Overdue'] },
          },
          {
            machineId: m.machineId,
            machineCategory: m.category,
            alertType: 'General Machine Cleaning (Every 1 Month)',
            frequencyDays: 30,
            lastCleanedDate: lastGenClean,
            nextDueDate: nextDue,
            status: genDaysDiff > 30 ? 'Overdue' : 'Pending',
            notes: `Monthly general inspection & maintenance cleaning due for ${m.name}.`,
          },
          { upsert: true, new: true }
        );
      }
    }
    console.log('⚡ Maintenance alert check executed.');
  } catch (error) {
    console.error('Error checking maintenance alerts:', error.message);
  }
};

// Schedule cron job to run every day at midnight (0 0 * * *)
const initMaintenanceCron = () => {
  cron.schedule('0 0 * * *', () => {
    console.log('⏰ Running daily midnight maintenance cron check...');
    checkMaintenanceAlerts();
  });
  console.log('📅 Maintenance Cron Job initialized (Daily check for 2-week Metalizing & 1-month General cleaning).');
};

module.exports = { checkMaintenanceAlerts, initMaintenanceCron };

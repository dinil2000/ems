const dotenv = require('dotenv');
const { connectDB } = require('../config/db');
const Attendance = require('../models/Attendance');
const { getAssignedShiftStart } = require('../routes/attendance');

dotenv.config({ path: './server/.env' });
dotenv.config();

async function runFix() {
  await connectDB();
  console.log('Connected to MongoDB. Recalculating past attendance shift start times...');

  const records = await Attendance.find({ punchIn: { $exists: true, $ne: null } }).sort({ date: -1 });
  console.log(`Found ${records.length} records to evaluate.`);

  let updatedCount = 0;
  for (const record of records) {
    const punchInDate = new Date(record.punchIn);
    const { shiftStartDate, graceCutoffDate, shiftLabel, shiftName } = await getAssignedShiftStart(record.tokenNo, punchInDate);

    const isLate = punchInDate > graceCutoffDate;
    const lateMinutes = isLate ? Math.max(0, Math.round((punchInDate - shiftStartDate) / (1000 * 60))) : 0;

    const oldShift = record.shiftStartTime;
    const oldLate = record.isLate;

    record.shiftStartTime = shiftLabel;
    record.isLate = isLate;
    record.lateMinutes = lateMinutes;

    if (!isLate) {
      if (record.status === 'Pending Late Approval' || record.status === 'In Progress') {
        record.status = record.punchOut ? 'Present' : 'In Progress';
      }
      record.supervisorApproved = true;
    }

    await record.save();
    updatedCount++;
    console.log(`[Token #${record.tokenNo}] Date: ${punchInDate.toDateString()} | In: ${punchInDate.toLocaleTimeString()} -> Shift: ${shiftLabel} (${shiftName}) | Old: ${oldShift} (Late:${oldLate}) -> New: ${shiftLabel} (Late:${isLate}, ${lateMinutes}m)`);
  }

  console.log(`\n✅ Recalculated and updated ${updatedCount} records successfully.`);
  process.exit(0);
}

runFix().catch(err => {
  console.error('Error running fix:', err);
  process.exit(1);
});

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

    if (record.punchIn && record.punchOut) {
      const pIn = new Date(record.punchIn);
      const pOut = new Date(record.punchOut);
      const diffMs = Math.max(0, pOut - pIn);
      const totalRawHrs = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

      const LUNCH_DEDUCTION = 0.5;
      const STANDARD_WORKING = 7.5;
      const SHIFT_DURATION = 8.0;
      const OT_THRESHOLD = 8.5;

      let workingHours;
      let overtimeHrs;

      if (totalRawHrs >= SHIFT_DURATION) {
        workingHours = STANDARD_WORKING;
      } else if (totalRawHrs > LUNCH_DEDUCTION) {
        workingHours = parseFloat((totalRawHrs - LUNCH_DEDUCTION).toFixed(2));
      } else {
        workingHours = parseFloat(totalRawHrs.toFixed(2));
      }

      if (totalRawHrs > OT_THRESHOLD) {
        overtimeHrs = parseFloat((totalRawHrs - SHIFT_DURATION).toFixed(2));
      } else {
        overtimeHrs = 0;
      }

      record.totalHours = workingHours;
      record.overtimeHours = overtimeHrs;
      record.status = (!isLate || record.supervisorApproved) ? 'Present' : 'Pending Late Approval';
    } else {
      record.status = isLate ? 'Pending Late Approval' : 'In Progress';
    }

    if (!isLate) {
      record.supervisorApproved = true;
    }

    await record.save();
    updatedCount++;
    console.log(`[Token #${record.tokenNo}] Date: ${punchInDate.toDateString()} | In: ${punchInDate.toLocaleTimeString()} -> Shift: ${shiftLabel} (${shiftName}) | Late:${isLate} (${lateMinutes}m) | Work:${record.totalHours}h, OT:${record.overtimeHours}h`);
  }

  console.log(`\n✅ Recalculated and updated ${updatedCount} records successfully.`);
  process.exit(0);
}

runFix().catch(err => {
  console.error('Error running fix:', err);
  process.exit(1);
});

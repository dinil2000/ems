const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const Machine = require('../models/Machine');
const User = require('../models/User');
const MaintenanceAlert = require('../models/MaintenanceAlert');
const ShiftSchedule = require('../models/ShiftSchedule');

const ALL_MACHINES = ['700,705', '701', '710', '711', '765(1)', '765(2)', '766', '0450', '0460', '0480', '0470'];

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database with official Keltron MPP section workforce...');

    // 1. Seed Machines
    await Machine.deleteMany({});
    const machinesData = [
      { machineId: '700,705', name: 'Winding Machine #700/705', category: 'Winding', minStaffRequired: 1, unit: 'Unit 2' },
      { machineId: '701', name: 'Winding Machine #701', category: 'Winding', minStaffRequired: 1, unit: 'Unit 2' },
      { machineId: '0450', name: 'Winding Machine #0450', category: 'Winding', minStaffRequired: 1, unit: 'Unit 1' },
      { machineId: '0460', name: 'Winding Machine #0460', category: 'Winding', minStaffRequired: 1, unit: 'Unit 1' },
      { machineId: '0480', name: 'Testing Machine #0480', category: 'Testing', minStaffRequired: 1, unit: 'Unit 1' },
      { machineId: '710', name: 'Testing Machine #710', category: 'Testing', minStaffRequired: 1, unit: 'Unit 2' },
      { machineId: '711', name: 'Testing Machine #711', category: 'Testing', minStaffRequired: 1, unit: 'Unit 2' },
      { machineId: '0470', name: 'Metalizing Machine #0470', category: 'Metalizing', minStaffRequired: 4, unit: 'Unit 1' },
      { machineId: '765(1)', name: 'Metalizing Machine #765(1)', category: 'Metalizing', minStaffRequired: 4, unit: 'Unit 2' },
      { machineId: '765(2)', name: 'Metalizing Machine #765(2)', category: 'Metalizing', minStaffRequired: 4, unit: 'Unit 2' },
      { machineId: '766', name: 'Metalizing Machine #766', category: 'Metalizing', minStaffRequired: 4, unit: 'Unit 2' },
    ];
    await Machine.insertMany(machinesData);

    // 2. Seed All Employees from Official MPP Notice Sheets (All employees know all machines by default)
    await Employee.deleteMany({});
    const employeesData = [
      // In-Charge & Supervisors
      { tokenNo: '3085', name: 'Bipin E P', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 8, basicSalary: 40000, machineExpertise: ALL_MACHINES, gender: 'Male', isShiftInCharge: true, unit: 'Unit 2', status: 'Active' },
      { tokenNo: '851', name: 'Rahul', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 6, basicSalary: 36000, machineExpertise: ALL_MACHINES, gender: 'Male', isShiftInCharge: true, unit: 'Unit 2', status: 'Active' },

      // Unit 2 Shift 1
      { tokenNo: '8709', name: 'Hamal P V', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '1563', name: 'Rachin Lal', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8662', name: 'Shahil Ali P K', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 4, basicSalary: 32000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '1573', name: 'Manoj', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 5, basicSalary: 25500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '205', name: 'Prathyush', employmentType: 'Casual', qualification: 'ITI', experienceYears: 1, basicSalary: 19500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '1558', name: 'Premarajan', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 7, basicSalary: 38000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '1473', name: 'T. U. Midhun', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 5, basicSalary: 34000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8590', name: 'Ajin Francis', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '482', name: 'Anuraj', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8769', name: 'Rahul K', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 3, basicSalary: 30000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8391', name: 'Pradeesh K', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 6, basicSalary: 36000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '200', name: 'Abhinand Raju', employmentType: 'Casual', qualification: 'ITI', experienceYears: 1, basicSalary: 19500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8652', name: 'Amalnath', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 4, basicSalary: 24000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8705', name: 'Hridyul', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 2, basicSalary: 28000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '1484', name: 'Jimash', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 5, basicSalary: 34000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8660', name: 'Ashwanth A', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },

      // Unit 2 Shift 2
      { tokenNo: '8271', name: 'Sugesh K', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 4, basicSalary: 32000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '562', name: 'Abhilash K', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8787', name: 'Arjun', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '1497', name: 'Dileep S K', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 5, basicSalary: 34000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '1572', name: 'Rejin', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 4, basicSalary: 24000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8563', name: 'Jibin Varghese', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 4, basicSalary: 32000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8512', name: 'Jithin Janardhanan', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8710', name: 'Pradijith', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '494', name: 'Sinan', employmentType: 'Casual', qualification: 'ITI', experienceYears: 1, basicSalary: 19500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '231', name: 'Shamal', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8712', name: 'Mridul A K', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8711', name: 'Dhrushyanth A', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 2, basicSalary: 28000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '160', name: 'Anoop', employmentType: 'Casual', qualification: 'ITI', experienceYears: 1, basicSalary: 19500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8645', name: 'Abhijith', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8344', name: 'Nithin C', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 4, basicSalary: 32000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8357', name: 'Sharath A', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8623', name: 'Mubeen', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8747', name: 'Rishabh', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 3, basicSalary: 30000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },

      // Unit 2 Shift 3 (Night Shift Minimal 6-Employee Crew)
      { tokenNo: '8713', name: 'Yadukrishna M', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 4, basicSalary: 32000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8771', name: 'Abhinav', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8770', name: 'Ajith Gopi', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 5, basicSalary: 34000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8794', name: 'Abhayaraj', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 4, basicSalary: 24000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8793', name: 'Amal Raj', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },
      { tokenNo: '8788', name: 'Deekshith', employmentType: 'Casual', qualification: 'ITI', experienceYears: 1, basicSalary: 19500, machineExpertise: ALL_MACHINES, gender: 'Male', status: 'Active' },

      // Unit 1 Shift 1
      { tokenNo: '2202', name: 'Ajayan', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 6, basicSalary: 27000, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '158', name: 'Augustin Baiju', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '1496', name: 'Vijesh M', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 5, basicSalary: 34000, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '8392', name: 'Ranjith V', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 4, basicSalary: 24000, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '8661', name: 'Shahadan V', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 4, basicSalary: 32000, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '8356', name: 'Dinil Das', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 5, basicSalary: 34000, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '8706', name: 'Sharath M.V.', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '211', name: 'Anuvin', employmentType: 'Casual', qualification: 'ITI', experienceYears: 1, basicSalary: 19500, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },

      // Unit 1 Shift 2
      { tokenNo: '2187', name: 'Sreejil', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 4, basicSalary: 32000, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '561', name: 'Muhad', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '1576', name: 'Akhil V P', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '8239', name: 'Prajool M P', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 4, basicSalary: 32000, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '8591', name: 'Nived Raveendran', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '8707', name: 'Prashin K', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 4, basicSalary: 32000, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '8752', name: 'Hridyul K', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '491', name: 'Ashwanth', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ALL_MACHINES, gender: 'Male', unit: 'Unit 1', status: 'Active' },

      // Female employees (General Shift)
      { tokenNo: '9001', name: 'Anjali Nair', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 5, basicSalary: 34000, machineExpertise: ALL_MACHINES, gender: 'Female', status: 'Active' },
      { tokenNo: '9002', name: 'Deepa V', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 4, basicSalary: 24000, machineExpertise: ALL_MACHINES, gender: 'Female', status: 'Active' },
    ];

    const insertedEmployees = await Employee.insertMany(employeesData);
    console.log(`✅ Seeded ${insertedEmployees.length} official Keltron MPP section employees with ALL machine expertise.`);

    // 3. Seed Users with PASSWORD 'admin61445412' FOR ROOT ADMIN & 'admin' FOR EVERY EMPLOYEE
    await User.deleteMany({});
    const salt = await bcrypt.genSalt(10);
    const rootAdminPasswordHash = await bcrypt.hash('admin61445412', salt);
    const employeeAdminPasswordHash = await bcrypt.hash('admin', salt);

    const usersData = [];

    // Root Site Admin User: admin / ADMIN01 with password admin61445412
    usersData.push({
      employeeToken: 'ADMIN01',
      email: 'admin@keltron.co.in',
      password: rootAdminPasswordHash,
      role: 'SiteAdmin',
    });

    // Supervisor Users
    const supervisor1 = insertedEmployees.find(e => e.tokenNo === '3085');
    const supervisor2 = insertedEmployees.find(e => e.tokenNo === '851');

    if (supervisor1) {
      usersData.push({
        employeeToken: '3085',
        email: 'bipin.supervisor@keltron.co.in',
        password: employeeAdminPasswordHash,
        role: 'Supervisor',
        employeeProfile: supervisor1._id,
      });
    }
    if (supervisor2) {
      usersData.push({
        employeeToken: '851',
        email: 'rahul.supervisor@keltron.co.in',
        password: employeeAdminPasswordHash,
        role: 'Supervisor',
        employeeProfile: supervisor2._id,
      });
    }

    // Pre-register ALL Employee Users with password 'admin'
    insertedEmployees.forEach(emp => {
      if (emp.tokenNo !== '3085' && emp.tokenNo !== '851') {
        usersData.push({
          employeeToken: emp.tokenNo,
          email: `emp${emp.tokenNo}@keltron.co.in`,
          password: employeeAdminPasswordHash,
          role: 'Employee',
          employeeProfile: emp._id,
        });
      }
    });

    const insertedUsers = await User.insertMany(usersData);
    console.log(`✅ Pre-registered ${insertedUsers.length} user login accounts.`);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
  }
};

module.exports = seedDatabase;

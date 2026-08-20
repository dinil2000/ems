const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const Machine = require('../models/Machine');
const User = require('../models/User');
const MaintenanceAlert = require('../models/MaintenanceAlert');
const ShiftSchedule = require('../models/ShiftSchedule');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting MPP Section database seeding...');

    // 1. Seed Machines
    await Machine.deleteMany({});
    const machinesData = [
      { machineId: '700', name: 'Winding Machine #700', category: 'Winding', minStaffRequired: 1, unit: 'Unit 2' },
      { machineId: '705', name: 'Winding Machine #705', category: 'Winding', minStaffRequired: 1, unit: 'Unit 2' },
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
    const insertedMachines = await Machine.insertMany(machinesData);
    console.log(`✅ Seeded ${insertedMachines.length} MPP section machines.`);

    // 2. Seed Employees
    await Employee.deleteMany({});
    const employeesData = [
      // Supervisors
      { tokenNo: '3085', name: 'Bipin E P', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 8, basicSalary: 40000, machineExpertise: ['700', '705', '710'], gender: 'Male', isShiftInCharge: true, unit: 'Unit 2', status: 'Active' },
      { tokenNo: '851', name: 'Rahul', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 6, basicSalary: 36000, machineExpertise: ['765(1)', '766'], gender: 'Male', isShiftInCharge: true, unit: 'Unit 2', status: 'Active' },

      // Unit 2 Winding & Testing
      { tokenNo: '8709', name: 'Hamal P V', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ['700', '705'], gender: 'Male', status: 'Active' },
      { tokenNo: '1563', name: 'Rachin Lal', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ['700', '705'], gender: 'Male', status: 'Active' },
      { tokenNo: '8662', name: 'Shahil Ali P K', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 4, basicSalary: 32000, machineExpertise: ['701'], gender: 'Male', status: 'Active' },
      { tokenNo: '1573', name: 'Manoj', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 5, basicSalary: 25500, machineExpertise: ['710'], gender: 'Male', status: 'Active' },
      { tokenNo: '205', name: 'Prathyush', employmentType: 'Casual', qualification: 'ITI', experienceYears: 1, basicSalary: 19500, machineExpertise: ['710'], gender: 'Male', status: 'Active' },
      { tokenNo: '1558', name: 'Premarajan', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 7, basicSalary: 38000, machineExpertise: ['711'], gender: 'Male', status: 'Active' },

      // Unit 2 Metalizing Crew 765(1)
      { tokenNo: '1473', name: 'T. U. Midhun', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 5, basicSalary: 34000, machineExpertise: ['765(1)'], gender: 'Male', status: 'Active' },
      { tokenNo: '8590', name: 'Ajin Francis', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ['765(1)'], gender: 'Male', status: 'Active' },
      { tokenNo: '482', name: 'Anuraj', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ['765(1)'], gender: 'Male', status: 'Active' },
      { tokenNo: '8769', name: 'Rahul K', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 3, basicSalary: 30000, machineExpertise: ['765(1)'], gender: 'Male', status: 'Active' },

      // Unit 2 Metalizing Crew 765(2)
      { tokenNo: '8391', name: 'Pradeesh K', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 6, basicSalary: 36000, machineExpertise: ['765(2)'], gender: 'Male', status: 'Active' },
      { tokenNo: '200', name: 'Abhinand Raju', employmentType: 'Casual', qualification: 'ITI', experienceYears: 1, basicSalary: 19500, machineExpertise: ['765(2)'], gender: 'Male', status: 'Active' },
      { tokenNo: '8652', name: 'Amalnath', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 4, basicSalary: 24000, machineExpertise: ['765(2)'], gender: 'Male', status: 'Active' },
      { tokenNo: '8705', name: 'Hridyul', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 2, basicSalary: 28000, machineExpertise: ['765(2)'], gender: 'Male', status: 'Active' },

      // Unit 2 Metalizing Crew 766
      { tokenNo: '1484', name: 'Jimash', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 5, basicSalary: 34000, machineExpertise: ['766'], gender: 'Male', status: 'Active' },
      { tokenNo: '8660', name: 'Ashwanth A', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ['766'], gender: 'Male', status: 'Active' },
      { tokenNo: '8645', name: 'Abhijith', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ['766'], gender: 'Male', status: 'Active' },
      { tokenNo: '8344', name: 'Nithin C', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 4, basicSalary: 32000, machineExpertise: ['766'], gender: 'Male', status: 'Active' },

      // Unit 1 Operators
      { tokenNo: '2202', name: 'Ajayan', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 6, basicSalary: 27000, machineExpertise: ['0450'], gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '158', name: 'Augustin Baiju', employmentType: 'Casual', qualification: 'ITI', experienceYears: 2, basicSalary: 21000, machineExpertise: ['0450'], gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '1496', name: 'Vijesh M', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 5, basicSalary: 34000, machineExpertise: ['0460'], gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '8392', name: 'Ranjith V', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 4, basicSalary: 24000, machineExpertise: ['0480'], gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '8661', name: 'Shahadan V', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 4, basicSalary: 32000, machineExpertise: ['0470'], gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '8356', name: 'Dinil Das', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 5, basicSalary: 34000, machineExpertise: ['0470'], gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '8706', name: 'Sharath M.V.', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 3, basicSalary: 22500, machineExpertise: ['0470'], gender: 'Male', unit: 'Unit 1', status: 'Active' },
      { tokenNo: '211', name: 'Anuvin', employmentType: 'Casual', qualification: 'ITI', experienceYears: 1, basicSalary: 19500, machineExpertise: ['0470'], gender: 'Male', unit: 'Unit 1', status: 'Active' },

      // Female employees
      { tokenNo: '9001', name: 'Anjali Nair', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 5, basicSalary: 34000, machineExpertise: ['700', '710'], gender: 'Female', status: 'Active' },
      { tokenNo: '9002', name: 'Deepa V', employmentType: 'Permanent', qualification: 'ITI', experienceYears: 4, basicSalary: 24000, machineExpertise: ['701', '711'], gender: 'Female', status: 'Active' },

      // Pending Approval Demo Registrations (For testing Supervisor Approval workflow!)
      { tokenNo: '9901', name: 'Sanjay Kumar', employmentType: 'Casual', qualification: 'ITI', experienceYears: 1, basicSalary: 19500, machineExpertise: ['700', '705'], gender: 'Male', status: 'Pending Approval' },
      { tokenNo: '9902', name: 'Neethu Sharma', employmentType: 'Permanent', qualification: 'Diploma', experienceYears: 2, basicSalary: 28000, machineExpertise: ['710', '711'], gender: 'Female', status: 'Pending Approval' },
    ];

    const insertedEmployees = await Employee.insertMany(employeesData);
    console.log(`✅ Seeded ${insertedEmployees.length} MPP section employees.`);

    // 3. Seed Users for Authentication (Including SITE ADMIN)
    await User.deleteMany({});
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('mpp12345', salt);
    const adminPasswordHash = await bcrypt.hash('admin', salt);

    const usersData = [];

    // UNIQUE SITE ADMIN USER (Full System Control)
    usersData.push({
      employeeToken: 'ADMIN01',
      email: 'admin@keltron.co.in',
      password: adminPasswordHash,
      role: 'SiteAdmin',
    });

    // Supervisor Accounts
    const supervisor1 = insertedEmployees.find(e => e.tokenNo === '3085');
    const supervisor2 = insertedEmployees.find(e => e.tokenNo === '851');

    if (supervisor1) {
      usersData.push({
        employeeToken: '3085',
        email: 'bipin.supervisor@keltron.co.in',
        password: defaultPasswordHash,
        role: 'Supervisor',
        employeeProfile: supervisor1._id,
      });
    }
    if (supervisor2) {
      usersData.push({
        employeeToken: '851',
        email: 'rahul.supervisor@keltron.co.in',
        password: defaultPasswordHash,
        role: 'Supervisor',
        employeeProfile: supervisor2._id,
      });
    }

    // Standard Employee Users
    insertedEmployees.forEach(emp => {
      if (emp.tokenNo !== '3085' && emp.tokenNo !== '851') {
        usersData.push({
          employeeToken: emp.tokenNo,
          email: `emp${emp.tokenNo}@keltron.co.in`,
          password: defaultPasswordHash,
          role: 'Employee',
          employeeProfile: emp._id,
        });
      }
    });

    const insertedUsers = await User.insertMany(usersData);
    console.log(`✅ Seeded ${insertedUsers.length} user accounts (Including UNIQUE SITE ADMIN).`);

    // 4. Seed Maintenance Alerts
    await MaintenanceAlert.deleteMany({});
    const now = new Date();
    const maintenanceData = [
      {
        machineId: '0470',
        machineCategory: 'Metalizing',
        alertType: 'Central Cleaning - Metalizing (Every 2 Weeks)',
        frequencyDays: 14,
        lastCleanedDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
        nextDueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        status: 'Pending',
        notes: 'High priority vacuum chamber & electrode central cleaning required.',
      },
      {
        machineId: '765(1)',
        machineCategory: 'Metalizing',
        alertType: 'Central Cleaning - Metalizing (Every 2 Weeks)',
        frequencyDays: 14,
        lastCleanedDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        nextDueDate: now,
        status: 'Pending',
        notes: '2-week mandatory central cleaning cycle.',
      }
    ];
    await MaintenanceAlert.insertMany(maintenanceData);
    console.log('🎉 MPP Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
  }
};

module.exports = seedDatabase;

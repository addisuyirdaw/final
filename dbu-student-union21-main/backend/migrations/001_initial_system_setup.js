/**
 * Migration 001: Initial System Setup
 * Seeds default administrator accounts and Ethiopian university references.
 */
const { createDefaultAdmin } = require('../utils/createAdmin');
const { seedUniversities } = require('../utils/seedUniversities');

module.exports = {
  name: '001_initial_system_setup',
  description: 'Creates default admin users and university reference entries',
  async up() {
    console.log('Running migration: 001_initial_system_setup...');
    await createDefaultAdmin();
    await seedUniversities();
    return { status: 'success' };
  },
};


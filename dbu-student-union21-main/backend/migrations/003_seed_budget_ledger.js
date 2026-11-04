/**
 * Migration 003: Seed Budget Ledger
 * Seeds initial financial transparency transactions and micro-grants.
 */
const { seedBudget } = require('../utils/seedBudget');

module.exports = {
  name: '003_seed_budget_ledger',
  description: 'Seeds initial budget transactions and micro-grant proposals',
  async up() {
    console.log('Running migration: 003_seed_budget_ledger...');
    await seedBudget();
    return { status: 'success' };
  },
};


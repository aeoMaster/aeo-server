#!/usr/bin/env node

const { migrateAnalysisFields } = require('../dist/scripts/migrate-analysis-fields');

console.log('🚀 Starting Analysis Fields Migration...');
migrateAnalysisFields()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

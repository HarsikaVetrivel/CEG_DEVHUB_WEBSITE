/**
 * syncSheet.ts — one-shot CLI runner for the Google Sheet sync.
 *
 * Usage:
 *   npm run sync:sheet
 *
 * Useful for testing the sync manually without waiting for the 5-minute
 * scheduler tick, and for verifying service-account credentials.
 */
import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { syncHackathonsFromSheet } from '../services/sheetSync.js';

async function main() {
  console.log('Connecting to database...');
  await connectDatabase();

  console.log('Running Google Sheet sync...');
  const result = await syncHackathonsFromSheet();

  console.log('\n── Sync summary ──────────────────');
  console.log(`  Imported : ${result.imported}`);
  console.log(`  Skipped  : ${result.skipped}  (already in DB)`);
  console.log(`  Errors   : ${result.errors}   (invalid / failed rows)`);
  console.log('──────────────────────────────────\n');

  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});


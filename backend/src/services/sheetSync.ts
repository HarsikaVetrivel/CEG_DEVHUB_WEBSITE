/**
 * sheetSync.ts
 *
 * Polls a private Google Sheet (authenticated via a service account) and
 * imports any rows whose `id` does not yet exist in MongoDB.
 *
 * Imported hackathons are created with:
 *   listingStatus  = 'PUBLISHED'  (auto-publish, per configuration)
 *   sourceType     = 'API'
 *   externalSourceId = sheet row id  (de-duplicates future syncs)
 *   createdBy      = admin account id
 *
 * No existing routes, models, or services are modified.
 */

import mongoose from 'mongoose';
import Hackathon, {
  HACKATHON_DOMAINS,
  HACKATHON_LIFECYCLE_STATUSES,
  HACKATHON_MODES,
  type HackathonDomain,
  type HackathonLifecycleStatus,
  type HackathonMode,
} from '../models/Hackathon.js';
import User from '../models/User.js';
import { env } from '../config/env.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface SheetRow {
  id: string;
  name: string;
  organizer: string;
  description: string;
  registrationUrl: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  location: string;
  mode: string;
  domains: string;
  eligibility: string;
  minimumTeamSize: string;
  maximumTeamSize: string;
  prizeDetails: string;
  requiredSkills: string;
  lifecycleStatus: string;
}

export interface SyncResult {
  imported: number;
  skipped: number;
  errors: number;
}

// ── Google OAuth2 token (service account) ─────────────────────────────────────

/**
 * Exchanges a service-account key for a short-lived access token using the
 * Google OAuth2 JWT Bearer flow — no extra npm packages required.
 */
async function getServiceAccountToken(key: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = key.token_uri ?? 'https://oauth2.googleapis.com/token';

  // Build the JWT header + claim set
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(
    JSON.stringify({
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');

  const signingInput = `${header}.${claim}`;

  // Sign with the service-account private key (RSA-SHA256)
  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(key.private_key, 'base64url');

  const jwt = `${signingInput}.${signature}`;

  // Exchange JWT for access token
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[sheetSync] Failed to obtain service-account token: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// ── Sheet fetching ─────────────────────────────────────────────────────────────

/**
 * Fetches all rows from "Sheet1" of the configured spreadsheet.
 * Row 1 is treated as the header; subsequent rows are returned as SheetRow objects.
 * Empty rows (no `id`) are silently skipped.
 */
async function fetchSheetRows(token: string): Promise<SheetRow[]> {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SHEET_ID)}` +
    `/values/Sheet1`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[sheetSync] Sheets API error: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { values?: string[][] };
  const rows = data.values ?? [];

  if (rows.length < 2) return []; // only header or empty

  const [headers, ...dataRows] = rows;

  return dataRows
    .map((cells) => {
      const get = (col: string) => {
        const idx = headers.indexOf(col);
        return idx >= 0 ? (cells[idx] ?? '').trim() : '';
      };
      return {
        id: get('id'),
        name: get('name'),
        organizer: get('organizer'),
        description: get('description'),
        registrationUrl: get('registrationUrl'),
        startDate: get('startDate'),
        endDate: get('endDate'),
        registrationDeadline: get('registrationDeadline'),
        location: get('location'),
        mode: get('mode'),
        domains: get('domains'),
        eligibility: get('eligibility'),
        minimumTeamSize: get('minimumTeamSize'),
        maximumTeamSize: get('maximumTeamSize'),
        prizeDetails: get('prizeDetails'),
        requiredSkills: get('requiredSkills'),
        lifecycleStatus: get('lifecycleStatus'),
      } as SheetRow;
    })
    .filter((r) => r.id !== ''); // skip rows without an id
}

// ── Validation ─────────────────────────────────────────────────────────────────

interface ValidRow {
  valid: true;
  data: {
    name: string;
    organizer: string;
    description: string;
    registrationUrl: string;
    startDate: Date;
    endDate: Date;
    registrationDeadline: Date;
    location: string;
    mode: HackathonMode;
    domains: HackathonDomain[];
    eligibility: string;
    minimumTeamSize: number;
    maximumTeamSize: number;
    prizeDetails: string;
    requiredSkills: string[];
    lifecycleStatus: HackathonLifecycleStatus;
  };
}

interface InvalidRow {
  valid: false;
  reason: string;
}

type ValidationResult = ValidRow | InvalidRow;

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // Accept ISO dates (2025-06-01) and DD/MM/YYYY
  const isoLike = /^\d{4}-\d{2}-\d{2}/.test(raw)
    ? raw
    : raw.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1');
  const d = new Date(isoLike);
  return isNaN(d.getTime()) ? null : d;
}

function validateRow(row: SheetRow): ValidationResult {
  const required = ['name', 'organizer', 'description', 'registrationUrl', 'startDate', 'endDate',
    'registrationDeadline', 'location', 'mode', 'domains', 'eligibility', 'minimumTeamSize',
    'maximumTeamSize', 'prizeDetails', 'lifecycleStatus'];
  for (const f of required) {
    if (!row[f as keyof SheetRow]) return { valid: false, reason: `Missing required field: ${f}` };
  }

  const startDate = parseDate(row.startDate);
  if (!startDate) return { valid: false, reason: `Invalid startDate: ${row.startDate}` };

  const endDate = parseDate(row.endDate);
  if (!endDate) return { valid: false, reason: `Invalid endDate: ${row.endDate}` };
  if (endDate < startDate) return { valid: false, reason: 'endDate is before startDate' };

  const registrationDeadline = parseDate(row.registrationDeadline);
  if (!registrationDeadline) return { valid: false, reason: `Invalid registrationDeadline: ${row.registrationDeadline}` };

  const mode = row.mode.toUpperCase() as HackathonMode;
  if (!(HACKATHON_MODES as readonly string[]).includes(mode))
    return { valid: false, reason: `Invalid mode: ${row.mode}. Must be one of ${HACKATHON_MODES.join(', ')}` };

  const domains = row.domains
    .split(',')
    .map((d) => d.trim())
    .filter((d) => (HACKATHON_DOMAINS as readonly string[]).includes(d)) as HackathonDomain[];
  if (domains.length === 0)
    return { valid: false, reason: `No valid domains found in: ${row.domains}. Must be from ${HACKATHON_DOMAINS.join(', ')}` };

  const lifecycleStatus = row.lifecycleStatus.toUpperCase() as HackathonLifecycleStatus;
  if (!(HACKATHON_LIFECYCLE_STATUSES as readonly string[]).includes(lifecycleStatus))
    return { valid: false, reason: `Invalid lifecycleStatus: ${row.lifecycleStatus}` };

  const minimumTeamSize = parseInt(row.minimumTeamSize, 10);
  const maximumTeamSize = parseInt(row.maximumTeamSize, 10);
  if (isNaN(minimumTeamSize) || minimumTeamSize < 1)
    return { valid: false, reason: `Invalid minimumTeamSize: ${row.minimumTeamSize}` };
  if (isNaN(maximumTeamSize) || maximumTeamSize < minimumTeamSize)
    return { valid: false, reason: `Invalid maximumTeamSize: ${row.maximumTeamSize}` };

  try {
    const url = new URL(row.registrationUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
      return { valid: false, reason: `Invalid registrationUrl protocol: ${row.registrationUrl}` };
  } catch {
    return { valid: false, reason: `Invalid registrationUrl: ${row.registrationUrl}` };
  }

  return {
    valid: true,
    data: {
      name: row.name,
      organizer: row.organizer,
      description: row.description,
      registrationUrl: row.registrationUrl,
      startDate,
      endDate,
      registrationDeadline,
      location: row.location,
      mode,
      domains,
      eligibility: row.eligibility,
      minimumTeamSize,
      maximumTeamSize,
      prizeDetails: row.prizeDetails,
      requiredSkills: row.requiredSkills ? row.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      lifecycleStatus,
    },
  };
}

// ── Slug helpers (mirrors admin.ts) ───────────────────────────────────────────

const slugify = (name: string, date: Date): string => {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base}-${dateStr}`;
};

const uniqueSlug = async (base: string): Promise<string> => {
  let candidate = base;
  let counter = 0;
  while (true) {
    const exists = await Hackathon.exists({ slug: candidate });
    if (!exists) return candidate;
    counter++;
    candidate = `${base}-${counter}`;
  }
};

// ── Core sync function ─────────────────────────────────────────────────────────

/**
 * Main entry-point called by the scheduler.
 * 1. Obtains a service-account access token.
 * 2. Fetches all rows from the configured sheet.
 * 3. For each new (unseen) row, validates and inserts into MongoDB as PUBLISHED.
 */
export const syncHackathonsFromSheet = async (): Promise<SyncResult> => {
  const result: SyncResult = { imported: 0, skipped: 0, errors: 0 };

  if (!env.GOOGLE_SHEET_ID || !env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON) {
    // Silently no-op if not configured — warning was shown at startup
    return result;
  }

  // Find the admin user to use as createdBy
  const adminUser = await User.findOne({ role: 'ADMIN', isActive: true }).select('_id').lean();
  if (!adminUser) {
    console.error('[sheetSync] No active admin user found — skipping sync.');
    return result;
  }

  // Parse service account key
  let key: ServiceAccountKey;
  try {
    key = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON) as ServiceAccountKey;
  } catch {
    console.error('[sheetSync] GOOGLE_SERVICE_ACCOUNT_KEY_JSON is not valid JSON.');
    return result;
  }

  // Get OAuth token
  let token: string;
  try {
    token = await getServiceAccountToken(key);
  } catch (err) {
    console.error('[sheetSync] Could not obtain Google OAuth token:', err instanceof Error ? err.message : err);
    return result;
  }

  // Fetch rows from the sheet
  let rows: SheetRow[];
  try {
    rows = await fetchSheetRows(token);
  } catch (err) {
    console.error('[sheetSync] Could not fetch sheet rows:', err instanceof Error ? err.message : err);
    return result;
  }

  console.log(`[sheetSync] Fetched ${rows.length} data row(s) from sheet.`);

  for (const row of rows) {
    const externalSourceId = row.id;

    // Skip rows that already exist in MongoDB (de-duplication)
    const exists = await Hackathon.exists({ sourceType: 'API', externalSourceId });
    if (exists) {
      result.skipped++;
      continue;
    }

    // Validate the row
    const validation = validateRow(row);
    if (!validation.valid) {
      console.warn(`[sheetSync] Row id="${externalSourceId}" skipped — ${validation.reason}`);
      result.errors++;
      continue;
    }

    const { data } = validation;

    // Generate a unique slug
    const slug = await uniqueSlug(slugify(data.name, data.startDate));

    // Insert into MongoDB as PUBLISHED
    try {
      await Hackathon.create({
        ...data,
        slug,
        normalizedName: data.name.trim().toLowerCase(),
        normalizedOrganizer: data.organizer.trim().toLowerCase(),
        listingStatus: 'PUBLISHED',
        sourceType: 'API',
        externalSourceId,
        createdBy: adminUser._id,
        approvedBy: adminUser._id,
        approvedAt: new Date(),
        lastUpdatedAt: new Date(),
      });
      console.log(`[sheetSync] ✓ Imported "${data.name}" (row id: ${externalSourceId})`);
      result.imported++;
    } catch (err) {
      // Duplicate key errors (race condition) are benign — log and continue
      if ((err as { code?: number }).code === 11000) {
        console.warn(`[sheetSync] Row id="${externalSourceId}" skipped — duplicate key (race condition).`);
        result.skipped++;
      } else {
        console.error(`[sheetSync] Row id="${externalSourceId}" failed to insert:`, err instanceof Error ? err.message : err);
        result.errors++;
      }
    }
  }

  console.log(
    `[sheetSync] Done — imported: ${result.imported}, skipped: ${result.skipped}, errors: ${result.errors}`,
  );
  return result;
};

// ── Scheduler ─────────────────────────────────────────────────────────────────

let syncRunning = false;

/**
 * Starts the sheet sync background job.
 * Runs once immediately on startup, then every SHEET_SYNC_INTERVAL_MS.
 * Guards against overlapping runs with a simple in-process flag.
 */
export const startSheetSyncScheduler = (): void => {
  if (!env.GOOGLE_SHEET_ID || !env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON) {
    // Not configured — skip silently (warning already shown at startup)
    return;
  }

  const run = () => {
    if (syncRunning) {
      console.log('[sheetSync] Previous sync still running — skipping this tick.');
      return;
    }
    syncRunning = true;
    syncHackathonsFromSheet().finally(() => {
      syncRunning = false;
    });
  };

  // Run immediately on startup
  run();

  // Then on the configured interval (default 5 minutes)
  const interval = setInterval(run, env.SHEET_SYNC_INTERVAL_MS);
  interval.unref(); // Don't block process exit
};

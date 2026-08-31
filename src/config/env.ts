interface AseEnv {
  aseHandle: string;
  aseAppPassword: string;
  aseDid: string;
  databaseUrl: string;
  redisUrl: string;
  swephPath: string;
  ephemerisCacheTtlHours: number;
  phenomenaCheckIntervalHours: number;
  workerConcurrency: number;
  dailyReadingsLimit: number;
  hourlyReadingsLimit: number;
  /** Feature-flagged off by default — the whimsy scheduler is code-complete but hasn't been
   *  turned on for live unattended posting yet. */
  whimsyEnabled: boolean;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, got: ${raw}`);
  }
  return parsed;
}

function optionalBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.toLowerCase() === "true";
}

let cached: AseEnv | null = null;

export function loadEnv(): AseEnv {
  if (cached) return cached;

  cached = {
    aseHandle: required("ASE_HANDLE"),
    aseAppPassword: required("ASE_APP_PASSWORD"),
    aseDid: required("ASE_DID"),
    databaseUrl: required("DATABASE_URL"),
    redisUrl: required("REDIS_URL"),
    swephPath: required("SWEPH_PATH"),
    ephemerisCacheTtlHours: optionalInt("EPHEMERIS_CACHE_TTL_HOURS", 2),
    phenomenaCheckIntervalHours: optionalInt("PHENOMENA_CHECK_INTERVAL_HOURS", 2),
    workerConcurrency: optionalInt("WORKER_CONCURRENCY", 5),
    dailyReadingsLimit: optionalInt("DAILY_READINGS_LIMIT", 20),
    hourlyReadingsLimit: optionalInt("HOURLY_READINGS_LIMIT", 5),
    whimsyEnabled: optionalBool("WHIMSY_ENABLED", false),
  };

  return cached;
}

export type { AseEnv };

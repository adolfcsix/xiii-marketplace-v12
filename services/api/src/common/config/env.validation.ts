function required(name: string, value: string | undefined) {
  if (!value?.trim()) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim();
}

function ensureSecret(name: string, value: string | undefined, production: boolean, min = 32) {
  const v = required(name, value);
  if (production && (v.length < min || /^(change[-_]me|replace[-_]me)/i.test(v))) {
    throw new Error(`${name} must be a non-default secret with at least ${min} characters in production`);
  }
  return v;
}

export function validateEnv(config: Record<string, unknown>) {
  const env = String(config.NODE_ENV || 'development');
  const production = env === 'production';
  const out = { ...config } as Record<string, unknown>;

  out.NODE_ENV = env;
  out.MONGODB_URI = required('MONGODB_URI', String(config.MONGODB_URI || ''));
  out.JWT_ACCESS_SECRET = ensureSecret('JWT_ACCESS_SECRET', String(config.JWT_ACCESS_SECRET || ''), production);
  out.JWT_REFRESH_SECRET = ensureSecret('JWT_REFRESH_SECRET', String(config.JWT_REFRESH_SECRET || ''), production);
  out.PAYOUT_ENCRYPTION_KEY = ensureSecret('PAYOUT_ENCRYPTION_KEY', String(config.PAYOUT_ENCRYPTION_KEY || ''), production);

  const cors = String(config.CORS_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (production && !cors.length) throw new Error('CORS_ORIGINS is required in production');
  if (production && cors.includes('*')) throw new Error('CORS_ORIGINS cannot contain * in production');

  const storage = String(config.STORAGE_DRIVER || 's3').toLowerCase();
  if (!['s3', 'disabled'].includes(storage)) throw new Error('STORAGE_DRIVER must be s3 or disabled');
  out.STORAGE_DRIVER = storage;
  if (storage === 's3') {
    for (const key of ['STORAGE_BUCKET', 'STORAGE_REGION', 'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_PUBLIC_BASE_URL']) {
      if (production) required(key, String(config[key] || ''));
    }
    if (production) {
      const publicUrl = new URL(required('STORAGE_PUBLIC_BASE_URL', String(config.STORAGE_PUBLIC_BASE_URL || '')));
      if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash) throw new Error('STORAGE_PUBLIC_BASE_URL must be a public HTTPS base URL without credentials, query or fragment in production');
    }
  }

  const aiEnabled = String(config.AI_OUTFIT_ENABLED ?? 'false').trim();
  if (!['true', 'false'].includes(aiEnabled)) throw new Error('AI_OUTFIT_ENABLED must be true or false');
  out.AI_OUTFIT_ENABLED = aiEnabled;
  const dailyLimit = Number(config.AI_OUTFIT_DAILY_LIMIT ?? 10);
  if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 100) throw new Error('AI_OUTFIT_DAILY_LIMIT must be an integer from 1 to 100');
  out.AI_OUTFIT_DAILY_LIMIT = dailyLimit;
  if (aiEnabled === 'true') {
    if (storage !== 's3') throw new Error('AI outfit requires S3 object storage');
    out.OPENAI_API_KEY = required('OPENAI_API_KEY', String(config.OPENAI_API_KEY || ''));
    for (const key of ['STORAGE_BUCKET', 'STORAGE_REGION', 'STORAGE_PUBLIC_BASE_URL']) required(key, String(config[key] || ''));
    const model = String(config.AI_OUTFIT_MODEL || 'gpt-image-1.5').trim();
    if (!/^gpt-image-[a-zA-Z0-9.-]+$/.test(model)) throw new Error('AI_OUTFIT_MODEL must name a GPT image model');
    out.AI_OUTFIT_MODEL = model;
  }

  return out;
}

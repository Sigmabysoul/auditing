import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'stockaudit_supabase_url';
const STORAGE_KEY_ANON = 'stockaudit_supabase_anon';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'local' | 'none';
}

const DEFAULT_SUPABASE_URL = 'https://tceaeiehjwjczgzvrqzh.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_M0xeaZCqtM2JG_aIeRn45w__Smc2XXy';

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const envKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;

  if (envUrl && envKey && !envUrl.includes('your-project-id')) {
    return {
      url: envUrl,
      anonKey: envKey,
      isConfigured: true,
      source: 'env',
    };
  }

  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_KEY,
    isConfigured: true,
    source: 'env',
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (!url || !anonKey) {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
  } else {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
  }
}

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return null;

  if (cachedClient && cachedUrl === config.url && cachedKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey);
    cachedUrl = config.url;
    cachedKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase credentials are not configured.' };
  }

  try {
    const { error } = await client.from('warehouses').select('id').limit(1);
    if (error) {
      return { success: false, message: `Database error: ${error.message}` };
    }
    return { success: true, message: 'Connected successfully to Supabase database!' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to connect to Supabase.',
    };
  }
}


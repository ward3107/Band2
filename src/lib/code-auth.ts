import { supabaseAdmin, supabaseTeacher, supabaseStudent } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Device fingerprinting options
export interface DeviceInfo {
  userAgent: string;
  language: string;
  screen: string;
  timezone: number;
  platform: string;
}

/**
 * Pick the right Supabase client based on email domain
 * This ensures isolated storage per user type
 */
function getClientForEmail(email: string): SupabaseClient {
  if (email.endsWith('@teacher.band2.app')) return supabaseTeacher;
  if (email.endsWith('@student.band2.app')) return supabaseStudent;
  return supabaseAdmin; // Google OAuth / admin
}

/**
 * Get the appropriate client for a user ID
 * Queries profiles to determine user type
 */
async function getClientForUserId(userId: string): Promise<SupabaseClient> {
  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (data?.role === 'student') return supabaseStudent;
    if (data?.role === 'teacher') return supabaseTeacher;
  } catch {
    // Fallback to admin client on error
  }
  return supabaseAdmin;
}

/**
 * Generate a device fingerprint hash for tracking
 * Uses browser characteristics to create a stable identifier
 */
export function generateDeviceHash(): string {
  const components: string[] = [];

  // User agent (browser info)
  if (typeof navigator !== 'undefined') {
    components.push(navigator.userAgent || '');
    components.push(navigator.language || '');
    components.push(navigator.platform || '');
  }

  // Screen dimensions
  if (typeof screen !== 'undefined') {
    components.push(`${screen.width}x${screen.height}`);
    components.push(`${screen.colorDepth}`);
  }

  // Timezone
  components.push(`${new Date().getTimezoneOffset()}`);

  // Create a simple hash (base64 encoded)
  const fingerprint = components.join('|');
  return btoa(fingerprint).substring(0, 32);
}

/**
 * Get device info for logging
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === 'undefined' || typeof screen === 'undefined') {
    return {
      userAgent: '',
      language: '',
      screen: '',
      timezone: 0,
      platform: '',
    };
  }

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screen: `${screen.width}x${screen.height}`,
    timezone: new Date().getTimezoneOffset(),
    platform: navigator.platform,
  };
}

/**
 * Check if a user account is currently locked
 * Also auto-unlocks if the lock period has expired
 */
export async function isAccountLocked(userId: string): Promise<{ locked: boolean; message?: string }> {
  const client = await getClientForUserId(userId);
  const { data, error } = await client
    .from('profiles')
    .select('locked_until, failed_login_attempts')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return { locked: false };
  }

  // Check if account is locked
  if (data.locked_until) {
    const lockExpiry = new Date(data.locked_until);
    const now = new Date();

    if (lockExpiry > now) {
      // Still locked
      const minutesLeft = Math.ceil((lockExpiry.getTime() - now.getTime()) / 60000);
      return {
        locked: true,
        message: `Account is locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
      };
    } else {
      // Lock period expired - reset
      await client
        .from('profiles')
        .update({
          locked_until: null,
          failed_login_attempts: 0,
        })
        .eq('id', userId);
    }
  }

  return { locked: false };
}

/**
 * Log a login attempt (success or failure)
 */
export async function logLoginAttempt(data: {
  user_id?: string;
  code_prefix: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
}): Promise<void> {
  try {
    const client = data.user_id ? await getClientForUserId(data.user_id) : supabaseAdmin;
    await client.from('login_attempts').insert({
      user_id: data.user_id,
      code_prefix: data.code_prefix.substring(0, 3), // Only store first 3 chars for privacy
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      success: data.success,
    });
  } catch (error) {
    // Log errors but don't throw - login attempts are non-critical
    console.error('Failed to log login attempt:', error);
  }
}

/**
 * Record or update a device for a user
 * Returns whether this is a new device
 */
export async function recordDevice(
  userId: string,
  deviceHash: string,
  userAgent: string,
  ipAddress: string
): Promise<{ isNew: boolean; deviceId?: string }> {
  try {
    const client = await getClientForUserId(userId);

    // Check if device exists
    const { data: existing } = await client
      .from('user_devices')
      .select('id')
      .eq('user_id', userId)
      .eq('device_hash', deviceHash)
      .maybeSingle();

    if (existing) {
      // Update last_seen and mark as not new
      await client
        .from('user_devices')
        .update({
          last_seen: new Date().toISOString(),
          is_new_device: false,
          ip_address: ipAddress,
        })
        .eq('id', existing.id);

      return { isNew: false, deviceId: existing.id };
    } else {
      // Insert new device
      const { data: newDevice } = await client
        .from('user_devices')
        .insert({
          user_id: userId,
          device_hash: deviceHash,
          user_agent: userAgent,
          ip_address: ipAddress,
          is_new_device: true,
        })
        .select('id')
        .single();

      return { isNew: true, deviceId: newDevice?.id };
    }
  } catch (error) {
    console.error('Failed to record device:', error);
    return { isNew: false };
  }
}

/**
 * Increment failed login attempts for a user
 * Locks account after 5 failed attempts
 */
export async function incrementFailedAttempts(userId: string): Promise<{ locked: boolean }> {
  const client = await getClientForUserId(userId);

  const { data: current } = await client
    .from('profiles')
    .select('failed_login_attempts')
    .eq('id', userId)
    .single();

  const attempts = (current?.failed_login_attempts || 0) + 1;
  const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

  await client
    .from('profiles')
    .update({
      failed_login_attempts: attempts,
      locked_until: lockedUntil,
    })
    .eq('id', userId);

  return { locked: attempts >= 5 };
}

/**
 * Reset failed login attempts (on successful login)
 */
export async function resetFailedAttempts(userId: string): Promise<void> {
  try {
    const client = await getClientForUserId(userId);
    await client
      .from('profiles')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Failed to reset failed attempts:', error);
  }
}

/**
 * Get user's login history (for teacher/admin view)
 */
export async function getUserLoginHistory(
  userId: string,
  limit: number = 20
): Promise<Array<{ attempted_at: string; success: boolean; ip_address: string | null }>> {
  const client = await getClientForUserId(userId);

  const { data, error } = await client
    .from('login_attempts')
    .select('attempted_at, success, ip_address')
    .eq('user_id', userId)
    .order('attempted_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get login history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's devices
 */
export async function getUserDevices(userId: string): Promise<
  Array<{
    id: string;
    user_agent: string | null;
    last_seen: string;
    created_at: string;
    is_new_device: boolean;
  }>
> {
  const client = await getClientForUserId(userId);

  const { data, error } = await client
    .from('user_devices')
    .select('id, user_agent, last_seen, created_at, is_new_device')
    .eq('user_id', userId)
    .order('last_seen', { ascending: false });

  if (error) {
    console.error('Failed to get user devices:', error);
    return [];
  }

  return data || [];
}

import { supabase } from './supabaseClient';

export const syncVoiceUsage = async (machineId: string, seconds: number): Promise<number | null> => {
  if (!machineId) return null;

  try {
    const { data, error } = await supabase.rpc('increment_voice_usage', {
      p_machine_id: machineId,
      p_seconds: seconds
    });

    if (error) {
      console.error('Error syncing voice usage:', error);
      return null;
    }

    return data as number;
  } catch (e) {
    console.error('Error calling increment_voice_usage:', e);
    return null;
  }
};

export const fetchVoiceUsage = async (machineId: string): Promise<{ usage: number; limit: number } | null> => {
  if (!machineId) return null;

  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('voice_usage_seconds, voice_usage_limit, plan')
      .eq('machine_id', machineId)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) {
      // Fallback for FreePass users without contract?
      // Or maybe check if they are in 'trial' mode locally?
      return null;
    }

    // Dynamic limit override based on plan if database limit is default
    let limit = data.voice_usage_limit;
    if (data.plan === 'lifetime' && limit === 1800) limit = 3600;

    return { usage: data.voice_usage_seconds, limit };
  } catch (e) {
    console.error('Error fetching voice usage:', e);
    return null;
  }
};

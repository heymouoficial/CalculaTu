-- Add voice metering columns to contracts
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS voice_usage_seconds integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS voice_usage_limit integer NOT NULL DEFAULT 1800, -- Default 30 min
ADD COLUMN IF NOT EXISTS last_usage_reset timestamptz NOT NULL DEFAULT now();

-- Create RPC function for atomic increment
CREATE OR REPLACE FUNCTION public.increment_voice_usage(
  p_machine_id text, 
  p_seconds integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_usage integer;
  v_contract_id uuid;
BEGIN
  -- Get active contract
  SELECT id INTO v_contract_id
  FROM public.contracts
  WHERE machine_id = p_machine_id AND status = 'active'
  LIMIT 1;

  IF v_contract_id IS NULL THEN
    RAISE EXCEPTION 'No active contract found for machine_id %', p_machine_id;
  END IF;

  -- Update usage atomically
  UPDATE public.contracts
  SET voice_usage_seconds = voice_usage_seconds + p_seconds,
      updated_at = now()
  WHERE id = v_contract_id
  RETURNING voice_usage_seconds INTO v_new_usage;

  RETURN v_new_usage;
END;
$$;

-- Grant execute permission to public (or authenticated)
GRANT EXECUTE ON FUNCTION public.increment_voice_usage TO anon, authenticated;

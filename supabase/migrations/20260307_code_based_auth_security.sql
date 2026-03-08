-- Add failed login tracking to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'failed_login_attempts'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'locked_until'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN locked_until TIMESTAMP NULL;
  END IF;
END $$;

-- Create login attempt logging table
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  code_prefix TEXT, -- First 3 chars only for privacy
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMP DEFAULT NOW()
);

-- Create device tracking table
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  is_new_device BOOLEAN DEFAULT true,
  UNIQUE(user_id, device_hash)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_time ON public.login_attempts(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON public.login_attempts(ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON public.user_devices(user_id);

-- Enable RLS on new tables
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for login_attempts
CREATE POLICY "Admins can view all login attempts" ON public.login_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Service role can insert login attempts" ON public.login_attempts
  FOR INSERT WITH CHECK (true);

-- RLS Policies for user_devices
CREATE POLICY "Users can view own devices" ON public.user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON public.user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON public.user_devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user_devices" ON public.user_devices
  FOR ALL USING (true) WITH CHECK (true);

-- Comment on tables for documentation
COMMENT ON TABLE public.login_attempts IS 'Audit log of all login attempts for security monitoring';
COMMENT ON TABLE public.user_devices IS 'Trusted devices for users - new device detection';
COMMENT ON COLUMN public.login_attempts.code_prefix IS 'First 3 characters of code for privacy - full code never logged';

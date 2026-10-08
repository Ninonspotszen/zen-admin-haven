ALTER TABLE public.abonnes_b2c ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE;
ALTER TABLE public.abonnes_b2c ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE;
UPDATE public.abonnes_b2c SET user_id = id WHERE user_id IS NULL;
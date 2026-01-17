-- Add payment_deadline column for 15-minute payment timer
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMPTZ;
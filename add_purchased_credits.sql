-- 1. Create Purchase Logs Table (Idempotency)
CREATE TABLE IF NOT EXISTS public.purchase_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    transaction_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    platform TEXT DEFAULT 'revenuecat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_id)
);

-- 2. Create RPC Function to Add Credits Securely
CREATE OR REPLACE FUNCTION add_purchased_credits(amount_to_add INTEGER, transaction_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as admin
AS $$
DECLARE
    user_uid UUID;
BEGIN
    user_uid := auth.uid();
    
    -- Check if transaction already processed
    IF EXISTS (SELECT 1 FROM public.purchase_logs WHERE purchase_logs.transaction_id = add_purchased_credits.transaction_id) THEN
        RETURN FALSE; -- Already processed
    END IF;

    -- Update User Credits
    UPDATE public.users
    SET credits = credits + amount_to_add
    WHERE id = user_uid;

    -- Log Transaction
    INSERT INTO public.purchase_logs (user_id, transaction_id, amount)
    VALUES (user_uid, transaction_id, amount_to_add);

    RETURN TRUE;
END;
$$;

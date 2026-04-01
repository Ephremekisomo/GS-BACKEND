-- =============================================
-- Migration: Fix users role check constraint
-- Description: Update the check constraint to include 'centre_securite' instead of 'security_center'
-- =============================================

-- Drop the existing check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new check constraint with correct role values
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK(role IN ('citoyen', 'admin', 'poste_securite', 'centre_securite'));

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'users_role_check';

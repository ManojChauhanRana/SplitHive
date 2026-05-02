-- Add created_by to expenses
ALTER TABLE expenses ADD COLUMN created_by UUID REFERENCES profiles(id);

-- Add created_by to settlements
ALTER TABLE settlements ADD COLUMN created_by UUID REFERENCES profiles(id);

-- Update existing records to set created_by to paid_by (for expenses) or payer_id (for settlements) as a reasonable default
UPDATE expenses SET created_by = paid_by WHERE created_by IS NULL;
UPDATE settlements SET created_by = payer_id WHERE created_by IS NULL;

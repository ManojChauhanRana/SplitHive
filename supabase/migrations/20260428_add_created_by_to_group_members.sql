-- Add created_by to group_members
ALTER TABLE group_members ADD COLUMN created_by UUID REFERENCES profiles(id);

-- Update existing group_members to set created_by to the group creator as a guess
UPDATE group_members gm
SET created_by = g.created_by
FROM groups g
WHERE gm.group_id = g.id AND gm.created_by IS NULL;

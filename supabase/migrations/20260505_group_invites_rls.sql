-- Enable RLS for group_invites if not already enabled
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

-- Allow users to view invites for groups they are members of
CREATE POLICY "Users can view invites for their groups"
ON group_invites FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_invites.group_id
    AND group_members.user_id = auth.uid()
  )
);

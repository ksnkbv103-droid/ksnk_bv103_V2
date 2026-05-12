-- Enable active/inactive toggle for system roles.
ALTER TABLE public.dm_roles
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dm_roles_is_active
ON public.dm_roles (is_active);

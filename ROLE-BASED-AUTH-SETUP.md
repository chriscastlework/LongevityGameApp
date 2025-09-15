# Role-Based Authentication Setup Guide

This guide walks you through implementing role-based access control with custom claims in your Supabase + Next.js application.

## Overview

The system implements three user roles:
- **participant**: Default role for new signups, basic access
- **operator**: Can view and manage participants, elevated access
- **admin**: Full system access, can manage user roles

## Step 1: Database Migration

Run the database migration to add the role system:

```sql
-- Execute this in your Supabase SQL Editor
-- File: scripts/add-role-system-migration-simple.sql
```

This migration will:
- Create a `user_role` enum with values: `participant`, `operator`, `admin`
- Add `role` column to `profiles` table with default value `participant`
- Migrate existing `is_admin` data to the new role system (if column exists)
- Create RLS policies based on roles
- Create helper functions for role management

## Step 2: Create Your First Admin User

1. Sign up a test user through your app
2. In Supabase SQL Editor, manually promote to admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin@email.com';
```

## Step 3: Test Role Management

```typescript
// In your React components
import { useIsAdmin, useUserRole } from '@/lib/auth/useAuth';
import { useUpdateUserRole, useAdminUsers } from '@/lib/auth/useApiAuth';

function AdminPanel() {
  const isAdmin = useIsAdmin();
  const { data: users } = useAdminUsers();
  const updateRole = useUpdateUserRole();

  if (!isAdmin) {
    return <div>Access denied</div>;
  }

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    updateRole.mutate({ userId, newRole });
  };

  return (
    <div>
      <h2>User Management</h2>
      {users?.data?.users.map(user => (
        <div key={user.id}>
          <span>{user.name} - {user.role}</span>
          <button onClick={() => handleRoleChange(user.id, 'admin')}>
            Make Admin
          </button>
        </div>
      ))}
    </div>
  );
}
```

## API Endpoints

### Get Current User Role
```http
GET /api/admin/roles
```

### Update User Role (Admin only)
```http
PUT /api/admin/roles
Content-Type: application/json

{
  "userId": "uuid",
  "newRole": "admin"
}
```

### List All Users (Admin/Operator only)
```http
GET /api/admin/users?page=1&limit=50&role=participant&search=john
```

### Refresh User Claims (Current User)
```http
POST /api/auth/hooks/set-claims
Content-Type: application/json
```

## Row Level Security (RLS) Examples

The migration creates these RLS policies:

### Profiles Table
- Users can view/update their own profile
- Admins can view all profiles
- Admins/operators can manage user roles (but not their own)

### Participants Table
- Users can view/update their own participant record
- Operators/admins can view all participant records

## React Hook Examples

```typescript
// Check user role
const userRole = useUserRole(); // 'participant' | 'operator' | 'admin' | null

// Role-based permissions
const isAdmin = useIsAdmin();
const isOperator = useIsOperator();
const hasAdminAccess = useHasRole('admin');

// Get all users (admin/operator only)
const { data: users, isLoading } = useAdminUsers({
  page: 1,
  limit: 50,
  role: 'participant'
});

// Update user role (admin only)
const updateRole = useUpdateUserRole();
updateRole.mutate({
  userId: 'uuid',
  newRole: 'operator'
});

// Refresh current user's claims
const refreshClaims = useRefreshClaims();
refreshClaims.mutate();
```

## Database Functions

### `get_user_role(uuid)`
Returns the role of a specific user.

### `authorize_role(user_role[])`
Checks if current user has one of the specified roles.

### `set_user_role(uuid, user_role)`
Updates a user's role (admin only, cannot change own role).

## Security Features

1. **RLS Policies**: Database-level access control
2. **API Authorization**: Endpoint-level role checking
3. **Custom Claims**: JWT tokens contain role information
4. **Role Hierarchy**: Admin > Operator > Participant
5. **Self-Protection**: Admins cannot change their own role

## Troubleshooting

### Claims Not Updating
- Manually refresh claims: `POST /api/auth/hooks/set-claims`
- Claims are automatically refreshed on login
- Use the `useRefreshClaims()` hook in React components

### RLS Policies Not Working
- Ensure user has proper role in database
- Check if policies are enabled: `SELECT * FROM pg_policies WHERE tablename = 'profiles';`
- Test policies manually in SQL Editor

### Role Changes Not Reflected
- Claims are cached for 5 minutes by default
- Force refresh by calling the refresh claims endpoint
- Check if user needs to log out/in again

## Migration from is_admin Boolean

The migration automatically handles this:
- `is_admin = true` becomes `role = 'admin'`
- `is_admin = false` becomes `role = 'participant'`
- The `is_admin` column is kept for backward compatibility but deprecated

To fully remove `is_admin` after testing:

```sql
-- After confirming everything works
ALTER TABLE public.profiles DROP COLUMN is_admin;
```

## Next Steps

1. Create admin UI for user management
2. Implement role-specific navigation
3. Add audit logging for role changes
4. Set up monitoring for failed authorization attempts
5. Consider implementing team-based permissions if needed
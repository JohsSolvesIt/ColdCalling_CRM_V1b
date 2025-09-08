# User Management and Role-Based Access Control

This system provides role-based access control for the CRM application with two user types:

## User Roles

### Admin (Default)
- Full access to all features
- Can import/export data
- Can manage databases
- Can add/remove tags
- Can access Single URL Processing
- Can manage users
- Can view dashboard and reports

### Sales
- Limited access focused on sales activities
- Can view and edit contacts
- Can send SMS and make calls
- Can view dashboard and reports
- **Cannot** import/export data
- **Cannot** manage tags
- **Cannot** access Single URL Processing
- **Cannot** manage databases or users

## Files Created

1. **`utils/userRoles.js`** - Role definitions and permissions
2. **`contexts/UserContext.jsx`** - User management context and provider
3. **`components/PermissionGuard.jsx`** - Permission-based rendering components
4. **`components/UserManagementModal.jsx`** - User management interface
5. **`hooks/usePermissions.js`** - Custom hook for permission checks

## Integration Steps

### 1. Wrap your App with UserProvider

```jsx
import { UserProvider } from './contexts/UserContext';

function App() {
  return (
    <UserProvider>
      {/* Your existing app content */}
    </UserProvider>
  );
}
```

### 2. Use Permission Guards in Components

```jsx
import PermissionGuard from './components/PermissionGuard';
import { usePermissions } from './hooks/usePermissions';
import { PERMISSIONS } from './utils/userRoles';

const MyComponent = () => {
  const { canImport, canExport, isAdmin } = usePermissions();
  
  return (
    <div>
      {/* Wrap admin-only features */}
      <PermissionGuard permission={PERMISSIONS.IMPORT_DATA}>
        <button>Import CSV</button>
      </PermissionGuard>
      
      {/* Or use hook for conditional rendering */}
      {canExport && <button>Export CSV</button>}
      
      {/* Admin-only features */}
      {isAdmin && <button>Admin Panel</button>}
    </div>
  );
};
```

### 3. Features to Wrap with Permission Guards

- **Import CSV**: `PERMISSIONS.IMPORT_DATA`
- **Export CSV**: `PERMISSIONS.EXPORT_DATA`
- **Single URL Processing**: `PERMISSIONS.SINGLE_URL_PROCESSING`
- **Add/Remove Tags**: `PERMISSIONS.ADD_TAGS`, `PERMISSIONS.REMOVE_TAGS`
- **Database Management**: `PERMISSIONS.MANAGE_DATABASES`
- **User Management**: `PERMISSIONS.MANAGE_USERS`

### 4. Add User Info Display

```jsx
import { UserInfo } from './components/PermissionGuard';

// Add this to your header or navigation
<UserInfo className="ml-auto" />
```

### 5. Add User Management Modal

```jsx
import UserManagementModal from './components/UserManagementModal';

// Show modal when admin clicks user management
{showUserManagement && (
  <UserManagementModal onClose={() => setShowUserManagement(false)} />
)}
```

## Usage Examples

### Conditional Buttons
```jsx
const { canImport, canManageTags, isAdmin } = usePermissions();

return (
  <div>
    {canImport && <button>Import Data</button>}
    {canManageTags && <button>Manage Tags</button>}
    {isAdmin && <button>System Settings</button>}
  </div>
);
```

### Permission Guards
```jsx
<PermissionGuard permission={PERMISSIONS.EXPORT_DATA}>
  <button>Export CSV</button>
</PermissionGuard>

<PermissionGuard 
  permissions={[PERMISSIONS.ADD_TAGS, PERMISSIONS.REMOVE_TAGS]} 
  requireAll={false}
>
  <div>Tag Management Controls</div>
</PermissionGuard>
```

### Role-based Components
```jsx
import { AdminOnly, SalesOnly } from './components/PermissionGuard';

<AdminOnly>
  <div>Admin Dashboard</div>
</AdminOnly>

<SalesOnly>
  <div>Sales Dashboard</div>
</SalesOnly>
```

## Default Setup

- System starts with a default admin user
- All existing functionality remains available to admin users
- Sales users get a restricted interface
- User data is stored in localStorage
- Role changes take effect immediately

## Benefits

- **Clean separation** - Permission logic is separate from main app code
- **Easy to use** - Simple hooks and components for permission checks
- **Flexible** - Can easily add new roles or permissions
- **Non-intrusive** - Doesn't break existing functionality
- **Persistent** - User settings saved locally

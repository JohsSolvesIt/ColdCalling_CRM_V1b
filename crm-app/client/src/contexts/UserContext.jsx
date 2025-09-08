import { useState, useEffect, createContext, useContext } from 'react';
import { USER_ROLES, PERMISSIONS, ROLE_PERMISSIONS, DEFAULT_USERS } from '../utils/userRoles';

// Create the User Context
const UserContext = createContext();

// Custom hook to use the user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// User Provider Component
export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize user system
  useEffect(() => {
    initializeUserSystem();
  }, []);

  const initializeUserSystem = async () => {
    try {
      // Try to load user from localStorage
      const savedUser = localStorage.getItem('crm_current_user');
      const savedUsers = localStorage.getItem('crm_users');
      const savedAuth = localStorage.getItem('crm_authenticated');
      
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      } else {
        // Initialize with default users
        setUsers(DEFAULT_USERS);
        localStorage.setItem('crm_users', JSON.stringify(DEFAULT_USERS));
      }
      
      if (savedUser && savedAuth === 'true') {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
      }
      // Note: Don't auto-login by default, require explicit login
      
    } catch (error) {
      console.error('Error initializing user system:', error);
      // Fallback to default
      setUsers(DEFAULT_USERS);
    } finally {
      setLoading(false);
    }
  };

  // Check if current user has a specific permission
  const hasPermission = (permission) => {
    if (!currentUser || !isAuthenticated) return false;
    const rolePermissions = ROLE_PERMISSIONS[currentUser.role] || [];
    return rolePermissions.includes(permission);
  };

  // Check if current user has any of the specified permissions
  const hasAnyPermission = (permissions) => {
    if (!currentUser || !isAuthenticated) return false;
    return permissions.some(permission => hasPermission(permission));
  };

  // Check if current user has all of the specified permissions
  const hasAllPermissions = (permissions) => {
    if (!currentUser || !isAuthenticated) return false;
    return permissions.every(permission => hasPermission(permission));
  };

  // Login function
  const login = async (username, password) => {
    try {
      const user = users.find(u => 
        u.username === username && 
        u.password === password && 
        u.isActive
      );

      if (!user) {
        throw new Error('Invalid username or password');
      }

      const updatedUser = {
        ...user,
        lastLogin: new Date().toISOString()
      };

      setCurrentUser(updatedUser);
      setIsAuthenticated(true);
      
      localStorage.setItem('crm_current_user', JSON.stringify(updatedUser));
      localStorage.setItem('crm_authenticated', 'true');
      
      // Update user's last login in users list
      const updatedUsers = users.map(u => 
        u.id === user.id ? updatedUser : u
      );
      setUsers(updatedUsers);
      localStorage.setItem('crm_users', JSON.stringify(updatedUsers));

      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('crm_current_user');
    localStorage.removeItem('crm_authenticated');
  };

  // Switch user (for admin users to manage system)
  const switchUser = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('crm_current_user', JSON.stringify(user));
    }
  };

  // Create a new user (admin only)
  const createUser = (userData) => {
    if (!hasPermission(PERMISSIONS.MANAGE_USERS)) {
      throw new Error('Permission denied: Cannot create users');
    }

    const newUser = {
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      isActive: true,
      ...userData
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('crm_users', JSON.stringify(updatedUsers));
    
    return newUser;
  };

  // Update user (admin only or self)
  const updateUser = (userId, updates) => {
    const canUpdate = hasPermission(PERMISSIONS.MANAGE_USERS) || currentUser?.id === userId;
    if (!canUpdate) {
      throw new Error('Permission denied: Cannot update user');
    }

    const updatedUsers = users.map(user => 
      user.id === userId ? { ...user, ...updates } : user
    );
    setUsers(updatedUsers);
    localStorage.setItem('crm_users', JSON.stringify(updatedUsers));

    // Update current user if editing self
    if (currentUser?.id === userId) {
      const updatedCurrentUser = { ...currentUser, ...updates };
      setCurrentUser(updatedCurrentUser);
      localStorage.setItem('crm_current_user', JSON.stringify(updatedCurrentUser));
    }
  };

  // Delete user (admin only)
  const deleteUser = (userId) => {
    if (!hasPermission(PERMISSIONS.MANAGE_USERS)) {
      throw new Error('Permission denied: Cannot delete users');
    }

    if (userId === currentUser?.id) {
      throw new Error('Cannot delete yourself');
    }

    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem('crm_users', JSON.stringify(updatedUsers));
  };

  // Check if user is admin
  const isAdmin = () => {
    return currentUser?.role === USER_ROLES.ADMIN && isAuthenticated;
  };

  // Check if user is sales
  const isSales = () => {
    return currentUser?.role === USER_ROLES.SALES && isAuthenticated;
  };

  // Update last login
  const updateLastLogin = () => {
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        lastLogin: new Date().toISOString()
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('crm_current_user', JSON.stringify(updatedUser));
      
      const updatedUsers = users.map(user => 
        user.id === currentUser.id ? updatedUser : user
      );
      setUsers(updatedUsers);
      localStorage.setItem('crm_users', JSON.stringify(updatedUsers));
    }
  };

  const value = {
    // State
    currentUser,
    users,
    loading,
    isAuthenticated,
    
    // Authentication
    login,
    logout,
    
    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isSales,
    
    // User management
    switchUser,
    createUser,
    updateUser,
    deleteUser,
    updateLastLogin,
    
    // Utilities
    userRoles: USER_ROLES,
    permissions: PERMISSIONS
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

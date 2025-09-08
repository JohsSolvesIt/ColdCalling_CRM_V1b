import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Users, 
  Database, 
  MessageSquare, 
  Settings, 
  Activity,
  Calendar,
  Building,
  Phone,
  Globe,
  BarChart3,
  FileText,
  Tag,
  LogOut,
  User,
  UserCog
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useProgress } from '../contexts/ProgressContext';
import UserManagementModal from './UserManagementModal';
import SidebarProgressPanel from './SidebarProgressPanel';

const LeftSidebar = ({ 
  isOpen, 
  setIsOpen, 
  currentTab = 'dashboard', 
  onTabChange,
  className = '' 
}) => {
  const [hoveredTab, setHoveredTab] = useState(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const { currentUser, logout, isAuthenticated, hasPermission } = useUser();
  const { 
    operations, 
    removeOperation, 
    clearCompletedOperations, 
    handleNotificationComplete,
    hasActiveOperations 
  } = useProgress();

  // Sidebar tabs configuration
  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      description: 'Overview & Analytics'
    },
    {
      id: 'databases',
      label: 'CRM',
      icon: Users,
      description: 'Contact Management'
    }
  ];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Toggle sidebar with Ctrl+B or Cmd+B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      
      // Quick tab switching with Alt + number
      if (e.altKey && e.key >= '1' && e.key <= '2') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
          onTabChange?.(tabs[tabIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, setIsOpen, onTabChange, tabs]);

  const handleTabClick = (tab) => {
    onTabChange(tab.id);
  };  return (
    <>
      {/* Backdrop when expanded */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed left-0 top-0 h-screen z-50 
        flex
      `}>
        {/* Collapsed State - Always visible on desktop */}
        <div className={`
          h-full bg-slate-900 border-r border-slate-700 shadow-2xl
          transition-all duration-300 ease-in-out
          w-16
        `}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-700">
              <button
                onClick={() => setIsOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Expand Sidebar (Ctrl+B)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Collapsed Tab Icons */}
            <div className="flex-1 py-4 space-y-2">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                
                return (
                  <div
                    key={tab.id}
                    className="px-3 relative group"
                    onMouseEnter={() => setHoveredTab(tab.id)}
                    onMouseLeave={() => setHoveredTab(null)}
                  >
                    <button
                      onClick={() => handleTabClick(tab)}
                      className={`
                        w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200
                        ${isActive 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }
                      `}
                      title={`${tab.label} (Alt+${index + 1})`}
                    >
                      <Icon className="h-5 w-5" />
                    </button>

                    {/* Tooltip */}
                    {hoveredTab === tab.id && !isOpen && (
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-60 px-2 py-1 bg-slate-800 text-white text-sm rounded-md whitespace-nowrap border border-slate-600 shadow-lg">
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-xs text-slate-300">{tab.description}</div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-600"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* User Management Button - Collapsed State (Admin Only) */}
            {isAuthenticated && currentUser && currentUser.role === 'admin' && (
              <div className="p-3 border-t border-slate-700">
                <div className="relative group">
                  <button
                    onClick={() => setShowUserManagement(true)}
                    className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-all duration-200"
                  >
                    <UserCog className="h-5 w-5" />
                  </button>
                  
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-60 px-2 py-1 bg-slate-800 text-white text-sm rounded-md whitespace-nowrap border border-slate-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    User Management
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-600"></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* User Info - Collapsed State */}
            <div className="mt-auto p-3 border-t border-slate-700">
              {isAuthenticated && currentUser ? (
                <div className="relative group">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer">
                    {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 bottom-0 z-60 px-2 py-1 bg-slate-800 text-white text-sm rounded-md whitespace-nowrap border border-slate-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="font-medium">{currentUser.name}</div>
                    <div className="text-xs text-slate-300 capitalize">{currentUser.role}</div>
                    <div className="absolute left-0 bottom-1/2 translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-600"></div>
                  </div>
                </div>
              ) : (
                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expanded State - Slides out from collapsed bar */}
        <div className={`
          h-full bg-slate-900 border-r border-slate-700 shadow-2xl
          transition-all duration-300 ease-in-out
          ${isOpen ? 'w-64' : 'w-0'}
          ${isOpen ? 'opacity-100' : 'opacity-0'}
          overflow-hidden
        `}>
          <div className="flex flex-col h-full w-64">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">CRM Navigation</h2>
                <p className="text-xs text-slate-400">Quick access to all features</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Collapse Sidebar (Ctrl+B)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex-1 py-4 overflow-y-auto">
              <nav className="space-y-1 px-3">
                {tabs.map((tab, index) => {
                  const Icon = tab.icon;
                  const isActive = currentTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left
                        ${isActive 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }
                      `}
                      title={`Switch to ${tab.label} (Alt+${index + 1})`}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{tab.label}</div>
                        <div className="text-xs opacity-70 truncate">{tab.description}</div>
                      </div>
                      {isActive && (
                        <div className="w-2 h-2 bg-white rounded-full flex-shrink-0"></div>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Progress Operations Panel */}
              {operations.length > 0 && (
                <div className="px-3 mt-6">
                  <SidebarProgressPanel
                    progressOperations={operations}
                    onRemoveOperation={removeOperation}
                    onClearAll={clearCompletedOperations}
                    onNotificationComplete={handleNotificationComplete}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-700">
              {/* User Info */}
              {isAuthenticated && currentUser && (
                <div className="p-4 border-b border-slate-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {currentUser.name}
                      </div>
                      <div className="text-xs text-slate-400 capitalize truncate">
                        {currentUser.role}
                      </div>
                    </div>
                  </div>
                  
                  {/* User Management Button - Admin Only */}
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => setShowUserManagement(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 mb-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                    >
                      <UserCog className="h-4 w-4" />
                      User Management
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
              
              {/* Help Section */}
              <div className="p-4">
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Quick Keys:</span>
                  </div>
                  <div>• Ctrl+B: Toggle sidebar</div>
                  <div>• Alt+1-2: Switch tabs</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
      />
    </>
  );
};

export default LeftSidebar;

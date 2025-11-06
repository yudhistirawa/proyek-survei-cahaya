import React, { useRef, useEffect } from 'react';
import { User, Mail, LogOut } from 'lucide-react';
import { logout } from '../../../lib/auth';

const AdminHeader = ({ 
  currentUser, 
  showUserDropdown, 
  setShowUserDropdown, 
  activeMenu, 
  searchTerm, 
  setSearchTerm, 
  taskSearchTerm, 
  setTaskSearchTerm 
}) => {
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    try {
      setShowUserDropdown(false);
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      window.location.href = '/';
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setShowUserDropdown]);

  return (
    <header
      className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-200 shadow-sm overflow-x-hidden"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 0px)',
        paddingLeft: 'max(env(safe-area-inset-left), 0px)',
        paddingRight: 'max(env(safe-area-inset-right), 0px)'
      }}
    >
      <div className="flex items-center space-x-4">
        <input
          type="text"
          placeholder={activeMenu === 'Data Tugas' ? "Cari tugas..." : "Cari..."}
          value={activeMenu === 'Data Tugas' ? taskSearchTerm : searchTerm}
          onChange={(e) => {
            if (activeMenu === 'Data Tugas') {
              setTaskSearchTerm(e.target.value);
            } else {
              setSearchTerm(e.target.value);
            }
          }}
          className="w-full sm:w-64 px-4 py-2 min-h-[44px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm sm:text-base"
        />
      </div>
      
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowUserDropdown(!showUserDropdown)}
          className="flex items-center space-x-3 bg-white rounded-full shadow-md px-4 py-2 hover:shadow-lg transition-all duration-200 border border-gray-200"
        >
          <div className="relative">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            {/* Online status indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="text-left">
            <div className="text-xs text-gray-500 font-medium">PANEL ADMIN</div>
            <div className="text-sm text-gray-900 font-semibold">{currentUser.username}</div>
          </div>
        </button>

        {/* User Dropdown */}
        {showUserDropdown && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 transform transition-all duration-300 ease-out animate-in slide-in-from-top-2 fade-in-0 zoom-in-95">
            {/* User Info Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User size={24} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{currentUser.displayName}</h3>
                  <p className="text-sm text-gray-600">Administrator</p>
                </div>
              </div>
            </div>

            {/* User Details - Only Email */}
            <div className="p-4">
              <div className="flex items-center space-x-3 text-sm">
                <Mail size={16} className="text-gray-400" />
                <span className="text-gray-700">{currentUser.email}</span>
              </div>
            </div>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 font-medium transform hover:scale-105 active:scale-95"
              >
                <LogOut size={16} />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default AdminHeader;

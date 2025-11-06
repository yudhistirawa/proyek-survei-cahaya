import React from 'react';
import { menuItems } from '../constants/adminConstants';

const AdminSidebar = ({ activeMenu, setActiveMenu }) => {
  return (
    <aside
      className="w-64 bg-white shadow-lg flex flex-col overflow-x-hidden"
      style={{
        paddingLeft: 'max(env(safe-area-inset-left), 0px)'
      }}
    >
      <div
        className="p-6 border-b border-gray-200 font-extrabold text-xl tracking-wide text-indigo-600"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}
      >
        Admin
      </div>
      <nav className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <ul>
          {menuItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => setActiveMenu(item.label)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors duration-200 ${
                  activeMenu === item.label
                    ? 'bg-indigo-100 text-indigo-700 font-semibold'
                    : 'hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default AdminSidebar;

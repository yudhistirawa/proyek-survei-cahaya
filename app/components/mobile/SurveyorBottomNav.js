import React from 'react';
import { Home, User } from 'lucide-react';
import NotificationBadge from '../NotificationBadge';

const SurveyorBottomNav = ({ activeTab, onTabChange, unreadCount = 0 }) => {
    const tabs = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'notifikasi', label: 'Notifikasi', showBadge: true },
        { id: 'profil', label: 'Profil', icon: User }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
            <div className="flex justify-around items-center max-w-md mx-auto">
                {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-all duration-200 relative ${
                                isActive 
                                    ? 'text-blue-600 bg-blue-50' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <div className="relative">
                                {tab.id === 'notifikasi' ? (
                                    <NotificationBadge 
                                        count={unreadCount} 
                                        showBadge={tab.showBadge}
                                        className={isActive ? 'text-blue-600' : 'text-gray-500'}
                                    />
                                ) : (
                                    <IconComponent size={20} className="mb-1" />
                                )}
                            </div>
                            <span className="text-xs font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SurveyorBottomNav;

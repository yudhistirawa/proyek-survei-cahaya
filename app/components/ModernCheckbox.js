import React from 'react';
import { Check } from 'lucide-react';

// Modern Checkbox Component
export const ModernCheckbox = ({ checked, onChange, id, label }) => {
    return (
        <label htmlFor={id} className="flex items-center cursor-pointer group">
            <div className="relative">
                <input
                    type="checkbox"
                    id={id}
                    className="sr-only peer"
                    checked={checked}
                    onChange={onChange}
                />
                <div className="w-5 h-5 rounded-md border-2 transition-all duration-200 ease-in-out bg-white border-gray-300 group-hover:border-blue-400 peer-checked:bg-blue-600 peer-checked:border-blue-600">
                </div>
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white transition-opacity duration-200 ${checked ? 'opacity-100' : 'opacity-0'}`}>
                    <Check size={14} strokeWidth={3}/>
                </div>
            </div>
            {label && <span className="ml-2 text-sm font-medium text-gray-700">{label}</span>}
        </label>
    );
};

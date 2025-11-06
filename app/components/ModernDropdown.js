"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Zap, Building2 } from 'lucide-react';

const ModernDropdown = ({ 
    label, 
    options, 
    value, 
    onChange, 
    placeholder = "Pilih opsi...",
    className = "",
    icon = null
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 0 });

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            const isInsideTrigger = dropdownRef.current && dropdownRef.current.contains(event.target);
            const isInsideMenu = menuRef.current && menuRef.current.contains(event.target);
            if (!isInsideTrigger && !isInsideMenu) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Position menu when open, and on resize/scroll
    useEffect(() => {
        if (!isOpen || !buttonRef.current) return;
        const updatePosition = () => {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuStyle({
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width,
            });
        };
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
    };

    const selectedOption = options.find(option => option.value === value);

    // Get appropriate icon based on label
    const getIcon = () => {
        if (icon) return icon;
        if (label.toLowerCase().includes('daya')) return <Zap className="w-4 h-4" />;
        if (label.toLowerCase().includes('tiang')) return <Building2 className="w-4 h-4" />;
        return null;
    };

    return (
        <div className={`mb-4 ${className}`}>
            <label className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                {getIcon()}
                {label}
            </label>
            <div className="relative" ref={dropdownRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    ref={buttonRef}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-white to-gray-50 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:from-blue-50 hover:to-blue-100"
                >
                    <div className="flex items-center gap-3">
                        {getIcon() && (
                            <div className="text-gray-400">
                                {getIcon()}
                            </div>
                        )}
                        <span className={selectedOption ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedOption && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {isOpen && createPortal(
                    <div
                        ref={menuRef}
                        className="fixed z-[10] bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto"
                        style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
                    >
                        {options.map((option, index) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option)}
                                className={`w-full px-4 py-3 text-left transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 focus:bg-gradient-to-r focus:from-blue-50 focus:to-indigo-50 focus:text-blue-700 focus:outline-none ${
                                    value === option.value
                                        ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 font-semibold'
                                        : 'text-gray-700'
                                } ${index === 0 ? 'rounded-t-xl' : ''} ${index === options.length - 1 ? 'rounded-b-xl' : ''}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {getIcon() && (
                                            <div className={`w-4 h-4 ${value === option.value ? 'text-blue-600' : 'text-gray-400'}`}>
                                                {getIcon()}
                                            </div>
                                        )}
                                        <span className="font-medium">{option.label}</span>
                                    </div>
                                    {value === option.value && (
                                        <div className="flex items-center gap-2">
                                            <Check className="w-4 h-4 text-blue-600" />
                                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};

export default ModernDropdown;

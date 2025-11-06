import React from 'react';
import { MapPin, Wifi, WifiOff, RotateCw } from 'lucide-react';

// Komponen untuk menampilkan status lokasi real-time
export const LocationStatusIndicator = ({ location, accuracy, error, isLoading }) => {
    const getStatusColor = () => {
        if (error) return 'text-red-500';
        if (isLoading) return 'text-yellow-500';
        if (accuracy && accuracy < 10) return 'text-green-500';
        if (accuracy && accuracy < 50) return 'text-yellow-500';
        return 'text-orange-500';
    };

    const getStatusIcon = () => {
        if (error) return <WifiOff size={14} />;
        if (isLoading) return <RotateCw size={14} className="animate-spin" />;
        return <Wifi size={14} />;
    };

    const getStatusText = () => {
        if (error) return 'GPS Error';
        if (isLoading) return 'Mencari GPS...';
        if (location && accuracy) {
            if (accuracy < 10) return `GPS Akurat (±${Math.round(accuracy)}m)`;
            if (accuracy < 50) return `GPS Baik (±${Math.round(accuracy)}m)`;
            return `GPS Lemah (±${Math.round(accuracy)}m)`;
        }
        return 'GPS Tidak Aktif';
    };

    return (
        <div className={`flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-100 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-xs font-medium">{getStatusText()}</span>
        </div>
    );
};

// Komponen untuk menampilkan koordinat real-time
export const RealtimeLocationDisplay = ({ location, accuracy, className = "" }) => {
    if (!location) {
        return (
            <div className={`flex items-center gap-2 p-2 bg-gray-200 rounded-lg ${className}`}>
                <MapPin size={14} className="text-gray-500"/>
                <span className="text-xs text-gray-600">Mendapatkan lokasi...</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg ${className}`}>
            <MapPin size={14} className="text-green-600"/>
            <div className="flex flex-col">
                <span className="text-xs text-green-800 font-medium">
                    {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                </span>
                {accuracy && (
                    <span className="text-xs text-green-600">
                        Akurasi: ±{Math.round(accuracy)}m
                    </span>
                )}
            </div>
        </div>
    );
};

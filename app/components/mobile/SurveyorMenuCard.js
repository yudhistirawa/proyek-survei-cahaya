import React from 'react';

const SurveyorMenuCard = ({ icon, title, description, onClick, bgColor = "bg-white" }) => {
    return (
        <button
            onClick={onClick}
            className={`${bgColor} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 w-full h-32 flex flex-col items-center justify-center space-y-2`}
        >
            <div className="text-4xl mb-2">
                {icon}
            </div>
            <h3 className="text-sm font-bold text-gray-800 text-center leading-tight">
                {title}
            </h3>
        </button>
    );
};

export default SurveyorMenuCard;

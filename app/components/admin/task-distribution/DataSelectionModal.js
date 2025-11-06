import React from 'react';
import { X } from 'lucide-react';

const DataSelectionModal = ({
  availableData,
  selectedDataItems,
  onDataSelection,
  onConfirm,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Pilih Data Propose</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-96">
          <div className="space-y-3">
            {availableData.map((item) => (
              <div key={item.id} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`data-${item.id}`}
                  checked={selectedDataItems.find(selected => selected.id === item.id) !== undefined}
                  onChange={() => onDataSelection(item)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor={`data-${item.id}`} className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-600">{item.area}</div>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              disabled={selectedDataItems.length === 0}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              Konfirmasi ({selectedDataItems.length} dipilih)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSelectionModal;

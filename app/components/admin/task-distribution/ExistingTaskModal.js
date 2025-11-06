"use client";
import React, { useState } from 'react';

const ExistingTaskModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    deadline: '',
    description: '',
    kmzFile: null,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      kmzFile: e.target.files[0]
    }));
  };

  const handleSubmit = () => {
    // Logic to handle form submission
    console.log(formData);
    onClose(); // Close modal after submission
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <h2>Buat Tugas Zona Existing</h2>
      <label>
        Deadline:
        <input type="date" name="deadline" onChange={handleInputChange} />
      </label>
      <label>
        Deskripsi:
        <textarea name="description" onChange={handleInputChange} />
      </label>
      <label>
        Upload File KMZ/KML:
        <input type="file" accept=".kmz,.kml" onChange={handleFileChange} />
      </label>
      <button onClick={handleSubmit}>Buat Tugas</button>
      <button onClick={onClose}>Batal</button>
    </div>
  );
};

export default ExistingTaskModal;

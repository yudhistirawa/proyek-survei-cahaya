"use client";
import React, { useState } from 'react';

const ProposeTaskModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    deadline: '',
    description: '',
    excelFile: null,
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
      excelFile: e.target.files[0]
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
      <h2>Buat Tugas Propose</h2>
      <label>
        Deadline:
        <input type="date" name="deadline" onChange={handleInputChange} />
      </label>
      <label>
        Deskripsi:
        <textarea name="description" onChange={handleInputChange} />
      </label>
      <label>
        Upload File Excel/CSV:
      </label>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
      <button onClick={handleSubmit}>Buat Tugas</button>
      <button onClick={onClose}>Batal</button>
    </div>
  );
};

export default ProposeTaskModal;

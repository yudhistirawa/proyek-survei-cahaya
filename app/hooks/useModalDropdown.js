import { useCallback, useRef } from 'react';

export function useModalDropdown() {
  // Gunakan ref untuk menyimpan state antar renders
  const stateRef = useRef({
    scrollPosition: 0,
    focusedElement: null
  });

  const handleDropdownSelect = useCallback((field, value, event, setFormData, setOpenDropdowns) => {
    // Jangan prevent default untuk memungkinkan interaksi normal
    if (event) {
      event.stopPropagation(); // Hanya stop propagation untuk mencegah modal tertutup
    }

    // Dapatkan element modal dan simpan posisi scroll saat ini
    const modalContent = event?.target.closest('.overflow-y-auto') || 
                         event?.target.closest('[data-modal-content]') ||
                         document.querySelector('.overflow-y-auto');

    // Simpan posisi scroll sebelum update state
    if (modalContent) {
      stateRef.current.scrollPosition = modalContent.scrollTop;
    }

    // Simpan elemen yang sedang fokus
    stateRef.current.focusedElement = document.activeElement;

    // Update state form dan tutup dropdown
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (setOpenDropdowns) {
      setOpenDropdowns(prev => ({
        ...prev,
        [field]: false
      }));
    }

    // Gunakan requestAnimationFrame untuk mencegah auto-scroll
    requestAnimationFrame(() => {
      // Kembalikan posisi scroll untuk mencegah auto-scroll
      if (modalContent) {
        modalContent.scrollTop = stateRef.current.scrollPosition;
      }

      // Kembalikan fokus ke elemen yang sebelumnya aktif jika masih ada
      if (stateRef.current.focusedElement && 
          typeof stateRef.current.focusedElement.focus === 'function' &&
          document.contains(stateRef.current.focusedElement)) {
        stateRef.current.focusedElement.focus();
      }
    });
  }, []);

  const handleDropdownToggle = useCallback((field, setOpenDropdowns, event) => {
    if (event) {
      event.stopPropagation(); // Hanya stop propagation, jangan prevent default
    }

    // Simpan posisi scroll saat ini
    const modalContent = event?.target.closest('.overflow-y-auto') || 
                         event?.target.closest('[data-modal-content]') ||
                         document.querySelector('.overflow-y-auto');
    
    if (modalContent) {
      stateRef.current.scrollPosition = modalContent.scrollTop;
    }

    // Toggle dropdown state
    setOpenDropdowns(prev => ({
      ...prev,
      [field]: !prev[field]
    }));

    // Gunakan requestAnimationFrame untuk mempertahankan scroll position
    requestAnimationFrame(() => {
      if (modalContent) {
        modalContent.scrollTop = stateRef.current.scrollPosition;
      }
    });
  }, []);

  // Handler untuk mencegah auto-scroll saat dropdown dibuka/ditutup
  const handleDropdownClick = useCallback((event) => {
    // Hanya stop propagation untuk mencegah modal tertutup
    event.stopPropagation();
    
    // Simpan posisi scroll
    const modalContent = event.target.closest('.overflow-y-auto') || 
                         event.target.closest('[data-modal-content]') ||
                         document.querySelector('.overflow-y-auto');
    
    if (modalContent) {
      stateRef.current.scrollPosition = modalContent.scrollTop;
      
      // Pastikan scroll position tidak berubah
      requestAnimationFrame(() => {
        modalContent.scrollTop = stateRef.current.scrollPosition;
      });
    }
  }, []);

  return {
    handleDropdownSelect,
    handleDropdownToggle,
    handleDropdownClick
  };
}

import { useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook untuk mengelola fokus dan scroll dalam modal
 */
export function useModalFocus() {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    // Simpan elemen yang sedang aktif sebelum modal dibuka
    previousActiveElement.current = document.activeElement;

    // Lock scroll body
    document.body.style.overflow = 'hidden';
    
    // Kompensasi untuk scrollbar yang hilang
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      // Restore scroll dan padding saat modal ditutup
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Kembalikan fokus ke elemen sebelumnya
      if (previousActiveElement.current?.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, []);

  // Handler untuk mencegah scroll yang tidak diinginkan
  const handleModalWheel = useCallback((e) => {
    const modalContent = e.currentTarget;
    const isAtTop = modalContent.scrollTop === 0;
    const isAtBottom = modalContent.scrollHeight - modalContent.scrollTop === modalContent.clientHeight;
    
    // Hanya stop propagation jika scroll akan keluar dari modal
    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  // Handler untuk input field focus - diperbaiki tanpa preventDefault
  const handleInputFocus = useCallback((e) => {
    // Hapus preventDefault dan stopPropagation untuk memungkinkan fokus normal
    // Jangan lakukan apapun agar fokus tidak hilang
  }, []);

  // Handler untuk perubahan input - disederhanakan
  const handleInputChange = useCallback((e, setFormData) => {
    const input = e.target;
    const field = input.name || input.id;
    const value = input.value;

    if (!field) return;

    // Simpan posisi kursor
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;

    // Update form data
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Kembalikan posisi kursor setelah render
    requestAnimationFrame(() => {
      if (input && typeof selectionStart === 'number' && typeof selectionEnd === 'number') {
        input.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  }, []);

  // Handler untuk dropdown select - diperbaiki tanpa auto scroll
  const handleSelectChange = useCallback((e, setFormData) => {
    const select = e.target;
    const field = select.name || select.id;
    const value = select.value;

    if (!field) return;

    // Simpan posisi scroll modal saat ini
    const modalContent = select.closest('.overflow-y-auto') || select.closest('[data-modal-content]');
    const currentScrollTop = modalContent?.scrollTop || 0;

    // Update form data
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Kembalikan posisi scroll setelah render untuk mencegah auto-scroll
    requestAnimationFrame(() => {
      if (modalContent) {
        modalContent.scrollTop = currentScrollTop;
      }
      
      // Pastikan select tetap fokus
      if (select && typeof select.focus === 'function') {
        select.focus();
      }
    });
  }, []);

  // Handler untuk click events dalam modal - disederhanakan
  const handleModalClick = useCallback((e) => {
    // Hanya stop propagation untuk mencegah modal tertutup, tapi biarkan event lain berjalan normal
    e.stopPropagation();
  }, []);

  return {
    modalRef,
    handleModalWheel,
    handleInputFocus,
    handleInputChange,
    handleSelectChange,
    handleModalClick,
  };
}

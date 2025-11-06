import { useCallback, useEffect } from 'react';

export function useModalScroll(modalRef) {
  // Prevent scroll on modal open
  useEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;

    const preventScroll = (e) => {
      const isAtTop = modalElement.scrollTop === 0;
      const isAtBottom = 
        modalElement.scrollHeight - modalElement.scrollTop === modalElement.clientHeight;

      // Allow scrolling within modal content
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        e.preventDefault();
      }
    };

    modalElement.addEventListener('wheel', preventScroll, { passive: false });
    return () => {
      modalElement.removeEventListener('wheel', preventScroll);
    };
  }, [modalRef]);

  // Prevent focus loss and maintain scroll position
  const handleInputFocus = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const modalElement = modalRef.current;
    if (!modalElement) return;
    
    const currentScroll = modalElement.scrollTop;
    requestAnimationFrame(() => {
      modalElement.scrollTop = currentScroll;
    });
  }, [modalRef]);

  return {
    handleInputFocus
  };
}

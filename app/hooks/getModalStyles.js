export const getModalStyles = (isVisible = true) => ({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 999999,
  },
  content: {
    position: 'relative',
    width: '100%',
    maxWidth: '42rem',
    maxHeight: '95vh',
    margin: '2.5vh auto',
    background: 'white',
    borderRadius: '1rem',
    padding: 0,
    border: 'none',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    transform: isVisible ? 'scale(1)' : 'scale(0.95)',
    opacity: isVisible ? 1 : 0,
    transition: 'all 300ms ease-in-out',
  },
  modalContent: {
    scrollBehavior: 'smooth',
    overscrollBehavior: 'contain',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent',
  }
});

import dynamic from 'next/dynamic';

// Loading component for lazy loaded components
const LoadingComponent = ({ message = "Memuat..." }) => (
  <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
    <p className="text-slate-600 text-center">{message}</p>
  </div>
);

// Lazy load MobileCameraCapture component
const MobileCameraCapture = dynamic(() => import('./MobileCameraCapture'), {
  ssr: false,
  loading: () => <LoadingComponent message="Memuat kamera..." />
});

export default MobileCameraCapture;

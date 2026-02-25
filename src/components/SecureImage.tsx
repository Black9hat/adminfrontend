// src/components/SecureImage.tsx

import React, { useEffect, useState } from 'react';

interface SecureImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

const SecureImage: React.FC<SecureImageProps> = ({ src, alt, className, onClick }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Simple approach: Let browser handle the image with proper URL
  const imageUrl = src ? `${src}${src.includes('?') ? '&' : '?'}ngrok-skip-browser-warning=true` : '';

  useEffect(() => {
    if (!src) {
      console.error('❌ SecureImage: No src provided');
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    // Preload image to detect errors
    const img = new Image();
    
    img.onload = () => {
      console.log('✅ SecureImage: Loaded', src);
      setLoading(false);
      setError(false);
    };
    
    img.onerror = () => {
      console.error('❌ SecureImage: Failed to load', src);
      setLoading(false);
      setError(true);
    };
    
    img.src = imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, imageUrl]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 animate-pulse`}>
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100`}>
        <span className="text-gray-400 text-xs">Failed to load</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      crossOrigin="anonymous"
    />
  );
};

export default SecureImage;
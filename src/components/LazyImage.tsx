import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface LazyImageProps {
  file: File;
  className?: string;
  forceLoad?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({ file, className, forceLoad = false }) => {
  const [url, setUrl] = useState('');
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!file) return;
    let objUrl = '';
    if (forceLoad) {
      objUrl = URL.createObjectURL(file);
      setUrl(objUrl);
      return () => {
        if (objUrl) URL.revokeObjectURL(objUrl);
      };
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          objUrl = URL.createObjectURL(file);
          setUrl(objUrl);
          obs.disconnect();
        }
      },
      { rootMargin: '400px' },
    );

    if (ref.current) {
      obs.observe(ref.current);
    }

    return () => {
      obs.disconnect();
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [file, forceLoad]);

  return <img ref={ref} src={url} className={className} alt="" />;
};

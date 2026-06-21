import React, { useState } from 'react';

interface PremiumImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function PremiumImage({ src, alt, className = "w-full max-h-56 object-cover hover:scale-[1.02]" }: PremiumImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-150 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 ${!loaded ? 'shimmer-placeholder h-40 animate-pulse' : ''}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        referrerPolicy="no-referrer"
        className={`${className} transition-all duration-500 ease-out ${loaded ? 'opacity-100 filter-none' : 'opacity-0 scale-95 blur-md'}`}
      />
    </div>
  );
}

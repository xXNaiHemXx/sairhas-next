'use client';

import { useState, useEffect } from 'react';

export default function SkeletonLoader({ count = 4 }: { count?: number }) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setIsAnimating(prev => !prev), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-10 bg-gray-200 rounded animate-pulse"
          style={{ backgroundColor: isAnimating ? '#e5e7eb' : '#d1d5db' }}
        />
      ))}
    </div>
  );
}
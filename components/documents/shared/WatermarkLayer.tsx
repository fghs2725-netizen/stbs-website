import React from 'react';

interface WatermarkLayerProps {
  text?: string;
  opacity?: number;
  color?: string;
  imageUrl?: string;
}

export default function WatermarkLayer({
  text = 'CONFIDENTIAL',
  opacity = 0.05,
  color = 'var(--doc-primary)',
  imageUrl,
}: WatermarkLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt="Watermark" 
          className="max-w-[80%] max-h-[80%] object-contain"
          style={{ opacity }} 
        />
      ) : (
        <div 
          className="text-[120px] font-bold font-oswald tracking-widest uppercase transform -rotate-45 whitespace-nowrap"
          style={{ color, opacity }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

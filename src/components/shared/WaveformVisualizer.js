import React, { useEffect, useState } from 'react';

export default function WaveformVisualizer({ isActive = false, intensity = 0.5, barCount = 24, barColor = 'from-pink-500 to-orange-500' }) {
  const [barHeights, setBarHeights] = useState(Array(barCount).fill(0.3));

  // animate bars based on activity - TODO: hook this to real audio input data from WebAudio API later
  useEffect(() => {
    const interval = setInterval(() => {
      setBarHeights(prev =>
        prev.map(() => {
          if (isActive) {
            // when recording, use more dynamic values to simulate audio peaks
            return Math.random() * intensity + 0.2;
          } else {
            // idle state - subtle subtle variation for visual interest
            return 0.2 + Math.random() * 0.15;
          }
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, intensity]);

  return (
    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 overflow-x-auto pb-2">
      {barHeights.map((height, idx) => (
        <div
          key={idx}
          className={`rounded-full bg-gradient-to-t ${barColor} transition-all duration-75 ease-out flex-shrink-0`}
          style={{
            width: '2px',
            minWidth: '2px',
            height: `${Math.max(16, height * 50)}px`,
            opacity: 0.8 + Math.random() * 0.2,
          }}
        />
      ))}
    </div>
  );
}

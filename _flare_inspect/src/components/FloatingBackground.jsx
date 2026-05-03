import React from 'react';
import { motion } from 'framer-motion';

const FloatingBackground = () => {
  // Generate random particles
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    size: Math.random() * 40 + 10,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * -20,
    opacity: Math.random() * 0.3 + 0.1,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ background: 'transparent' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <defs>
          <radialGradient id="particleGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="secondaryGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--secondary)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {particles.map((p) => (
          <motion.circle
            key={p.id}
            r={p.size}
            fill={p.id % 2 === 0 ? "url(#particleGradient)" : "url(#secondaryGradient)"}
            initial={{ 
              x: `${p.x}%`, 
              y: `${p.y}%`, 
              opacity: 0,
              scale: 0 
            }}
            animate={{ 
              y: [`${p.y}%`, `${p.y - 20}%`, `${p.y}%`],
              x: [`${p.x}%`, `${p.x + 5}%`, `${p.x}%`],
              opacity: [p.opacity, p.opacity * 1.5, p.opacity],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </svg>

      {/* Adding some SVG "flares" to match the name */}
      <div className="flare-overlay"></div>

      <style>{`
        .flare-overlay {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 30%, var(--primary-glow) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, var(--secondary-glow) 0%, transparent 40%);
          filter: blur(60px);
          opacity: 0.4;
          z-index: -1;
        }
      `}</style>
    </div>
  );
};

export default FloatingBackground;

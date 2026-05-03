import React from 'react';
import { motion } from 'framer-motion';

const BrandLogo = ({ size = 150, className = '', animated = false, showText = true }) => {
    // If you have a real logo file, place it in /public/flare-logo.png
    // and set useImageFile to true
    const useImageFile = true;
    const logoSrc = '/custom_logo.png';

    if (useImageFile) {
        return (
            <div className={`brand-logo-wrapper ${className}`} style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}>
                <div style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#fff',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    position: 'relative'
                }}>
                    <motion.img
                        src={logoSrc}
                        alt="Flare Logo"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: 'scale(1.02)'
                        }}
                        initial={animated ? { scale: 0, rotate: -180 } : {}}
                        animate={{ scale: 1.02, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 80, damping: 15 }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={`brand-logo-wrapper ${className}`} style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
        }}>
            <motion.div
                initial={animated ? { scale: 0, rotate: -180 } : {}}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
            >
                <svg
                    width={size}
                    height={size}
                    viewBox="0 0 300 300"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        {/* Metallic coin gradient */}
                        <linearGradient id="metalRim" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#B8B8B8" />
                            <stop offset="25%" stopColor="#E8E8E8" />
                            <stop offset="50%" stopColor="#A0A0A0" />
                            <stop offset="75%" stopColor="#D8D8D8" />
                            <stop offset="100%" stopColor="#B0B0B0" />
                        </linearGradient>
                        <linearGradient id="metalFace" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#D0D0D0" />
                            <stop offset="30%" stopColor="#F0F0F0" />
                            <stop offset="50%" stopColor="#E0E0E0" />
                            <stop offset="70%" stopColor="#F5F5F5" />
                            <stop offset="100%" stopColor="#C8C8C8" />
                        </linearGradient>
                        <radialGradient id="metalShine" cx="40%" cy="35%">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                        </radialGradient>
                        {/* Swoosh gradient */}
                        <linearGradient id="swoosh" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#2563EB" />
                            <stop offset="40%" stopColor="#7C3AED" />
                            <stop offset="100%" stopColor="#DC2626" />
                        </linearGradient>
                        {/* F letter purple gradient */}
                        <linearGradient id="fPurple" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4338CA" />
                            <stop offset="50%" stopColor="#7C3AED" />
                            <stop offset="100%" stopColor="#A855F7" />
                        </linearGradient>
                        {/* Flame gradient */}
                        <linearGradient id="flameOuter" x1="0.5" y1="1" x2="0.5" y2="0">
                            <stop offset="0%" stopColor="#EA580C" />
                            <stop offset="60%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#FDE047" />
                        </linearGradient>
                        <linearGradient id="flameInner" x1="0.5" y1="1" x2="0.5" y2="0">
                            <stop offset="0%" stopColor="#DC2626" />
                            <stop offset="50%" stopColor="#F97316" />
                            <stop offset="100%" stopColor="#FBBF24" />
                        </linearGradient>
                        {/* Drop shadow for depth */}
                        <filter id="coinShadow" x="-10%" y="-10%" width="120%" height="120%">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.3)" />
                        </filter>
                    </defs>

                    {/* === COIN BODY === */}
                    {/* Outer rim shadow */}
                    <circle cx="150" cy="150" r="145" fill="url(#metalRim)" filter="url(#coinShadow)" />
                    {/* Inner rim */}
                    <circle cx="150" cy="150" r="138" fill="#888" />
                    <circle cx="150" cy="150" r="136" fill="url(#metalRim)" />
                    {/* Main face */}
                    <circle cx="150" cy="150" r="128" fill="url(#metalFace)" />
                    {/* Shine overlay */}
                    <circle cx="150" cy="150" r="128" fill="url(#metalShine)" />

                    {/* === FLAMES (behind the F) === */}
                    <g transform="translate(150, 150)">
                        {/* Outermost flame tongues - left */}
                        <polygon points="-40,-20 -50,-65 -25,-45" fill="#DC2626" opacity="0.9" />
                        <polygon points="-25,-45 -40,-85 -15,-55" fill="#EA580C" />
                        <polygon points="-15,-55 -30,-95 -5,-65" fill="#F97316" />

                        {/* Outermost flame tongues - right */}
                        <polygon points="40,-20 50,-65 25,-45" fill="#DC2626" opacity="0.9" />
                        <polygon points="25,-45 42,-88 15,-55" fill="#EA580C" />
                        <polygon points="15,-55 32,-98 5,-65" fill="#F97316" />

                        {/* Center flame column */}
                        <polygon points="-20,-35 0,-105 20,-35" fill="url(#flameOuter)" />
                        <polygon points="-15,-40 0,-95 15,-40" fill="url(#flameInner)" />
                        <polygon points="-10,-45 0,-85 10,-45" fill="#FBBF24" />
                        <polygon points="-6,-48 0,-75 6,-48" fill="#FDE047" />
                        <polygon points="-3,-50 0,-65 3,-50" fill="#FEF9C3" />

                        {/* Left small flame */}
                        <polygon points="-35,-15 -45,-55 -20,-30" fill="#F97316" opacity="0.8" />
                        <polygon points="-30,-20 -38,-50 -18,-32" fill="#FBBF24" opacity="0.7" />

                        {/* Right small flame */}
                        <polygon points="35,-15 48,-58 20,-30" fill="#F97316" opacity="0.8" />
                        <polygon points="30,-20 40,-52 18,-32" fill="#FBBF24" opacity="0.7" />

                        {/* Crown-like flame tips */}
                        <polygon points="-8,-75 0,-110 8,-75" fill="#FDE047" />
                        <polygon points="-25,-55 -18,-90 -10,-55" fill="#F59E0B" />
                        <polygon points="10,-55 18,-90 25,-55" fill="#F59E0B" />
                        <polygon points="-4,-80 0,-100 4,-80" fill="#FEF9C3" />
                    </g>

                    {/* === THE F LETTER (geometric low-poly) === */}
                    <g transform="translate(150, 150)">
                        {/* F body - main rectangle pieces */}
                        {/* Left vertical bar */}
                        <polygon points="-30,-45 -10,-45 -10,45 -30,45" fill="#6D28D9" />
                        <polygon points="-30,-45 -10,-45 -20,-25" fill="#7C3AED" />
                        <polygon points="-10,-45 -10,-25 -20,-25" fill="#8B5CF6" />
                        <polygon points="-30,-25 -20,-25 -10,-25 -30,-5" fill="#6D28D9" />
                        <polygon points="-10,-25 -10,-5 -30,-5" fill="#7C3AED" />
                        <polygon points="-30,-5 -10,-5 -10,15 -30,15" fill="#5B21B6" />
                        <polygon points="-30,15 -10,15 -10,45 -30,45" fill="#4C1D95" />

                        {/* Top horizontal bar */}
                        <polygon points="-10,-45 30,-45 30,-30 -10,-30" fill="#8B5CF6" />
                        <polygon points="-10,-45 10,-45 0,-37" fill="#A855F7" />
                        <polygon points="10,-45 30,-45 20,-37" fill="#9333EA" />
                        <polygon points="-10,-30 10,-30 0,-37" fill="#7C3AED" />
                        <polygon points="10,-30 30,-30 20,-37" fill="#8B5CF6" />

                        {/* Middle horizontal bar */}
                        <polygon points="-10,-10 20,-10 20,5 -10,5" fill="#7C3AED" />
                        <polygon points="-10,-10 5,-10 -2,-2" fill="#8B5CF6" />
                        <polygon points="5,-10 20,-10 12,-2" fill="#9333EA" />
                        <polygon points="-10,5 5,5 -2,-2" fill="#6D28D9" />
                        <polygon points="5,5 20,5 12,-2" fill="#7C3AED" />

                        {/* White highlight facets on F */}
                        <polygon points="-28,-43 -18,-43 -23,-35" fill="rgba(255,255,255,0.35)" />
                        <polygon points="-8,-43 2,-43 -3,-37" fill="rgba(255,255,255,0.3)" />
                        <polygon points="-28,-3 -18,-3 -23,5" fill="rgba(255,255,255,0.2)" />
                        <polygon points="-8,-8 2,-8 -3,-2" fill="rgba(255,255,255,0.25)" />

                        {/* Subtle white edge highlights */}
                        <line x1="-30" y1="-45" x2="-10" y2="-45" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                        <line x1="-30" y1="-45" x2="-30" y2="45" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
                    </g>

                    {/* === SWOOSH CURVE === */}
                    <path d="M75 205 Q115 192 150 195 Q185 198 225 210"
                        stroke="url(#swoosh)" strokeWidth="5" strokeLinecap="round" fill="none" />
                    <path d="M80 208 Q115 196 150 198 Q185 200 220 212"
                        stroke="url(#swoosh)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />

                    {/* === FLARE STARS === */}
                    {/* Large star top-right */}
                    <g transform="translate(205, 60)">
                        <polygon points="0,-8 2,-2 8,0 2,2 0,8 -2,2 -8,0 -2,-2" fill="#FDE047" />
                    </g>
                    {/* Medium star top */}
                    <g transform="translate(175, 45)">
                        <polygon points="0,-5 1.3,-1.3 5,0 1.3,1.3 0,5 -1.3,1.3 -5,0 -1.3,-1.3" fill="#FBBF24" />
                    </g>
                    {/* Small star left */}
                    <g transform="translate(95, 70)">
                        <polygon points="0,-4 1,-1 4,0 1,1 0,4 -1,1 -4,0 -1,-1" fill="#FDE047" opacity="0.8" />
                    </g>
                    {/* Tiny flare */}
                    <g transform="translate(215, 85)">
                        <polygon points="0,-3 0.8,-0.8 3,0 0.8,0.8 0,3 -0.8,0.8 -3,0 -0.8,-0.8" fill="#FCA5A5" opacity="0.7" />
                    </g>
                    {/* Extra flares */}
                    <circle cx="190" cy="55" r="2" fill="white" opacity="0.9" />
                    <circle cx="110" cy="85" r="1.5" fill="white" opacity="0.7" />
                    <circle cx="200" cy="100" r="1.5" fill="white" opacity="0.6" />

                    {/* === "FLARE" TEXT === */}
                    <text
                        x="150"
                        y="250"
                        textAnchor="middle"
                        fill="#1a1a1a"
                        fontFamily="'Outfit', 'Arial Black', 'Impact', sans-serif"
                        fontWeight="900"
                        fontSize="40"
                        letterSpacing="5"
                    >
                        FLARE
                    </text>
                </svg>
            </motion.div>
        </div>
    );
};

export default BrandLogo;

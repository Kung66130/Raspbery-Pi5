import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Heart, X, Zap, Sparkles, RefreshCcw, RotateCcw, Settings2, MapPin, ChevronUp } from 'lucide-react';
import { api } from '../services/api';
import { useNotification } from './NotificationSystem';
import { useLanguage } from '../contexts/LanguageContext';

const SwipeCard = ({ profile, onSwipe, isTop }) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-18, 18]);
    const opacity = useTransform(x, [-250, -180, 0, 180, 250], [0, 1, 1, 1, 0]);
    const likeOpacity = useTransform(x, [30, 100], [0, 1]);
    const nopeOpacity = useTransform(x, [-30, -100], [0, 1]);

    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const photos = profile.photos && profile.photos.length > 0 ? profile.photos : [profile.image];
    const { t } = useLanguage();

    const handleTap = (e) => {
        const xPos = e.clientX;
        const width = window.innerWidth;
        if (xPos < width / 2) {
            setCurrentPhotoIndex(prev => Math.max(0, prev - 1));
        } else {
            setCurrentPhotoIndex(prev => Math.min(photos.length - 1, prev + 1));
        }
    };

    const handleDragEnd = (e, info) => {
        if (info.offset.x > 100) {
            onSwipe('right');
        } else if (info.offset.x < -100) {
            onSwipe('left');
        }
    };

    const isPulse = profile.id === profile.pulseId;

    return (
        <motion.div
            style={{ x, rotate, opacity, zIndex: isTop ? 10 : 5 }}
            drag={isTop ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.9}
            onDragEnd={handleDragEnd}
            className={`tinder-card-wrapper ${isPulse ? 'destiny-pulse-card' : ''}`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={(info) => ({
                x: x.get() > 0 ? 800 : -800,
                opacity: 0,
                rotate: x.get() > 0 ? 30 : -30,
                transition: { duration: 0.35, ease: "easeIn" }
            })}
        >
            {/* Destiny Pulse Aura */}
            {isPulse && (
                <motion.div
                    className="destiny-aura"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}

            {/* Card */}
            <div className="tinder-card" style={{ border: isPulse ? '2px solid #FFD700' : 'none' }}>
                {/* Photo tap zones */}
                <div className="card-photo-area" onClick={handleTap}>
                    <img
                        src={photos[currentPhotoIndex]}
                        alt={profile.name}
                        className="card-photo"
                        onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}&backgroundColor=b6e3f4`; }}
                    />

                    {/* Photo indicators */}
                    {photos.length > 1 && (
                        <div className="photo-dots">
                            {photos.map((_, i) => (
                                <div key={i} className={`photo-dot ${i === currentPhotoIndex ? 'active' : ''}`} />
                            ))}
                        </div>
                    )}

                    {/* LIKE / NOPE stamps */}
                    <motion.div style={{ opacity: likeOpacity }} className="stamp stamp-like">LIKE</motion.div>
                    <motion.div style={{ opacity: nopeOpacity }} className="stamp stamp-nope">NOPE</motion.div>

                    {/* Gradient overlay */}
                    <div className="card-gradient" />
                </div>

                {/* Destiny Label */}
                {isPulse && (
                    <div className="destiny-label">
                        <Zap size={12} fill="currentColor" />
                        <span>DESTINY PULSE</span>
                    </div>
                )}

                {/* User Info */}
                <div className="card-info-overlay">
                    <div className="card-info-main">
                        {profile.isOnline && (
                            <div className="active-badge">แอ็คทีฟอยู่</div>
                        )}
                        <div className="card-name-row">
                            <span className="card-name">{profile.name}</span>
                            <span className="card-age">{profile.age || 22}</span>
                            {profile.isVerified && (
                                <div className="verified-badge">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b82f6">
                                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="card-location">
                            <MapPin size={13} />
                            <span>ห่างกัน {profile.distance || 1} กม.</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const SoulSwipe = ({ user, onMatch }) => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [previousProfiles, setPreviousProfiles] = useState([]);
    const [pulseUserId, setPulseUserId] = useState(null);
    const [matchedPartner, setMatchedPartner] = useState(null); // 🎉 real match popup
    const { showNotification } = useNotification();
    const { t } = useLanguage();

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        setLoading(true);
        try {
            const data = await api.get('/matches/potential');
            const enhancedData = data.map(p => ({
                ...p,
                isVerified: Math.random() > 0.5,
                age: p.age || Math.floor(Math.random() * 10) + 18,
                distance: p.realDistance != null ? p.realDistance : (Math.floor(Math.random() * 20) + 1),
                isOnline: p.isOnline !== undefined ? p.isOnline : Math.random() > 0.4,
                photos: p.photos && p.photos.length > 0 ? p.photos : [p.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}&backgroundColor=b6e3f4`]
            }));
            setProfiles(enhancedData.sort(() => Math.random() - 0.5));
        } catch (err) {
            console.error('Failed to load souls:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSwipe = async (direction) => {
        const target = profiles[currentIndex];
        if (!target) return;

        // Move card first, then API call
        if (target.id === pulseUserId) setPulseUserId(null);
        setPreviousProfiles(prev => [...prev, currentIndex]);
        setCurrentIndex(prev => prev + 1);

        try {
            const apiDirection = direction === 'superlike' ? 'right' : direction;
            const result = await api.post('/swipes', { toUserId: target.id, direction: apiDirection });

            if (direction === 'superlike') {
                showNotification(t('soul.superLiked', { name: target.name }), 'success');
            }

            // 🎉 Real mutual match detected from backend
            if (result && result.isMatch) {
                const partner = result.partner || target;
                setMatchedPartner(partner);
            }
        } catch (e) {
            console.error('[Swipe] API error:', e);
        }
    };

    const handleRewind = () => {
        if (previousProfiles.length === 0) { showNotification(t('soul.noRewind'), "info"); return; }
        const newPrev = [...previousProfiles];
        const lastIndex = newPrev.pop();
        setPreviousProfiles(newPrev);
        setCurrentIndex(lastIndex);
        showNotification(t('soul.rewinded'), 'info');
    };

    if (loading) {
        return (
            <div className="swipe-loader">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <Sparkles size={60} color="var(--primary)" />
                </motion.div>
                <p>{t('soul.connecting')}</p>
            </div>
        );
    }

    if (currentIndex >= profiles.length) {
        return (
            <div className="swipe-empty">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="empty-content glass-panel">
                    <RefreshCcw size={48} className="refresh-icon" />
                    <h2>{t('soul.noMoreSouls')}</h2>
                    <p>{t('soul.seenEveryone')}</p>
                    <button className="flare-button-alt" onClick={() => { setCurrentIndex(0); loadProfiles(); }}>
                        {t('soul.findMore')}
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="tinder-layout">
            {/* 🎉 Match Popup */}
            <AnimatePresence>
                {matchedPartner && (
                    <motion.div
                        className="match-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="match-popup"
                            initial={{ scale: 0.5, y: 80, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 0.1 }}
                        >
                            {/* Sparkle particles */}
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="match-particle"
                                    initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                                    animate={{
                                        scale: [0, 1, 0],
                                        x: Math.cos((i / 8) * Math.PI * 2) * 120,
                                        y: Math.sin((i / 8) * Math.PI * 2) * 120,
                                        opacity: [1, 1, 0]
                                    }}
                                    transition={{ duration: 1.2, delay: 0.3 + i * 0.05 }}
                                />
                            ))}

                            <motion.h1
                                className="match-title"
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                It's a Match! 🔥
                            </motion.h1>
                            <p className="match-subtitle">คุณและ {matchedPartner.name} ชอบกันพร้อมกัน!</p>

                            <div className="match-avatars">
                                <motion.div
                                    className="match-avatar-wrap"
                                    initial={{ x: -60, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.4, type: 'spring' }}
                                >
                                    <img
                                        src={user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                        alt={user.name}
                                    />
                                    <span>{user.name}</span>
                                </motion.div>

                                <motion.div
                                    className="match-heart-center"
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.2 }}
                                >
                                    <Heart size={32} fill="#ef4444" color="#ef4444" />
                                </motion.div>

                                <motion.div
                                    className="match-avatar-wrap"
                                    initial={{ x: 60, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.4, type: 'spring' }}
                                >
                                    <img
                                        src={matchedPartner.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${matchedPartner.id}`}
                                        alt={matchedPartner.name}
                                    />
                                    <span>{matchedPartner.name}</span>
                                </motion.div>
                            </div>

                            <motion.button
                                className="match-chat-btn"
                                whileTap={{ scale: 0.95 }}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                onClick={() => {
                                    if (onMatch) onMatch(matchedPartner);
                                    setMatchedPartner(null);
                                }}
                            >
                                💬 เริ่มแชทเลย!
                            </motion.button>

                            <button
                                className="match-skip-btn"
                                onClick={() => setMatchedPartner(null)}
                            >
                                ดูต่อไปก่อน
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Centered Header */}
            <div className="tinder-header">
                <div className="th-center">
                    <h1 className="th-title">Flare</h1>
                </div>
            </div>

            {/* Card stack */}
            <div className="tinder-card-arena">
                <AnimatePresence>
                    {profiles.slice(currentIndex, currentIndex + 2).reverse().map((profile, index) => {
                        const isTop = index === 1 || profiles.slice(currentIndex, currentIndex + 2).length === 1;
                        return (
                            <SwipeCard
                                key={profile.id}
                                profile={{ ...profile, pulseId: pulseUserId }}
                                isTop={isTop}
                                onSwipe={handleSwipe}
                            />
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="tinder-actions">
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleRewind} className="action-btn act-rewind">
                    <RotateCcw size={20} color="#f59e0b" strokeWidth={2.5} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleSwipe('left')} className="action-btn act-nope">
                    <X size={28} color="#ef4444" strokeWidth={3} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleSwipe('right')} className="action-btn act-like">
                    <Heart size={28} color="#10b981" fill="#10b981" />
                </motion.button>
            </div>

            <style>{`
                /* ===== TINDER LAYOUT ===== */
                .tinder-layout {
                    position: fixed;
                    inset: 0;
                    bottom: 70px; /* nav bar space */
                    background: var(--bg-main);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                /* Header Centering - Floating but transparent */
                .tinder-header {
                    position: relative;
                    z-index: 100;
                    padding: calc(env(safe-area-inset-top) + 12px) 16px 14px;
                    display: flex;
                    justify-content: center;
                    background: transparent;
                    pointer-events: none;
                }
                .th-center {
                    pointer-events: auto;
                    text-align: center;
                }
                .th-title {
                    font-size: 1.6rem;
                    font-weight: 900;
                    background: linear-gradient(135deg, #a855f7, #ec4899, #f59e0b);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    letter-spacing: -0.5px;
                    font-family: 'Outfit', sans-serif;
                }

                /* Card Arena - Structured layout */
                .tinder-card-arena {
                    flex: 1; /* Return to flexbox taking remaining space */
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    justify-content: center;
                    align-items: stretch;
                    padding: 0;
                    z-index: 10;
                }

                /* Card Wrapper - Floating Card with Proportions */
                .tinder-card-wrapper {
                    position: absolute;
                    top: 10px;
                    bottom: 60px; /* Lift bottom to create the half-overlap effect for buttons */
                    left: 10px;
                    right: 10px;
                    max-width: 440px; 
                    margin: 0 auto;
                }

                /* Card itself - Rounded corners and shadows */
                .tinder-card {
                    width: 100%;
                    height: 100%;
                    background: #111;
                    border-radius: 20px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    position: relative;
                    overflow: hidden;
                    cursor: grab;
                }
                .tinder-card:active { cursor: grabbing; }

                /* Photo */
                .card-photo-area {
                    position: absolute; 
                    inset: 0;
                    cursor: pointer;
                    overflow: hidden;
                }
                .card-photo {
                    width: 100%; height: 100%;
                    object-fit: cover;
                    object-position: center top;
                    pointer-events: none;
                }
                /* Stronger bottom gradient for immersive UI */
                .card-gradient {
                    position: absolute;
                    inset: 0;
                    top: 50%; /* Only cover the bottom 50% */
                    background: linear-gradient(
                        to top,
                        rgba(0,0,0,0.95) 0%,
                        rgba(0,0,0,0.6) 40%,
                        transparent 100%
                    );
                    pointer-events: none;
                }

                /* Photo dots (top) */
                .photo-dots {
                    position: absolute;
                    top: 8px; left: 8px; right: 8px;
                    display: flex; gap: 4px;
                    z-index: 5;
                }
                .photo-dot {
                    flex: 1; height: 3px;
                    background: rgba(255,255,255,0.4);
                    border-radius: 2px;
                    transition: background 0.2s;
                }
                .photo-dot.active { background: white; }

                /* Stamps */
                .stamp {
                    position: absolute;
                    top: 60px;
                    padding: 8px 18px;
                    border: 4px solid;
                    border-radius: 10px;
                    font-size: 2rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    z-index: 20;
                    pointer-events: none;
                    letter-spacing: 2px;
                }
                .stamp-like { right: 20px; color: #10B981; border-color: #10B981; transform: rotate(-15deg); }
                .stamp-nope { left: 20px; color: #ef4444; border-color: #ef4444; transform: rotate(15deg); }

                /* Card info overlay (bottom) */
                .card-info-overlay {
                    position: absolute;
                    bottom: 0; left: 0; right: 0;
                    padding: 20px 18px 22px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    z-index: 10;
                    pointer-events: none;
                }
                .card-info-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .active-badge {
                    display: inline-flex;
                    align-items: center;
                    background: #10b981;
                    color: white;
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: 100px;
                    width: fit-content;
                    margin-bottom: 2px;
                }
                .card-name-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .card-name {
                    font-size: 1.9rem;
                    font-weight: 800;
                    color: white;
                    text-shadow: 0 2px 8px rgba(0,0,0,0.4);
                    line-height: 1;
                }
                .card-age {
                    font-size: 1.7rem;
                    font-weight: 400;
                    color: rgba(255,255,255,0.95);
                    text-shadow: 0 2px 8px rgba(0,0,0,0.4);
                }
                .verified-badge {
                    width: 22px; height: 22px;
                    background: white;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .card-location {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: rgba(255,255,255,0.9);
                    font-size: 0.88rem;
                    font-weight: 500;
                    text-shadow: 0 1px 4px rgba(0,0,0,0.4);
                }
                .card-expand-btn {
                    pointer-events: auto;
                    width: 38px; height: 38px;
                    background: rgba(255,255,255,0.2);
                    backdrop-filter: blur(8px);
                    border: none; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    flex-shrink: 0;
                    margin-bottom: 4px;
                }

                /* Action buttons Floating on bottom edge of the card */
                .tinder-actions {
                    position: absolute;
                    bottom: 25px; /* Positions center of 60px buttons precisely on the 55px bottom card edge */
                    left: 0; right: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 15px;
                    z-index: 100;
                    pointer-events: none;
                }
                .tinder-actions .action-btn {
                    pointer-events: auto;
                    border-radius: 50%;
                    background: white; /* Clean solid background like reference */
                    border: none;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.15); /* Soft shadow */
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .tinder-actions .action-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.25);
                }
                .tinder-actions .act-rewind { width: 48px; height: 48px; }
                .tinder-actions .act-nope   { width: 62px; height: 62px; }
                .tinder-actions .act-like   { width: 72px; height: 72px; }

                /* Card info overlay shifted for buttons */
                .card-info-overlay {
                    position: absolute;
                    bottom: 110px; /* ยกตัวหนังสือขึ้นสูงกว่าปุ่ม (ปุ่มเริ่มที่ 25px) */
                    left: 0; right: 0;
                    padding: 0 24px; /* เพิ่มระยะห่างจากขอบซ้าย-ขวา */
                    z-index: 50;
                    pointer-events: none;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start; /* จัดตัวละครให้ชิดซ้าย */
                    gap: 0px;
                }
                .card-name-row {
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                    text-align: left;
                }
                .card-name {
                    font-size: 2.2rem;
                    font-weight: 800;
                    color: white;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.6);
                    line-height: 1.1;
                }
                .card-age {
                    font-size: 1.8rem;
                    font-weight: 400;
                    color: white;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.6);
                }
                .card-location {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: rgba(255,255,255,0.95);
                    font-size: 1rem;
                    margin-top: 4px;
                    text-shadow: 0 1px 6px rgba(0,0,0,0.6);
                }

                /* ===== DESTINY PULSE ===== */
                .destiny-aura {
                    position: absolute; inset: -12px; border-radius: 20px;
                    background: radial-gradient(circle, rgba(255,215,0,0.35) 0%, transparent 70%);
                    filter: blur(12px);
                    z-index: -1;
                }
                .destiny-label {
                    position: absolute; top: 16px; left: 50%;
                    transform: translateX(-50%);
                    z-index: 30;
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    color: #000; font-size: 0.65rem; font-weight: 900;
                    padding: 5px 12px; border-radius: 100px;
                    display: flex; align-items: center; gap: 5px;
                    box-shadow: 0 3px 12px rgba(255,215,0,0.5);
                }
                .destiny-pulse-card { animation: destinyShake 10s infinite; }
                @keyframes destinyShake {
                    0%,90% { transform: none; }
                    92% { transform: rotate(0.8deg) scale(1.005); }
                    94% { transform: rotate(-0.8deg) scale(1.005); }
                    96% { transform: rotate(0.8deg) scale(1.005); }
                    98% { transform: rotate(-0.8deg) scale(1.005); }
                    100% { transform: none; }
                }

                /* Loading & Empty */
                .swipe-loader { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; color: var(--text-dim); }
                .swipe-empty { height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; }
                .empty-content { padding: 40px; text-align: center; border-radius: 24px; }
                .refresh-icon { color: var(--primary); margin-bottom: 20px; opacity: 0.5; }

                /* ===== MATCH POPUP ===== */
                .match-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(12px);
                    z-index: 999;
                    display: flex; align-items: center; justify-content: center;
                    padding: 20px;
                }
                .match-popup {
                    position: relative;
                    background: linear-gradient(145deg, #1a0a2e, #0f0f1f);
                    border: 1px solid rgba(168,85,247,0.3);
                    border-radius: 32px;
                    padding: 40px 30px;
                    text-align: center;
                    width: 100%; max-width: 380px;
                    box-shadow: 0 0 80px rgba(168,85,247,0.25);
                    overflow: hidden;
                }
                .match-title {
                    font-size: 2.2rem; font-weight: 900;
                    background: linear-gradient(135deg, #a855f7, #ec4899, #f59e0b);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    margin: 0 0 8px;
                    line-height: 1.1;
                }
                .match-subtitle {
                    color: rgba(255,255,255,0.7); font-size: 0.95rem;
                    margin: 0 0 32px;
                }
                .match-avatars {
                    display: flex; align-items: center; justify-content: center;
                    gap: 12px; margin-bottom: 32px;
                }
                .match-avatar-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                }
                .match-avatar-wrap img {
                    width: 90px; height: 90px; border-radius: 50%;
                    object-fit: cover;
                    border: 3px solid #a855f7;
                    box-shadow: 0 0 20px rgba(168,85,247,0.4);
                }
                .match-avatar-wrap span {
                    font-size: 0.8rem; font-weight: 700; color: white;
                    max-width: 90px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .match-heart-center {
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .match-chat-btn {
                    width: 100%;
                    padding: 16px;
                    background: linear-gradient(135deg, #a855f7, #ec4899);
                    border: none; border-radius: 16px;
                    color: white; font-size: 1.1rem; font-weight: 800;
                    cursor: pointer;
                    box-shadow: 0 8px 24px rgba(168,85,247,0.4);
                    margin-bottom: 12px;
                    transition: transform 0.2s;
                }
                .match-chat-btn:hover { transform: scale(1.02); }
                .match-skip-btn {
                    background: none; border: none;
                    color: rgba(255,255,255,0.4); font-size: 0.9rem;
                    cursor: pointer; padding: 8px;
                    transition: color 0.2s;
                }
                .match-skip-btn:hover { color: rgba(255,255,255,0.7); }
                .match-particle {
                    position: absolute; top: 50%; left: 50%;
                    width: 10px; height: 10px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #a855f7, #ec4899, #f59e0b);
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
};

export default SoulSwipe;

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, PhoneOff, User, Sparkles, Heart } from 'lucide-react';
import { api } from '../services/api';
import { useNotification } from './NotificationSystem';

const SoulRandomCall = ({ user, onExit }) => {
    const [status, setStatus] = useState('searching'); // searching, connecting, ringing, connected, ended
    const [partner, setPartner] = useState(null);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const [userWantsReveal, setUserWantsReveal] = useState(false);
    const [partnerWantsReveal, setPartnerWantsReveal] = useState(false);
    const { showNotification } = useNotification();
    const timerRef = useRef(null);

    useEffect(() => {
        if (status === 'connected' && duration === 15) {
            // Simulate partner wanting to reveal after some time
            showNotification("Partner is interested in revealing! ❤️", "info");
            setPartnerWantsReveal(true);
        }
    }, [status, duration]);

    const handleRevealRequest = () => {
        if (duration < 30) {
            showNotification("คุยกันอีกสักนิดนะ (อย่างน้อย 30 วินาที) ถึงจะเปิดเผยตัวตนได้ครับ", "info");
            return;
        }

        setUserWantsReveal(true);
        if (partnerWantsReveal) {
            setIsRevealed(true);
            showNotification("ตัวตนถูกเปิดเผยแล้ว! ยินดีที่ได้รู้จักนะ ❤️", "match");
        } else {
            showNotification("ส่งคำขอเปิดเผยตัวตนแล้ว รอฝ่ายตรงข้ามกดตอบรับนะครับ", "info");
            // For simulation, make partner accept after 5 more seconds
            setTimeout(() => {
                setPartnerWantsReveal(true);
                setIsRevealed(true);
                showNotification("พรหมลิขิตทำงาน! ตัวตนถูกเปิดเผยแล้วครับ ✨", "match");
            }, 5000);
        }
    };

    useEffect(() => {
        if (status === 'searching') {
            startMatchmaking();
        }
        return () => clearInterval(timerRef.current);
    }, [status]);

    useEffect(() => {
        if (status === 'connected') {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
    }, [status]);

    const startMatchmaking = async () => {
        // Simulate matching logic - in a real app, this would poll the backend
        // for another user who is also in the "soul call" queue.
        try {
            // First, tell the backend we are searching
            // await api.post('/calls/queue/join');

            // For demo/prototype, we poll or just wait a bit and pick a random "potential match"
            const timeout = setTimeout(async () => {
                const potential = await api.get('/matches/potential');
                if (potential && potential.length > 0) {
                    const randomPartner = potential[Math.floor(Math.random() * potential.length)];
                    setPartner({
                        ...randomPartner,
                        avatar: randomPartner.image,
                        cartoonUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomPartner.id}&backgroundColor=b6e3f4,c0aede,d1d4f9`
                    });
                    setStatus('connected'); // Connect immediately
                } else {
                    showNotification("No souls found yet. Keep your heart open!", "info");
                    onExit();
                }
            }, 3000);

            return () => clearTimeout(timeout);
        } catch (err) {
            console.error(err);
            onExit();
        }
    };

    const handleAcceptCall = () => {
        setStatus('connected');
    };

    const handleEndCall = () => {
        setStatus('ended');
        setTimeout(onExit, 2000);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="soul-call-overlay"
        >
            <div className="call-container glass-panel">
                <AnimatePresence mode="wait">
                    {status === 'searching' && (
                        <motion.div
                            key="searching"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="call-view searching-view"
                        >
                            <div className="radar-orbit">
                                <div className="radar-wave wave-1"></div>
                                <div className="radar-wave wave-2"></div>
                                <div className="radar-wave wave-3"></div>
                                <div className="user-avatar-ping">
                                    <img src={user.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`} alt="me" />
                                </div>
                            </div>
                            <h2>Seeking a Soul...</h2>
                            <p>Connecting heartbeats across the universe</p>
                            <button className="cancel-call-btn" onClick={onExit}>
                                <X size={24} />
                            </button>
                        </motion.div>
                    )}

                    {status === 'ringing' && (
                        <motion.div
                            key="ringing"
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="call-view ringing-view"
                        >
                            <div className="incoming-avatar">
                                <div className="ring-animation"></div>
                                <img src={partner?.cartoonUrl} alt="partner" />
                                <div className="mask-badge-call">🎭</div>
                            </div>
                            <div className="call-info">
                                <h3>{partner?.gender === 'Female' ? 'Mystery Girl' : 'Mystery Guy'}</h3>
                                <p>Incoming Soul Call...</p>
                            </div>
                            <div className="call-actions">
                                <button className="call-btn decline" onClick={onExit}><PhoneOff size={28} /></button>
                                <button className="call-btn accept" onClick={handleAcceptCall}><PhoneOff size={28} style={{ transform: 'rotate(135deg)' }} /></button>
                            </div>
                        </motion.div>
                    )}

                    {status === 'connected' && (
                        <motion.div
                            key="connected"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="call-view connected-view"
                        >
                            <div className="vocal-viz">
                                {[...Array(12)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ height: [10, Math.random() * 60 + 20, 10] }}
                                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                                        className="audio-bar"
                                    />
                                ))}
                            </div>

                            <div className="connected-partner">
                                <div className={`avatar-frame ${isRevealed ? 'revealed' : 'blurred'}`}>
                                    <img src={isRevealed ? partner?.avatar : partner?.cartoonUrl} alt="partner" />
                                    {!isRevealed && <div className="mask-float">🎭</div>}
                                </div>
                                <h2>{isRevealed ? partner?.name : 'Anonymous Soul'}</h2>
                                <div className="call-timer">{formatTime(duration)}</div>
                            </div>

                            <div className="call-footer-actions">
                                <button
                                    className={`tool-btn-call ${isMuted ? 'active' : ''}`}
                                    onClick={() => setIsMuted(!isMuted)}
                                >
                                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                                </button>

                                <button className="tool-btn-call end" onClick={handleEndCall}>
                                    <PhoneOff size={24} />
                                </button>

                                <button
                                    className={`tool-btn-call heart ${userWantsReveal ? 'active' : ''} ${partnerWantsReveal && !isRevealed ? 'pulsing' : ''}`}
                                    onClick={handleRevealRequest}
                                >
                                    <Heart size={24} fill={userWantsReveal ? "currentColor" : "none"} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {status === 'ended' && (
                        <motion.div
                            key="ended"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="call-view ended-view"
                        >
                            <div className="end-icon"><PhoneOff size={48} /></div>
                            <h2>Call Ended</h2>
                            <p>Duration: {formatTime(duration)}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`
                .soul-call-overlay {
                    position: fixed;
                    inset: 0;
                    background: var(--overlay);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                }
                .call-container {
                    width: 100%;
                    max-width: 400px;
                    height: 100%;
                    max-height: 700px;
                    background: var(--bg-dark);
                    border-radius: 40px;
                    overflow: hidden;
                    position: relative;
                }
                .call-view {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    text-align: center;
                }

                /* Searching View */
                .radar-orbit {
                    position: relative;
                    width: 200px;
                    height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 40px;
                }
                .radar-wave {
                    position: absolute;
                    inset: 0;
                    border: 2px solid var(--primary);
                    border-radius: 50%;
                    opacity: 0;
                }
                .wave-1 { animation: radar 3s infinite; }
                .wave-2 { animation: radar 3s infinite 1s; }
                .wave-3 { animation: radar 3s infinite 2s; }
                @keyframes radar {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                .user-avatar-ping {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    border: 4px solid var(--primary);
                    overflow: hidden;
                    z-index: 5;
                    box-shadow: 0 0 20px var(--primary-glow);
                }
                .user-avatar-ping img { width: 100%; height: 100%; object-fit: cover; }
                
                .cancel-call-btn {
                    margin-top: 60px;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    cursor: pointer;
                }

                /* Ringing View */
                .incoming-avatar {
                    position: relative;
                    margin-bottom: 30px;
                }
                .incoming-avatar img {
                    width: 150px;
                    height: 150px;
                    border-radius: 50%;
                    border: 5px solid #10B981;
                    padding: 5px;
                    background: var(--bg-light);
                }
                .ring-animation {
                    position: absolute;
                    inset: -10px;
                    border: 4px solid #10B981;
                    border-radius: 50%;
                    animation: ring-pulse 2s infinite;
                }
                @keyframes ring-pulse {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1.2); opacity: 0; }
                }
                .mask-badge-call {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    background: #10B981;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    border: 4px solid #16213E;
                }
                .call-info h3 { font-size: 1.8rem; font-weight: 800; margin-bottom: 8px; }
                .call-info p { color: #10B981; font-weight: 600; letter-spacing: 1px; }
                .call-actions {
                    display: flex;
                    gap: 40px;
                    margin-top: 60px;
                }
                .call-btn {
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    cursor: pointer;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
                }
                .call-btn.decline { background: #EF4444; }
                .call-btn.accept { background: #10B981; animation: jump 1s infinite; }
                @keyframes jump { 0%, 100% { transform: translateY(0) rotate(135deg); } 50% { transform: translateY(-5px) rotate(135deg); } }

                /* Connected View */
                .vocal-viz {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    height: 80px;
                    margin-bottom: 40px;
                }
                .audio-bar {
                    width: 4px;
                    background: #10B981;
                    border-radius: 2px;
                }
                .connected-partner {
                    text-align: center;
                }
                .avatar-frame {
                    position: relative;
                    width: 180px;
                    height: 180px;
                    margin: 0 auto 30px;
                }
                .avatar-frame img {
                    width: 100%;
                    height: 100%;
                    border-radius: 60px;
                    object-fit: cover;
                    border: 4px solid rgba(255,255,255,0.1);
                }
                .avatar-frame.blurred img { filter: blur(20px); }
                .mask-float {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 4rem;
                    background: rgba(0,0,0,0.3);
                    border-radius: 60px;
                }
                .call-timer {
                    font-family: monospace;
                    font-size: 1.2rem;
                    background: rgba(255,255,255,0.05);
                    padding: 8px 20px;
                    border-radius: 20px;
                    margin-top: 15px;
                }
                .call-footer-actions {
                    position: absolute;
                    bottom: 60px;
                    display: flex;
                    gap: 25px;
                    align-items: center;
                }
                .tool-btn-call {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tool-btn-call.active { background: var(--primary); color: white; border-color: transparent; }
                .tool-btn-call.end { background: #EF4444; width: 64px; height: 64px; }
                .tool-btn-call.heart.active { color: #FF4081; background: rgba(255,64,129,0.15); border-color: #FF4081; }
                .pulsing { animation: heart-pulse-btn 1.5s infinite; }
                @keyframes heart-pulse-btn {
                    0% { box-shadow: 0 0 0 0 rgba(255, 64, 129, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(255, 64, 129, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 64, 129, 0); }
                }

                /* Ended View */
                .end-icon { color: #EF4444; margin-bottom: 20px; opacity: 0.5; }
            `}</style>
        </motion.div>
    );
};

export default SoulRandomCall;

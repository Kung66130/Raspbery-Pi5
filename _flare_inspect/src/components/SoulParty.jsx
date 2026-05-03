import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Music, Heart, Sparkles, MessageCircle, Send, Plus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

const ANONYMOUS_NAMES = ['Shadow Cat', 'Hidden Wolf', 'Crystal Moon', 'Night Owl', 'Mystery Star', 'Silent Ghost', 'Cosmic Fox'];
const ANONYMOUS_COLORS = ['#f97316', '#ec4899', '#3b82f6', '#a855f7', '#10b981', '#fbbf24', '#6366f1'];

const SoulParty = ({ user, onExit, roomConfig }) => {
    const { t, language } = useLanguage();
    const [participants, setParticipants] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [myEmoji, setMyEmoji] = useState(null);
    const [myPos, setMyPos] = useState({ x: 0, y: 0 });
    const [roomVibe, setRoomVibe] = useState('neon'); // 'neon', 'chill', 'fire'
    const [myAura, setMyAura] = useState(null);
    const [trails, setTrails] = useState([]);
    const [activeNoteTarget, setActiveNoteTarget] = useState(null);
    const [noteInput, setNoteInput] = useState('');
    const [incomingNotes, setIncomingNotes] = useState([]); // {senderId, text, timestamp}
    const containerRef = useRef(null);
    const lastClickTime = useRef(0); // For custom double-click detection
    const audioRange = 9;

    // Room config with defaults
    const roomName = roomConfig?.name || 'Midnight Lo-Fi Chill';
    const roomIcebreaker = roomConfig?.icebreaker || 'If you could time travel, past or future?';
    const themeColor = roomConfig?.theme?.primary || '#a855f7';
    const themeSecondary = roomConfig?.theme?.secondary || '#7c3aed';
    const mapWidth = roomConfig?.mapSize?.width || 800;
    const mapHeight = roomConfig?.mapSize?.height || 300;

    // Tracking hearts
    const [myLikes, setMyLikes] = useState([]); // IDs of people I've hearted
    const [showMatchCelebration, setShowMatchCelebration] = useState(null); // ID of person just matched

    // Real-time Supabase Integration
    const channelRef = useRef(null);
    const [myAnonymousKey, setMyAnonymousKey] = useState(null);

    // Initial setup for the real-time presence channel
    useEffect(() => {
        // Provide unique anonymous identity to broadcast
        const anonIndex = Math.floor(Math.random() * ANONYMOUS_NAMES.length);
        const myKey = {
            id: user?.id || `user_${Math.random().toString(36).substring(7)}`,
            realName: user?.name || 'Anonymous',
            realImage: user?.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || Math.random()}&backgroundColor=b6e3f4`,
            name: ANONYMOUS_NAMES[anonIndex],
            color: ANONYMOUS_COLORS[anonIndex]
        };
        setMyAnonymousKey(myKey);

        const roomId = roomConfig?.id || 'public-lobby';
        const channel = supabase.channel(`party-room-${roomId}`, {
            config: {
                presence: { key: myKey.id }
            }
        });

        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const realtimeParticipants = [];
                for (const id in state) {
                    if (id === myKey.id) continue;
                    if (state[id] && state[id].length > 0) {
                        const pData = state[id][0];
                        // Real mutual liking detection!
                        const likesMe = pData.likes?.includes(myKey.id);
                        realtimeParticipants.push({ ...pData, likesMe });
                    }
                }
                setParticipants(realtimeParticipants);
            })
            // Listen for Vibe changes from Host/DJ
            .on('broadcast', { event: 'change_vibe' }, (payload) => {
                setRoomVibe(payload.payload.vibe);
            })
            // Listen for Secret Notes
            .on('broadcast', { event: 'secret_note' }, (payload) => {
                if (payload.payload.targetId === myKey.id) {
                    setIncomingNotes(prev => [...prev, {
                        senderId: payload.payload.senderId,
                        text: payload.payload.text,
                        timestamp: Date.now()
                    }]);
                    // Clear after 5 seconds
                    setTimeout(() => {
                        setIncomingNotes(prev => prev.filter(n => Date.now() - n.timestamp < 5000));
                    }, 5000);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Send initial coordinate update immediately
                    updatePresence(myKey, myPos, isMuted, myEmoji, myAura, myLikes);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomConfig?.id]);

    // Handle Trails
    useEffect(() => {
        const trailInterval = setInterval(() => {
            setTrails(prev => {
                // Keep trails for 4 seconds
                let newTrails = prev.filter(t => Date.now() - t.timestamp < 4000);
                if (myAnonymousKey) {
                    newTrails.push({ x: myPos.x, y: myPos.y, color: myAnonymousKey.color, id: `trail-me-${Date.now()}`, timestamp: Date.now() });
                }
                participants.forEach(p => {
                    newTrails.push({ x: p.x, y: p.y, color: p.color, id: `trail-${p.id}-${Date.now()}`, timestamp: Date.now() });
                });
                return newTrails;
            });
        }, 300); // Drop dot every 300ms
        return () => clearInterval(trailInterval);
    }, [myPos, participants, myAnonymousKey]);

    // Internal helper to broadcast state
    const updatePresence = (key, pos, muted, emoji, aura, likes) => {
        if (!channelRef.current || !key) return;
        channelRef.current.track({
            id: key.id,
            realName: key.realName,
            realImage: key.realImage,
            name: key.name,
            color: key.color,
            x: pos.x,
            y: pos.y,
            isSpeaking: !muted,
            emoji: emoji,
            aura: aura,
            likes: likes || []
        });
    };

    // Broadcast our updates across the wire
    useEffect(() => {
        if (myAnonymousKey && channelRef.current) {
            updatePresence(myAnonymousKey, myPos, isMuted, myEmoji, myAura, myLikes);
        }
    }, [myPos, isMuted, myEmoji, myAura, myAnonymousKey, myLikes]);

    const sendSecretNote = () => {
        if (!activeNoteTarget || !noteInput.trim()) return;
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'secret_note',
                payload: {
                    senderId: myAnonymousKey.id,
                    targetId: activeNoteTarget.id,
                    text: noteInput
                }
            });
            setNoteInput('');
            setActiveNoteTarget(null);
        }
    };

    const changeVibe = (newVibe) => {
        setRoomVibe(newVibe);
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'change_vibe',
                payload: { vibe: newVibe }
            });
        }
    };


    const handleReaction = (emoji) => {
        setMyEmoji(emoji);
        setShowReactions(false);
        setTimeout(() => setMyEmoji(null), 3000);
    };

    const handleHeartParticipant = (participantId) => {
        if (myLikes.includes(participantId)) return;

        const target = participants.find(p => p.id === participantId);
        setMyLikes(prev => [...prev, participantId]);

        // If mutual heart
        if (target && target.likesMe) {
            setShowMatchCelebration(target);
            setTimeout(() => setShowMatchCelebration(null), 4000);
        }
    };

    const handleCanvasClick = (e) => {
        // Double-click detection (native or manual)
        const now = Date.now();
        if (now - lastClickTime.current > 300) {
            lastClickTime.current = now;
            return; // Not a double click yet
        }
        lastClickTime.current = 0; // Reset

        if (!containerRef.current) return;

        // Don't teleport if clicking on interactive elements
        if (e.target.closest('.control-btn') || e.target.closest('.participant-node') || e.target.closest('.party-header')) {
            return;
        }

        // Get map content rect
        const canvasRect = e.currentTarget.getBoundingClientRect();

        // Calculate point relative to map center in vw/vh units
        const centerX = canvasRect.width / 2;
        const centerY = canvasRect.height / 2;

        const clickX = e.clientX - canvasRect.left;
        const clickY = e.clientY - canvasRect.top;

        const x = (clickX - centerX) / (window.innerWidth / 100);
        const y = (clickY - centerY) / (window.innerHeight / 100);

        setMyPos({ x, y });
    };

    const handleDrag = (e, info) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        // info.point is absolute screen coords
        const canvasX = info.point.x - rect.left;
        const canvasY = info.point.y - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const x = (canvasX - centerX) / (window.innerWidth / 100);
        const y = (canvasY - centerY) / (window.innerHeight / 100);

        setMyPos({ x, y });
    };

    // Calculate dynamic style for a participant
    const getParticipantStatus = (p) => {
        const dx = p.x - myPos.x;
        const dy = p.y - myPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const inRange = dist <= audioRange;
        const volumeFactor = inRange ? 1 : 0;

        return { inRange, volumeFactor, dist };
    };

    return (
        <div className="soul-party-container">
            {/* Header / Topic */}
            <div className="party-header glass-panel">
                <div className="room-info">
                    <Music size={20} color={themeColor} />
                    <div>
                        <h2>{roomName}</h2>
                        <div className="heat-bar-wrapper">
                            <div className="heat-bar" style={{ width: `${Math.min(100, (participants.length + 1) * 15)}%` }}></div>
                        </div>
                    </div>
                </div>
                <button className="btn-leave" onClick={onExit}>
                    <PhoneOff size={20} />
                </button>
            </div>

            {/* Spatial Canvas Area */}
            <div className="party-canvas" ref={containerRef}>
                <motion.div
                    className={`canvas-content vibe-${roomVibe}`}
                    drag
                    dragConstraints={containerRef}
                    dragElastic={0.1}
                    dragMomentum={true}
                    onPointerDown={handleCanvasClick}
                    initial={{ x: '-40%', y: '-10%' }} // Start somewhat in the middle-ish
                    style={{
                        width: `${mapWidth}vw`,
                        height: `${mapHeight}vh`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        display: 'block', // No flex here
                        backgroundImage: `
                            radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0),
                            linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)
                        `,
                        backgroundSize: '80px 80px, 400px 400px, 400px 400px',
                    }}
                >
                    <div className={`ambient-background vibe-${roomVibe}`}></div>

                    {/* Footprint Trails Rendering */}
                    {trails.map(t => (
                        <div key={t.id} className="trail-dot" style={{
                            left: `calc(50% + ${t.x}vw)`,
                            top: `calc(50% + ${t.y}vh)`,
                            backgroundColor: t.color,
                            boxShadow: `0 0 12px ${t.color}`
                        }}></div>
                    ))}

                    {/* Soul Threads (Drawn via SVG overlays) */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2, overflow: 'visible' }}>
                        {participants.filter(p => myLikes.includes(p.id)).map(p => (
                            <line
                                key={`thread-${p.id}`}
                                x1={`calc(50% + ${myPos.x}vw)`}
                                y1={`calc(50% + ${myPos.y}vh)`}
                                x2={`calc(50% + ${p.x}vw)`}
                                y2={`calc(50% + ${p.y}vh)`}
                                stroke={p.likesMe ? "#ec4899" : "rgba(236, 72, 153, 0.3)"}
                                strokeWidth={p.likesMe ? "4" : "2"}
                                strokeDasharray={p.likesMe ? "10, 10" : "5, 10"}
                                className={p.likesMe ? "soul-thread reciprocal" : "soul-thread"}
                            />
                        ))}
                    </svg>

                    {/* Map Zones */}
                    <div className="map-zone zone-stage">DJ STAGE</div>
                    <div className="map-zone zone-dancefloor">DANCE FLOOR</div>
                    <div className="map-zone zone-bar">THE BAR</div>
                    <div className="map-zone zone-chill">LOUNGE</div>

                    {/* Interactive Elements on Canvas */}
                    <div className="canvas-interactive" style={{ top: '27%', left: '35%' }}>
                        <div className="interactive-card glass-panel">
                            <span>Change Room Vibe</span>
                            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                <button onClick={() => changeVibe('chill')} className={`vibe-btn ${roomVibe === 'chill' ? 'active' : ''}`}>🧊 Chill</button>
                                <button onClick={() => changeVibe('neon')} className={`vibe-btn ${roomVibe === 'neon' ? 'active' : ''}`}>🎇 Neon</button>
                                <button onClick={() => changeVibe('fire')} className={`vibe-btn ${roomVibe === 'fire' ? 'active' : ''}`}>🔥 Rave</button>
                            </div>
                        </div>
                    </div>

                    <div className="canvas-interactive" style={{ top: '37%', left: '80%' }}>
                        <div className="interactive-card glass-panel">
                            <span>Grab a Drink Aura</span>
                            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                <button onClick={() => setMyAura('fire')} className={`aura-btn ${myAura === 'fire' ? 'active' : ''}`}>🔥 Fire</button>
                                <button onClick={() => setMyAura('ice')} className={`aura-btn ${myAura === 'ice' ? 'active' : ''}`}>🧊 Ice</button>
                                <button onClick={() => setMyAura('neon')} className={`aura-btn ${myAura === 'neon' ? 'active' : ''}`}>✨ Magic</button>
                                <button onClick={() => setMyAura(null)} className="aura-btn">❌ Clear</button>
                            </div>
                        </div>
                    </div>

                    {/* Icebreaker Prompt */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="icebreaker-prompt glass-panel"
                    >
                        <Sparkles size={16} color="#fbbf24" />
                        <span>"{roomIcebreaker}"</span>
                    </motion.div>

                    {/* Other Participants */}
                    {participants.map((p) => {
                        const status = getParticipantStatus(p);
                        const isHeartedByMe = myLikes.includes(p.id);
                        const isReciprocal = isHeartedByMe && p.likesMe;
                        const opacityScale = status.inRange ? 0.4 + (status.volumeFactor * 0.6) : 0.2;

                        return (
                            <motion.div
                                key={p.id}
                                className={`participant-node ${p.isSpeaking && status.inRange ? 'speaking' : ''} ${!status.inRange ? 'out-of-range' : ''} ${isReciprocal ? 'revealed' : ''}`}
                                initial={{ x: 0, y: 0 }}
                                animate={{
                                    x: `${p.x}vw`,
                                    y: `${p.y}vh`,
                                    scale: (p.isSpeaking && status.inRange) ? [1, 1.1, 1] : 1
                                }}
                                transition={{
                                    scale: { repeat: (p.isSpeaking && status.inRange) ? Infinity : 0, duration: 1.5 },
                                    x: { type: 'spring', damping: 20 },
                                    y: { type: 'spring', damping: 20 }
                                }}
                                style={{
                                    opacity: opacityScale,
                                    left: '50%',
                                    top: '50%',
                                    x: '-50%', // Centering via framer-motion x/y instead of transform
                                    y: '-50%',
                                }}
                            >
                                <div className={`node-avatar-wrapper aura-${p.aura}`} style={{
                                    borderColor: isReciprocal ? '#ec4899' : (status.inRange ? p.color : '#555'),
                                    boxShadow: (p.isSpeaking && status.inRange) ? `0 0 20px ${p.color}80` : 'none'
                                }}>
                                    <div className="node-avatar" style={{ background: `linear-gradient(135deg, ${p.color}40, ${p.color}10)` }}>
                                        {isReciprocal ? (
                                            <img src={p.realImage} alt={p.realName} />
                                        ) : (
                                            p.name ? p.name.charAt(0) : '?'
                                        )}
                                    </div>

                                    {/* Quick Heart Action Overlay */}
                                    {!isHeartedByMe && status.inRange && (
                                        <button
                                            className="quick-heart-btn"
                                            onClick={(e) => { e.stopPropagation(); handleHeartParticipant(p.id); }}
                                        >
                                            <Heart size={14} fill="#ec4899" color="#ec4899" />
                                        </button>
                                    )}
                                    {isHeartedByMe && !p.likesMe && (
                                        <div className="hearted-status">
                                            <Heart size={12} fill="#ec4899" color="#ec4899" />
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span className="node-name">
                                        {isReciprocal ? p.realName : (p.name || 'Anonymous Soul')}
                                    </span>
                                    {!status.inRange && <span className="range-indicator">ไกลเกินไป</span>}
                                    {status.inRange && p.isSpeaking && <span className="volume-indicator" style={{ color: p.color }}>🔊 {Math.round(status.volumeFactor * 100)}%</span>}
                                </div>

                                {/* ... (rest of reaction/waves remained same) ... */}
                                <AnimatePresence>
                                    {p.emoji && status.inRange && (
                                        <motion.div
                                            initial={{ scale: 0, y: 10 }}
                                            animate={{ scale: 1, y: -20 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            className="node-reaction"
                                        >
                                            {p.emoji}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {p.isSpeaking && status.inRange && (
                                    <div className="spatial-waves" style={{ '--wave-color': p.color, opacity: status.volumeFactor }}>
                                        <span></span><span></span><span></span>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}

                    <motion.div
                        drag
                        dragMomentum={false}
                        onDrag={handleDrag}
                        className={`participant-node current-user ${!isMuted ? 'speaking' : ''}`}
                        animate={{
                            x: `${myPos.x}vw`,
                            y: `${myPos.y}vh`
                        }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
                        style={{
                            zIndex: 10,
                            left: '50%',
                            top: '50%',
                            x: '-50%',
                            y: '-50%',
                        }}
                    >
                        {/* Audio Hearing Zone (Dynamic Size) */}
                        <div
                            className="hearing-zone"
                            style={{
                                width: `${audioRange * 2}vw`,
                                height: `${audioRange * 2}vw`
                            }}
                        ></div>

                        <div className={`node-avatar-wrapper aura-${myAura}`} style={{ borderColor: '#ec4899', boxShadow: !isMuted ? `0 0 20px #ec489980` : 'none' }}>
                            <div className="node-avatar">
                                <img src={user?.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}&backgroundColor=b6e3f4`} alt="Me" />
                            </div>
                        </div>
                        <span className="node-name">You (Drag me)</span>

                        <AnimatePresence>
                            {incomingNotes.map(note => (
                                <motion.div
                                    key={note.timestamp}
                                    initial={{ scale: 0, y: 20 }}
                                    animate={{ scale: 1, y: -80 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="secret-note-bubble"
                                >
                                    <MessageCircle size={10} style={{ marginRight: '5px' }} />
                                    {note.text}
                                </motion.div>
                            ))}

                            {myEmoji && (
                                <motion.div
                                    initial={{ scale: 0, y: 10 }}
                                    animate={{ scale: 1, y: -20 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="node-reaction"
                                >
                                    {myEmoji}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            </div>


            {/* Bottom Controls */}            <div className="party-controls glass-panel">
                <button
                    className={`control-btn ${isMuted ? 'muted' : 'active'}`}
                    onClick={() => setIsMuted(!isMuted)}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                <div style={{ position: 'relative' }}>
                    <AnimatePresence>
                        {showReactions && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                className="emoji-picker glass-panel"
                            >
                                {['❤️', '😂', '🔥', '✨', '👋', '🎵'].map(e => (
                                    <button key={e} onClick={() => handleReaction(e)}>{e}</button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button className="control-btn" onClick={() => setShowReactions(!showReactions)}>
                        <Heart size={24} />
                    </button>
                </div>

                <button
                    className={`control-btn secret-note-btn ${activeNoteTarget ? 'active' : ''}`}
                    onClick={() => {
                        // Pick nearest as default or open picker
                        const nearest = participants.filter(p => getParticipantStatus(p).inRange)[0];
                        setActiveNoteTarget(nearest || null);
                    }}
                >
                    <Send size={20} />
                    <span>Secret Note</span>
                </button>
            </div>

            {/* Secret Note Input Overlay */}
            <AnimatePresence>
                {activeNoteTarget && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="note-input-overlay glass-panel"
                    >
                        <div className="note-target-info">
                            <span>To: {activeNoteTarget.name}</span>
                            <button onClick={() => setActiveNoteTarget(null)}>×</button>
                        </div>
                        <div className="note-input-row">
                            <input
                                autoFocus
                                value={noteInput}
                                onChange={e => setNoteInput(e.target.value)}
                                placeholder="Type a secret message..."
                                onKeyDown={e => e.key === 'Enter' && sendSecretNote()}
                            />
                            <button onClick={sendSecretNote} className="send-circle">
                                <Send size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Match Celebration Overlay */}
            <AnimatePresence>
                {showMatchCelebration && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="match-celebration-overlay"
                    >
                        <div className="celebration-content glass-panel">
                            <div className="heart-burst">❤️</div>
                            <h3>Soul Match!</h3>
                            <p>You and <b>{showMatchCelebration.realName}</b> felt the connection.</p>
                            <div className="real-profile-preview">
                                <img src={showMatchCelebration.realImage} alt="Match" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .soul-party-container {
                    position: fixed;
                    inset: 0;
                    background: #0a0510;
                    z-index: 200;
                    display: flex;
                    flex-direction: column;
                    overflow: auto; /* Enable scrolling */
                    font-family: 'Inter', sans-serif;
                    -webkit-overflow-scrolling: touch;
                }
                /* Hide scrollbars but keep functionality */
                .soul-party-container::-webkit-scrollbar { display: none; }
                
                .ambient-background {
                    position: absolute; /* Relative to map, not screen */
                    inset: 0;
                    pointer-events: none;
                    z-index: 0;
                    transition: all 1s ease-in-out;
                }
                .ambient-background.vibe-neon {
                    background: radial-gradient(circle at 50% 50%, rgba(168,85,247,0.15) 0%, transparent 60%),
                                 radial-gradient(circle at 80% 20%, rgba(236,72,153,0.1) 0%, transparent 40%);
                }
                .ambient-background.vibe-chill {
                    background: radial-gradient(circle at 50% 50%, rgba(59,130,246,0.15) 0%, transparent 60%),
                                 radial-gradient(circle at 20% 80%, rgba(16,185,129,0.1) 0%, transparent 40%);
                }
                .ambient-background.vibe-fire {
                    background: radial-gradient(circle at 50% 50%, rgba(2ef,68,68,0.15) 0%, transparent 60%),
                                 radial-gradient(circle at 80% 80%, rgba(249,115,22,0.1) 0%, transparent 40%);
                }
                
                /* Aura Effects */
                .aura-fire { box-shadow: 0 0 40px #ef4444, inset 0 0 20px #ef4444 !important; border-color: #ef4444 !important; }
                .aura-ice { box-shadow: 0 0 40px #3b82f6, inset 0 0 20px #3b82f6 !important; border-color: #3b82f6 !important; }
                .aura-neon { box-shadow: 0 0 40px #a855f7, inset 0 0 20px #a855f7 !important; border-color: #a855f7 !important; }

                /* Trails */
                .trail-dot {
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    opacity: 0.6;
                    animation: fadeTrail 4s ease-out forwards;
                    pointer-events: none;
                    z-index: 1;
                }
                @keyframes fadeTrail {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
                    100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                }

                /* Soul Threads */
                .soul-thread {
                    opacity: 0.7;
                    transition: stroke 0.3s;
                }
                .soul-thread.reciprocal {
                    animation: threadPulse 2s linear infinite, glowPulse 1.5s ease-in-out infinite alternate;
                    filter: drop-shadow(0 0 10px #ec4899);
                    opacity: 1;
                }
                @keyframes threadPulse {
                    from { stroke-dashoffset: 20; }
                    to { stroke-dashoffset: 0; }
                }
                @keyframes glowPulse {
                    from { filter: drop-shadow(0 0 5px #ec4899); }
                    to { filter: drop-shadow(0 0 20px #ec4899); }
                }

                /* Interactive UI */
                .canvas-interactive {
                    position: absolute;
                    transform: translate(-50%, -50%);
                    z-index: 10;
                }
                .interactive-card {
                    padding: 15px;
                    border-radius: 15px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    background: rgba(10,5,20,0.85);
                    border: 1px solid rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                }
                .interactive-card span { font-weight: 700; color: white; font-size: 0.8rem; letter-spacing: 1px; text-transform: uppercase; }
                .vibe-btn, .aura-btn {
                    padding: 8px 12px;
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.05);
                    color: white;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                }
                .vibe-btn:hover, .aura-btn:hover { background: rgba(255,255,255,0.15); transform: translateY(-2px); }
                .vibe-btn.active, .aura-btn.active { background: #a855f7; border-color: #ec4899; box-shadow: 0 0 10px rgba(236,72,153,0.5); }
                
                .heat-bar-wrapper {
                    width: 100px;
                    height: 4px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 2px;
                    margin-top: 4px;
                    overflow: hidden;
                }
                .heat-bar {
                    height: 100%;
                    background: linear-gradient(to right, #a855f7, #ec4899);
                    transition: width 0.5s ease;
                }

                .secret-note-bubble {
                    position: absolute;
                    background: white;
                    color: #1e1428;
                    padding: 8px 12px;
                    border-radius: 15px 15px 15px 0;
                    font-size: 0.8rem;
                    font-weight: 600;
                    white-space: nowrap;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    z-index: 20;
                    pointer-events: none;
                }

                .note-input-overlay {
                    position: fixed;
                    bottom: 100px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 320px;
                    padding: 15px;
                    z-index: 200;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    border: 1px solid rgba(255,255,255,0.2);
                }
                .note-target-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.8rem;
                    color: rgba(255,255,255,0.7);
                }
                .note-target-info button { background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; }
                .note-input-row { display: flex; gap: 10px; }
                .note-input-row input {
                    flex: 1;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 20px;
                    padding: 8px 15px;
                    color: white;
                    outline: none;
                }
                .send-circle {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    background: var(--primary);
                    border: none;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                .party-header {
                    position: fixed; /* Stick to top */
                    top: 10px;
                    left: 15px;
                    right: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 15px;
                    border-radius: 15px;
                    z-index: 100;
                    background: rgba(20, 10, 30, 0.85);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.05);
                }
                
                .party-canvas {
                    flex: 1;
                    position: relative;
                    overflow: hidden; /* We'll use Framer Motion for dragging instead of native scroll */
                    cursor: grab;
                }
                .party-canvas:active { cursor: grabbing; }

                .canvas-content {
                    /* Style handled inline by motion.div */
                }
                .room-info {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .room-info h2 { font-size: 1rem; color: white; margin: 0 0 4px; font-weight: 700; }
                .room-info p { font-size: 0.75rem; color: #a855f7; margin: 0; font-weight: 600; }
                
                .btn-leave {
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    background: rgba(239, 68, 68, 0.1);
                    color: #EF4444;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-leave:hover { background: #EF4444; color: white; }

                .party-canvas {
                    flex: 1;
                    position: relative;
                    /* No flex centering here as it breaks dragging constraints */
                    overflow: hidden;
                    cursor: grab;
                }
                .map-zone {
                    position: absolute;
                    padding: 40px 80px;
                    border-radius: 40px;
                    background: rgba(255,255,255,0.01);
                    border: 2px dashed rgba(255,255,255,0.08);
                    color: rgba(255,255,255,0.2);
                    font-size: 3rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.3em;
                    pointer-events: none;
                    white-space: nowrap;
                    z-index: 1;
                    /* Glow effect for zones */
                    box-shadow: inset 0 0 100px rgba(255,255,255,0.02);
                }
                /* Distribute zones horizontally across 800vw */
                .zone-chill { top: 40%; left: 15%; border-color: rgba(16,185,129,0.2); color: rgba(16,185,129,0.3); }
                .zone-stage { top: 25%; left: 35%; border-color: rgba(168,85,247,0.2); color: rgba(168,85,247,0.3); }
                .zone-dancefloor { top: 55%; left: 55%; border-color: rgba(236,72,153,0.2); color: rgba(236,72,153,0.3); border-radius: 50%; padding: 150px; }
                .zone-bar { top: 35%; left: 80%; border-color: rgba(59,130,246,0.2); color: rgba(59,130,246,0.3); }

                .icebreaker-prompt {
                    position: absolute;
                    top: 100px;
                    padding: 10px 20px;
                    border-radius: 20px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: white;
                    font-size: 0.9rem;
                    font-weight: 500;
                    z-index: 5;
                }

                .participant-node {
                    position: absolute;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }
                .node-avatar-wrapper {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    padding: 3px;
                    border: 2px solid transparent;
                    transition: all 0.3s;
                    position: relative;
                }
                .node-avatar {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    color: white;
                    font-weight: 800;
                    overflow: hidden;
                }
                .node-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .node-name {
                    font-size: 0.75rem;
                    color: rgba(255,255,255,0.7);
                    background: rgba(0,0,0,0.5);
                    padding: 2px 10px;
                    border-radius: 10px;
                    pointer-events: none;
                    white-space: nowrap;
                    font-weight: 600;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .revealed .node-name {
                    color: #ec4899;
                    background: rgba(236,72,153,0.15);
                    border-color: rgba(236,72,153,0.3);
                }
                .quick-heart-btn {
                    position: absolute;
                    bottom: -5px;
                    right: -5px;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: white;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                    z-index: 5;
                    transition: transform 0.2s;
                }
                .quick-heart-btn:hover { transform: scale(1.2); }
                .hearted-status {
                    position: absolute;
                    bottom: -2px;
                    right: -2px;
                    background: rgba(0,0,0,0.6);
                    padding: 4px;
                    border-radius: 50%;
                    display: flex;
                }

                .match-celebration-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(10, 5, 16, 0.8);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .celebration-content {
                    padding: 40px;
                    border-radius: 30px;
                    text-align: center;
                    background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.2));
                    border: 1px solid rgba(236,72,153,0.3);
                }
                .heart-burst {
                    font-size: 4rem;
                    margin-bottom: 20px;
                    animation: pulse 1s infinite;
                }
                .real-profile-preview {
                    width: 120px;
                    height: 120px;
                    margin: 20px auto 0;
                    border-radius: 50%;
                    border: 4px solid #ec4899;
                    overflow: hidden;
                    box-shadow: 0 0 30px rgba(236,72,153,0.4);
                }
                .real-profile-preview img { width: 100%; height: 100%; object-fit: cover; }

                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }

                .node-reaction {
                    position: absolute;
                    top: -10px;
                    font-size: 1.5rem;
                    background: rgba(255,255,255,0.1);
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(5px);
                }
                .range-indicator {
                    font-size: 0.65rem;
                    color: #aaa;
                    margin-top: 2px;
                }
                .volume-indicator {
                    font-size: 0.65rem;
                    font-weight: 700;
                    margin-top: 2px;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
                }

                .current-user { cursor: grab; }
                .current-user:active { cursor: grabbing; }

                /* Hearing Zone Circle */
                .hearing-zone {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    /* Dynamically sized in JSX */
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(236,72,153,0.06) 0%, rgba(236,72,153,0.02) 50%, transparent 70%);
                    border: 1px dashed rgba(236,72,153,0.3);
                    pointer-events: none;
                    z-index: -1;
                    box-shadow: inset 0 0 50px rgba(0,0,0,0.5);
                    transition: width 0.3s, height 0.3s;
                }

                /* Audio Waves Animation */
                .spatial-waves {
                    position: absolute;
                    inset: -20px;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .spatial-waves span {
                    position: absolute;
                    border: 1px solid var(--wave-color);
                    border-radius: 50%;
                    animation: ripple 2s linear infinite;
                    opacity: 0;
                }
                .spatial-waves span:nth-child(1) { width: 80px; height: 80px; animation-delay: 0s; }
                .spatial-waves span:nth-child(2) { width: 100px; height: 100px; animation-delay: 0.6s; }
                .spatial-waves span:nth-child(3) { width: 120px; height: 120px; animation-delay: 1.2s; }

                @keyframes ripple {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(1.5); opacity: 0; }
                }

                .party-controls {
                    position: fixed; /* Stick to bottom */
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 15px;
                    padding: 12px 20px;
                    border-radius: 24px;
                    background: rgba(30, 20, 40, 0.8);
                    backdrop-filter: blur(10px);
                    z-index: 100;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .control-btn {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .control-btn.active {
                    background: var(--primary);
                    border-color: var(--primary);
                }
                .control-btn.muted {
                    background: rgba(239, 68, 68, 0.1);
                    color: #EF4444;
                    border-color: rgba(239, 68, 68, 0.2);
                }
                .control-btn.secret-note-btn.active {
                    background: #ec4899;
                    box-shadow: 0 0 15px #ec489980;
                }
                .secret-note-btn {
                    width: auto;
                    padding: 0 20px;
                    border-radius: 25px;
                    background: linear-gradient(135deg, #a855f7, #ec4899);
                    border: none;
                    gap: 8px;
                    font-weight: 600;
                    font-size: 0.9rem;
                }
                .secret-note-btn:hover {
                    box-shadow: 0 0 15px rgba(236, 72, 153, 0.4);
                    transform: scale(1.05);
                }

                .emoji-picker {
                    position: absolute;
                    bottom: 70px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 10px;
                    padding: 12px;
                    border-radius: 20px;
                    background: rgba(30, 20, 40, 0.95);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .emoji-picker button {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .emoji-picker button:hover { transform: scale(1.3); }


                /* Map zones handled above */
            `}</style>
        </div>
    );
};

export default SoulParty;

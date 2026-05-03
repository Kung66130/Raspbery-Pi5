import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart, MoreVertical, Sparkles, UserCheck, Eye, EyeOff, Clock, MessageCircle } from 'lucide-react';
import { api } from '../services/api';
import { useNotification } from './NotificationSystem';

const SoulRandomChat = ({ user, onExit }) => {
    const [status, setStatus] = useState('searching'); // searching, found, chat
    const [partner, setPartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isRevealed, setIsRevealed] = useState(false);
    const [userWantsReveal, setUserWantsReveal] = useState(false);
    const [chatTime, setChatTime] = useState(0);
    const scrollerRef = useRef(null);
    const { showNotification } = useNotification();

    const MESSAGE_GOAL = 7;

    // Search timer animation
    const [searchDots, setSearchDots] = useState('');
    useEffect(() => {
        if (status !== 'searching') return;
        const interval = setInterval(() => {
            setSearchDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, [status]);

    // Chat timer
    useEffect(() => {
        if (status !== 'chat') return;
        const interval = setInterval(() => setChatTime(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, [status]);

    // Find match on mount
    useEffect(() => {
        if (status === 'searching') findMatch();
    }, []);

    // Poll messages
    useEffect(() => {
        if (status !== 'chat' || !partner) return;
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [status, partner]);

    // Auto-scroll
    useEffect(() => {
        if (scrollerRef.current) {
            scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async () => {
        if (!partner) return;
        try {
            const data = await api.get(`/chats/${partner.id}`);
            if (data.messages) {
                setMessages(data.messages);
                setIsRevealed(data.isRevealed);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    const findMatch = async () => {
        try {
            // Simulate searching delay for UX
            await new Promise(resolve => setTimeout(resolve, 3000));

            const data = await api.get('/matches/potential');
            if (data && data.length > 0) {
                const randomPartner = data[Math.floor(Math.random() * data.length)];
                setPartner({
                    id: randomPartner.id,
                    name: randomPartner.name,
                    image: randomPartner.image,
                    bio: randomPartner.bio,
                    username: randomPartner.username,
                    cartoonUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomPartner.id}&backgroundColor=b6e3f4,c0aede,d1d4f9`
                });
                setStatus('found');

                // After 2.5s transition to chat
                setTimeout(async () => {
                    setStatus('chat');
                    fetchMessages();
                }, 2500);
            } else {
                showNotification("ไม่พบผู้ใช้ที่ว่างอยู่ตอนนี้ ลองใหม่อีกครั้งนะ!", "info");
                onExit();
            }
        } catch (err) {
            console.error('Matching error:', err);
            showNotification("เกิดข้อผิดพลาดในการจับคู่", "error");
            onExit();
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !partner) return;

        const text = inputText;
        setInputText('');

        // Optimistic update
        const tempMsg = {
            id: 'temp_' + Date.now(),
            sender_id: user.id,
            receiver_id: partner.id,
            text,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const newMessage = await api.post(`/chats/${partner.id}`, { text });
            setMessages(prev => prev.map(m => m.id === tempMsg.id ? newMessage : m));
        } catch (err) {
            showNotification("ส่งข้อความไม่สำเร็จ", "error");
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
            setInputText(text);
        }
    };

    const handleRevealRequest = async () => {
        const myMsgCount = messages.filter(m => m.sender_id === user.id).length;
        const partnerMsgCount = messages.filter(m => m.sender_id === partner.id).length;

        if (myMsgCount < 3 || partnerMsgCount < 2) {
            showNotification(`คุยกันอีกนิดนะ! ต้องมีข้อความรวมกันอย่างน้อย ${MESSAGE_GOAL} ข้อความ`, "info");
            return;
        }

        try {
            const data = await api.post(`/chats/${partner.id}/reveal`);
            setUserWantsReveal(true);
            if (data.isRevealed) {
                setIsRevealed(true);
                showNotification("เปิดเผยตัวตนแล้ว! ✨ ตอนนี้คุณเห็นโปรไฟล์จริงของกันและกันได้แล้ว!", "success");
            } else {
                showNotification("ส่งคำขอเปิดเผยตัวตนแล้ว ❤️ รอให้อีกฝ่ายกดยอมรับด้วยนะ", "info");
            }
        } catch (err) {
            showNotification("เปิดเผยตัวตนไม่สำเร็จ", "error");
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const totalMessages = messages.length;
    const progress = Math.min(totalMessages / MESSAGE_GOAL, 1);
    const canReveal = totalMessages >= MESSAGE_GOAL;

    return (
        <div className="random-chat-master">
            <AnimatePresence mode="wait">
                {status === 'searching' && (
                    <motion.div
                        key="searching"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="matching-layer"
                    >
                        <div className="radar-orbit">
                            <motion.div
                                animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="radar-ring r1"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                className="radar-ring r2"
                            />
                            <div className="user-avatar-center">
                                <img src={user?.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.id}`} alt="me" />
                            </div>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="radar-sweep"
                            />
                        </div>
                        <h2 className="search-title">กำลังค้นหาเพื่อนใหม่{searchDots}</h2>
                        <p className="search-sub">Connecting Souls ✨</p>
                        <button className="cancel-match-btn" onClick={onExit}>ยกเลิก</button>
                    </motion.div>
                )}

                {status === 'found' && (
                    <motion.div
                        key="found"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="match-found-layer"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 0.5, repeat: 3 }}
                            className="found-heart"
                        >
                            <Heart size={80} fill="#FF4081" color="#FF4081" />
                        </motion.div>

                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="found-card glass-panel"
                        >
                            <div className="found-avatar">
                                <img src={partner?.cartoonUrl} alt="soul" />
                                <div className="mask-badge">🎭</div>
                            </div>
                            <h2>Anonymous Soul</h2>
                            <p>เจอแล้ว! เตรียมพูดคุยกัน...</p>
                            <span className="hint-text">ตัวตนจะเปิดเผยเมื่อคุยกันครบ {MESSAGE_GOAL} ข้อความ</span>
                        </motion.div>
                    </motion.div>
                )}

                {status === 'chat' && partner && (
                    <motion.div
                        key="chat"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="chat-layer"
                    >
                        {/* Chat Header */}
                        <div className="chat-header">
                            <button className="header-btn" onClick={onExit}><X size={20} /></button>
                            <div className="header-partner">
                                <div className={`partner-avatar ${isRevealed ? 'revealed' : 'anonymous'}`}>
                                    <img
                                        src={isRevealed ? (partner.image || `https://ui-avatars.com/api/?name=${partner.name}&background=random`) : partner.cartoonUrl}
                                        alt="partner"
                                    />
                                    {!isRevealed && <span className="avatar-mask">🎭</span>}
                                    {isRevealed && <span className="avatar-check"><UserCheck size={12} /></span>}
                                </div>
                                <div className="header-info">
                                    <h4>{isRevealed ? partner.name : 'Anonymous Soul'}</h4>
                                    <div className="header-meta">
                                        <Clock size={12} />
                                        <span>{formatTime(chatTime)}</span>
                                        <span className="meta-dot">•</span>
                                        <MessageCircle size={12} />
                                        <span>{totalMessages} msg</span>
                                    </div>
                                </div>
                            </div>
                            <div className="header-actions">
                                <motion.button
                                    className={`reveal-btn ${canReveal ? 'active' : 'disabled'}`}
                                    onClick={handleRevealRequest}
                                    animate={canReveal && !userWantsReveal ? { scale: [1, 1.15, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    {isRevealed ? <Eye size={18} /> : userWantsReveal ? <Heart size={18} fill="#FF4081" color="#FF4081" /> : <EyeOff size={18} />}
                                </motion.button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {!isRevealed && (
                            <div className="reveal-progress-bar">
                                <div className="progress-track">
                                    <motion.div
                                        className="progress-fill"
                                        animate={{ width: `${progress * 100}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <span className="progress-label">
                                    {canReveal ? '🔓 พร้อมเปิดเผยตัวตน! กดปุ่ม 👁 เพื่อขอเปิดเผย' : `🔒 ${totalMessages}/${MESSAGE_GOAL} ข้อความก่อนเปิดเผยตัวตน`}
                                </span>
                            </div>
                        )}

                        {/* Revealed Profile Banner */}
                        {isRevealed && (
                            <motion.div
                                className="revealed-banner"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                            >
                                <img src={partner.image || `https://ui-avatars.com/api/?name=${partner.name}&background=random`} alt="" className="revealed-img" />
                                <div className="revealed-info">
                                    <strong>{partner.name}</strong>
                                    {partner.username && <span>@{partner.username}</span>}
                                    {partner.bio && <p>{partner.bio}</p>}
                                </div>
                                <UserCheck size={20} color="#10b981" />
                            </motion.div>
                        )}

                        {/* Messages */}
                        <div className="chat-messages" ref={scrollerRef}>
                            {/* System message */}
                            <div className="system-msg">
                                <Sparkles size={14} />
                                <span>คุณกับ Anonymous Soul เริ่มสนทนา — คุยกันครบ {MESSAGE_GOAL} ข้อความเพื่อเปิดเผยตัวตน!</span>
                            </div>

                            {messages.map((msg, i) => (
                                <motion.div
                                    key={msg.id || i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`msg-row ${msg.sender_id === user.id ? 'mine' : 'theirs'}`}
                                >
                                    {msg.sender_id !== user.id && (
                                        <div className="msg-avatar-mini">
                                            <img src={isRevealed ? (partner.image || partner.cartoonUrl) : partner.cartoonUrl} alt="" />
                                        </div>
                                    )}
                                    <div className={`msg-bubble ${msg.sender_id === user.id ? 'me' : 'them'}`}>
                                        <p>{msg.text}</p>
                                        <span className="msg-time">
                                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Reveal milestone */}
                            {canReveal && !isRevealed && (
                                <motion.div
                                    className="milestone-msg"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <Heart size={16} color="#FF4081" />
                                    <span>คุยกันครบ {MESSAGE_GOAL} ข้อความแล้ว! พร้อมเปิดเผยตัวตนหรือยัง?</span>
                                </motion.div>
                            )}
                        </div>

                        {/* Input */}
                        <form className="chat-input-area" onSubmit={sendMessage}>
                            <div className="input-container glass-panel">
                                <input
                                    type="text"
                                    placeholder={isRevealed ? `ส่งข้อความถึง ${partner.name}...` : "พิมพ์ข้อความ..."}
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    autoFocus
                                />
                                <button type="submit" disabled={!inputText.trim()} className="send-btn">
                                    <Send size={18} />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .random-chat-master {
                    position: fixed;
                    inset: 0;
                    background: var(--bg-dark);
                    z-index: 2000;
                    display: flex;
                    flex-direction: column;
                }

                /* --- SEARCHING --- */
                .matching-layer {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 40px;
                }
                .radar-orbit {
                    position: relative;
                    width: 200px;
                    height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 40px;
                }
                .radar-ring {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    border: 2px solid var(--primary);
                }
                .radar-ring.r2 { border-color: var(--secondary); }
                .user-avatar-center img {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    border: 3px solid var(--primary);
                    box-shadow: 0 0 25px var(--primary-glow);
                    object-fit: cover;
                    position: relative;
                    z-index: 2;
                }
                .radar-sweep {
                    position: absolute;
                    width: 100px;
                    height: 2px;
                    background: linear-gradient(to right, transparent, var(--primary));
                    top: 50%;
                    left: 50%;
                    transform-origin: left center;
                    z-index: 1;
                }
                .search-title { font-size: 1.5rem; font-weight: 800; margin-bottom: 8px; }
                .search-sub { color: var(--text-dim); margin-bottom: 30px; }
                .cancel-match-btn {
                    padding: 12px 30px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    border-radius: 50px;
                    color: var(--text-main);
                    cursor: pointer;
                    font-weight: 600;
                }

                /* --- FOUND --- */
                .match-found-layer {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                }
                .found-card {
                    padding: 30px;
                    text-align: center;
                    border-radius: 28px;
                    min-width: 280px;
                }
                .found-avatar {
                    position: relative;
                    margin-bottom: 16px;
                    display: inline-block;
                }
                .found-avatar img {
                    width: 110px;
                    height: 110px;
                    border-radius: 35px;
                    border: 3px solid var(--primary);
                    padding: 4px;
                    background: var(--glass);
                }
                .mask-badge {
                    position: absolute;
                    bottom: -8px;
                    right: -8px;
                    width: 36px;
                    height: 36px;
                    background: var(--primary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    border: 3px solid var(--bg-dark);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                }
                .found-card h2 { font-size: 1.6rem; color: var(--text-main); margin-bottom: 6px; }
                .found-card p { color: var(--text-dim); margin-bottom: 8px; }
                .hint-text { font-size: 0.78rem; color: var(--primary); font-weight: 500; }

                /* --- CHAT --- */
                .chat-layer {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                .chat-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 16px;
                    background: rgba(0,0,0,0.3);
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }
                .header-btn {
                    background: none;
                    border: none;
                    color: var(--text-main);
                    cursor: pointer;
                    padding: 4px;
                }
                .header-partner {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .partner-avatar {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    position: relative;
                    overflow: hidden;
                    border: 2px solid var(--primary);
                    flex-shrink: 0;
                }
                .partner-avatar img { width: 100%; height: 100%; object-fit: cover; }
                .partner-avatar.anonymous img { filter: blur(0); }
                .avatar-mask {
                    position: absolute;
                    bottom: -2px;
                    right: -2px;
                    font-size: 0.7rem;
                    background: var(--bg-dark);
                    border-radius: 50%;
                    padding: 1px 3px;
                }
                .avatar-check {
                    position: absolute;
                    bottom: -2px;
                    right: -2px;
                    background: #10b981;
                    border-radius: 50%;
                    padding: 2px;
                    color: white;
                }
                .header-info h4 { margin: 0; font-size: 0.95rem; }
                .header-meta {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.7rem;
                    color: var(--text-dim);
                    margin-top: 2px;
                }
                .meta-dot { opacity: 0.3; }
                .header-actions { display: flex; gap: 10px; }
                .reveal-btn {
                    background: none;
                    border: 2px solid var(--primary);
                    color: var(--primary);
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .reveal-btn.active {
                    background: rgba(168, 85, 247, 0.15);
                    box-shadow: 0 0 15px var(--primary-glow);
                }
                .reveal-btn.disabled {
                    border-color: rgba(255,255,255,0.1);
                    color: var(--text-dim);
                    cursor: not-allowed;
                }

                /* Progress */
                .reveal-progress-bar {
                    padding: 10px 16px;
                    background: rgba(0,0,0,0.2);
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .progress-track {
                    width: 100%;
                    height: 4px;
                    background: var(--glass);
                    border-radius: 10px;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(to right, var(--primary), #FF4081);
                    border-radius: 10px;
                }
                .progress-label {
                    font-size: 0.72rem;
                    color: var(--text-dim);
                    text-align: center;
                }

                /* Revealed banner */
                .revealed-banner {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    background: rgba(16, 185, 129, 0.08);
                    border-bottom: 1px solid rgba(16, 185, 129, 0.15);
                }
                .revealed-img {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid #10b981;
                }
                .revealed-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .revealed-info strong { font-size: 0.9rem; color: var(--text-main); }
                .revealed-info span { font-size: 0.75rem; color: #10b981; }
                .revealed-info p { font-size: 0.75rem; color: var(--text-dim); margin: 2px 0 0; }

                /* Messages */
                .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .system-msg {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    justify-content: center;
                    padding: 8px 14px;
                    background: rgba(168, 85, 247, 0.08);
                    border-radius: 12px;
                    color: var(--text-dim);
                    font-size: 0.75rem;
                    text-align: center;
                    margin-bottom: 10px;
                }
                .msg-row {
                    display: flex;
                    align-items: flex-end;
                    gap: 8px;
                }
                .msg-row.mine { justify-content: flex-end; }
                .msg-row.theirs { justify-content: flex-start; }
                .msg-avatar-mini {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                .msg-avatar-mini img { width: 100%; height: 100%; object-fit: cover; }
                .msg-bubble {
                    max-width: 75%;
                    padding: 10px 14px;
                    border-radius: 18px;
                    position: relative;
                }
                .msg-bubble p { margin: 0; font-size: 0.92rem; line-height: 1.45; }
                .msg-bubble.me {
                    background: linear-gradient(135deg, var(--primary), var(--secondary));
                    border-bottom-right-radius: 4px;
                    color: white;
                }
                .msg-bubble.them {
                    background: var(--glass);
                    border-bottom-left-radius: 4px;
                    color: var(--text-main);
                }
                .msg-time {
                    font-size: 0.6rem;
                    color: var(--text-dim);
                    opacity: 0.5;
                    display: block;
                    margin-top: 4px;
                    text-align: right;
                }
                .msg-bubble.them .msg-time { text-align: left; }

                .milestone-msg {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    justify-content: center;
                    padding: 10px;
                    background: rgba(255, 64, 129, 0.08);
                    border: 1px solid rgba(255, 64, 129, 0.15);
                    border-radius: 14px;
                    margin-top: 10px;
                    color: #FF4081;
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                /* Input */
                .chat-input-area {
                    padding: 12px 16px;
                    padding-bottom: calc(12px + env(safe-area-inset-bottom));
                    background: rgba(0,0,0,0.4);
                }
                .input-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 6px 6px 6px 16px;
                    border-radius: 50px;
                }
                .input-container input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: var(--text-main);
                    outline: none;
                    font-family: inherit;
                    font-size: 0.92rem;
                }
                .send-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary), var(--secondary));
                    color: white;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .send-btn:disabled { opacity: 0.3; cursor: default; }
                .send-btn:not(:disabled):hover { transform: scale(1.05); box-shadow: 0 4px 15px var(--primary-glow); }

                /* Scrollbar */
                .chat-messages::-webkit-scrollbar { width: 3px; }
                .chat-messages::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default SoulRandomChat;

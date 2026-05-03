import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Send, Heart, Eye, EyeOff, UserCheck, Sparkles,
    Clock, MessageCircle, MoreVertical, ShieldAlert,
    Mic, Image as ImageIcon, Smile, Check, CheckCheck, Ban
} from 'lucide-react';
import { api } from '../services/api';
import { useNotification } from './NotificationSystem';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../services/supabase';

const ICE_BREAKERS = [
    "ชอบภูเขาหรือทะเลมากกว่ากัน? 🏔️🌊",
    "อาหารจานโปรดคืออะไร? 🍜",
    "ถ้ามีพลังวิเศษ 1 อย่าง อยากได้อะไร? ✨",
    "เพลงที่ฟังบ่อยที่สุดช่วงนี้? 🎵",
    "เคยไปเที่ยวที่ไหนแล้วประทับใจที่สุด? ✈️",
    "งานอดิเรกเวลาว่างคืออะไร? 🎨",
];

const SoulChatRoom = ({ user, partner, onBack }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isRevealed, setIsRevealed] = useState(true);
    const [userWantsReveal, setUserWantsReveal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [chatTime, setChatTime] = useState(0);
    const [showOptions, setShowOptions] = useState(false);
    const [showIceBreakers, setShowIceBreakers] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [sendLoading, setSendLoading] = useState(false);

    // Media/Voice simulation states
    const [isRecording, setIsRecording] = useState(false);

    const scrollerRef = useRef(null);
    const fileInputRef = useRef(null);
    const { showNotification } = useNotification();

    const MESSAGE_GOAL = 7;

    // Chat timer
    useEffect(() => {
        const interval = setInterval(() => setChatTime(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch messages & Realtime Setup
    useEffect(() => {
        fetchMessages();

        // Save current active partner to localStorage so App knows where NOT to show notifications
        localStorage.setItem('flare_active_chat_partner', partner.id);

        // Supabase Realtime Subscription
        const channel = supabase.channel(`realtime:messages:${user.id}-${partner.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}`
            }, (payload) => {
                // Check if the message is from our partner
                if (payload.new.sender_id === partner.id) {
                    setMessages(prev => {
                        // Prevent duplicates
                        if (prev.find(m => m.id === payload.new.id)) return prev;
                        return [...prev, payload.new];
                    });
                }
            })
            .subscribe();

        return () => {
            localStorage.removeItem('flare_active_chat_partner');
            supabase.removeChannel(channel);
        };
    }, [partner.id]);

    // Auto-scroll
    useEffect(() => {
        if (scrollerRef.current) {
            scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
        }
    }, [messages, isTyping, showIceBreakers]);

    const fetchMessages = async () => {
        try {
            const data = await api.get(`/chats/${partner.id}`);
            // Ensure no duplicate keys by re-mapping if needed or trusting backend
            setMessages(data.messages || []);

            // Only update revealed state if the new status is true (revealed)
            // This prevents hiding if it was already forced open from profile
            if (data.isRevealed) {
                setIsRevealed(true);
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching messages:', err);
            setLoading(false);
        }
    };

    const sendMessage = async (textToSend, file = null) => {
        const text = textToSend || inputText;
        if (!text.trim() && !file) return;

        if (!textToSend && !file) setInputText(''); // Clear input if it was manual typing
        setShowIceBreakers(false);
        setSendLoading(true);

        const tempMsg = {
            id: 'temp_' + Date.now(),
            sender_id: user.id,
            receiver_id: partner.id,
            text: text || '',
            image: file && !file.type.startsWith('audio') ? URL.createObjectURL(file) : null,
            audio: file && file.type.startsWith('audio') ? URL.createObjectURL(file) : null,
            timestamp: new Date().toISOString(),
            status: 'sending' 
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            let result;
            if (file) {
                const formData = new FormData();
                if (text) formData.append('text', text);
                
                // แยก 필드 (Separate fields)
                if (file.type.startsWith('audio')) {
                    formData.append('audio', file);
                } else {
                    formData.append('image', file);
                }
                
                result = await api.post(`/chats/${partner.id}`, formData, true);
            } else {
                result = await api.post(`/chats/${partner.id}`, { text });
            }
            
            setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...result, status: 'sent' } : m));
            if (!textToSend && !file) setInputText('');
        } catch (err) {
            showNotification(err.message?.includes('ADD COLUMN audio') ? "โปรดเพิ่มคอลัมน์ audio ใน Supabase ก่อน" : "ส่งไม่สำเร็จ", "error");
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
            if (!textToSend && !file) setInputText(text);
        } finally {
            setSendLoading(false);
        }
    };

    const handleImageUpload = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                let permissions = await Camera.checkPermissions();
                if (permissions.photos !== 'granted' || permissions.camera !== 'granted') {
                    permissions = await Camera.requestPermissions();
                    if (permissions.photos !== 'granted') {
                         showNotification("ต้องการสิทธิ์เข้าถึงรูปภาพเพื่อส่ง", "error");
                         return;
                    }
                }

                const photo = await Camera.getPhoto({
                    resultType: CameraResultType.Uri,
                    source: CameraSource.Prompt,
                    quality: 80,
                    allowEditing: false,
                });

                if (photo.webPath) {
                    const response = await fetch(photo.webPath);
                    const blob = await response.blob();
                    if (blob.size > 8 * 1024 * 1024) {
                        showNotification("ขนาดรูปภาพต้องไม่เกิน 8MB", "error");
                        return;
                    }
                    const file = new File([blob], `chat_img_${Date.now()}.${photo.format}`, { type: `image/${photo.format}` });
                    sendMessage('', file);
                }
            } catch (err) {
                console.warn('Camera action error or cancelled:', err);
            }
        } else {
            // Fallback for browser
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 8 * 1024 * 1024) {
                        showNotification("ขนาดรูปภาพต้องไม่เกิน 8MB", "error");
                        return;
                    }
                    sendMessage('', file);
                }
            };
            input.click();
        }
    };

    const handleRevealRequest = async () => {
        if (messages.length < MESSAGE_GOAL && !isRevealed) {
            showNotification(`คุยกันอีก ${MESSAGE_GOAL - messages.length} ข้อความเพื่อปลดล็อก!`, "info");
            return;
        }

        try {
            const data = await api.post(`/chats/${partner.id}/reveal`);
            setUserWantsReveal(true);
            if (data.isRevealed) {
                setIsRevealed(true);
                showNotification(t('soul.identityRevealed'), "success");
            } else {
                showNotification(t('soul.identityRequested'), "info");
            }
        } catch (err) {
            showNotification(t('soul.identityError'), "error");
        }
    };

    const handleReport = () => {
        showNotification(t('chat.reportedUser', { name: partner.name }), "success");
        setShowOptions(false);
    };

    const handleBlock = () => {
        try {
            const currentlyBlockedRaw = localStorage.getItem('flare_blocked_users');
            let currentlyBlocked = currentlyBlockedRaw ? JSON.parse(currentlyBlockedRaw) : [];
            if (!currentlyBlocked.find(u => u.id === partner.id)) {
                currentlyBlocked.push({ id: partner.id, image: partner.image, name: partner.name });
                localStorage.setItem('flare_blocked_users', JSON.stringify(currentlyBlocked));
            }
        } catch (err) { }

        showNotification(t('chat.blockedUser', { name: partner.name }), "success");
        setShowOptions(false);
        onBack();
    };

    const startRecording = async () => {
        if (!Capacitor.isNativePlatform()) {
            showNotification("ระบบอัดเสียงรองรับเฉพาะบนแอปมือถือ", "info");
            return;
        }

        try {
            const hasPermission = await VoiceRecorder.hasAudioRecordingPermission();
            if (!hasPermission.value) {
                const requestSession = await VoiceRecorder.requestAudioRecordingPermission();
                if (!requestSession.value) {
                    showNotification("ต้องการสิทธิ์เข้าถึงไมโครโฟนเพื่ออัดเสียง", "error");
                    return;
                }
            }

            if (isRecording) return;
            setIsRecording(true);
            await VoiceRecorder.startRecording();
        } catch (err) {
            console.error('Failed to start recording', err);
            setIsRecording(false);
        }
    };

    const stopRecording = async () => {
        if (!isRecording || !Capacitor.isNativePlatform()) return;
        setIsRecording(false);

        try {
            const result = await VoiceRecorder.stopRecording();
            if (result.value && result.value.recordDataBase64) {
                const byteCharacters = atob(result.value.recordDataBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: result.value.mimeType });
                
                const file = new File([blob], `voice_${Date.now()}.m4a`, { type: result.value.mimeType });
                
                sendMessage('', file);
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
            showNotification("เกิดข้อผิดพลาดในการอัดเสียง", "error");
        }
    };

    const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    const totalMessages = messages.length;
    const progress = Math.min(totalMessages / MESSAGE_GOAL, 1);
    const canReveal = totalMessages >= MESSAGE_GOAL;

    const partnerCartoon = `https://api.dicebear.com/7.x/adventurer/svg?seed=${partner.id}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    const partnerReal = partner.image || `https://ui-avatars.com/api/?name=${partner.name}&background=random`;

    return (
        <div className="soul-chat-room">
            {/* Header */}
            <header className="scr-header glass-panel-bottom">
                <button className="scr-back" onClick={onBack}><ChevronLeft size={24} /></button>
                <div className="scr-partner">
                    <div className="scr-avatar">
                        <img src={partnerReal} alt="avatar" />
                    </div>
                    <div className="scr-info">
                        <h4>{partner.name}</h4>
                        <div className="scr-meta">
                            {isTyping ? (
                                <span className="typing-text">กำลังพิมพ์...</span>
                            ) : (
                                <>
                                    <Clock size={11} /><span>{formatTime(chatTime)}</span>
                                    <span className="dot-sep">•</span>
                                    <MessageCircle size={11} /><span>{totalMessages}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="scr-actions-right">
                    <div style={{ position: 'relative' }}>
                        <button className="scr-opt-btn" onClick={() => setShowOptions(!showOptions)}>
                            <MoreVertical size={20} />
                        </button>
                        <AnimatePresence>
                            {showOptions && (
                                <motion.div
                                    className="scr-dropdown glass-panel"
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                >
                                    <button onClick={handleReport}><ShieldAlert size={16} /> รายงานปัญหา</button>
                                    <button onClick={handleBlock} className="danger"><Ban size={16} /> บล็อกผู้ใช้</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <div className="scr-messages" ref={scrollerRef}>
                {loading ? (
                    <div className="scr-center">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="scr-spinner" />
                    </div>
                ) : (
                    <>
                        <div className="scr-sys-msg">
                            <Sparkles size={13} />
                            <span>การสนทนาที่ปลอดภัยและเป็นส่วนตัว</span>
                        </div>

                        {/* Ice Breakers Hint */}
                        {messages.length === 0 ? (
                            <div className="scr-empty-state">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="scr-empty-icon"
                                >
                                    <Sparkles size={40} color="var(--primary)" />
                                </motion.div>
                                <h3>เริ่มบทสนทนาใหม่!</h3>
                                <p>ทักทายคุยกับ {partner.name} ด้วยคำถามสนุกๆ หรือคำถามชวนคุยสิ</p>
                                <button className="scr-ice-btn" onClick={() => setShowIceBreakers(true)}>
                                    <MessageCircle size={16} /> ดูคำถามชวนคุย
                                </button>
                            </div>
                        ) : messages.length < 2 && (
                            <div className="scr-ice-breaker-hint">
                                <p>ไม่รู้จะคุยอะไร? ลองใช้ <strong>คำถามชวนคุย</strong> สิ!</p>
                                <button onClick={() => setShowIceBreakers(true)}>ดูคำถาม</button>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <motion.div
                                key={msg.id || i}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`scr-row ${msg.sender_id === user.id ? 'mine' : 'theirs'}`}
                            >
                                {msg.sender_id !== user.id && (
                                    <div className="scr-mini-avatar">
                                        <img src={isRevealed ? partnerReal : partnerCartoon} alt="" />
                                    </div>
                                )}
                                <div className="scr-bubble-group">
                                    <div className={`scr-bubble ${msg.sender_id === user.id ? 'me' : 'them'}`}>
                                        {msg.audio ? (
                                            <div className="msg-audio-wrapper">
                                                <audio controls src={msg.audio} style={{ height: '40px', width: '220px' }} />
                                            </div>
                                        ) : msg.image ? (
                                            <div className="msg-image-wrapper">
                                                <img src={msg.image} alt="Sent Image" style={{ width: '100%', borderRadius: '12px', background: 'white' }} />
                                            </div>
                                        ) : (
                                            <p>{msg.text}</p>
                                        )}
                                    </div>
                                    <span className={`scr-time ${msg.sender_id === user.id ? 'me' : 'them'}`}>
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        {msg.sender_id === user.id && (
                                            msg.status === 'read' ? <CheckCheck size={12} color="#4ade80" /> : <Check size={12} />
                                        )}
                                    </span>
                                </div>
                            </motion.div>
                        ))}

                        {isTyping && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="scr-row theirs">
                                <div className="scr-mini-avatar">
                                    <img src={isRevealed ? partnerReal : partnerCartoon} alt="" />
                                </div>
                                <div className="scr-bubble them typing">
                                    <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                                </div>
                            </motion.div>
                        )}

                        <div style={{ height: 20 }} />
                    </>
                )}
            </div>

            {/* Ice Breakers Overlay */}
            <AnimatePresence>
                {showIceBreakers && (
                    <motion.div
                        className="ice-breakers-container"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <div className="ice-header">
                            <span>❄️ หัวข้อชวนคุย</span>
                            <button onClick={() => setShowIceBreakers(false)}>ปิด</button>
                        </div>
                        <div className="ice-list">
                            {ICE_BREAKERS.map((q, i) => (
                                <button key={i} onClick={() => sendMessage(q)}>{q}</button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Area */}
            <form className="scr-input-area" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
                <div className="scr-tools">
                    <button type="button" className="tool-icon" onClick={() => setShowIceBreakers(!showIceBreakers)}>
                        <Sparkles size={20} color="#FFD700" />
                    </button>
                    <button type="button" className="tool-icon" onClick={handleImageUpload}>
                        <ImageIcon size={20} />
                    </button>
                </div>

                <div className="scr-input glass-panel">
                    <input
                        type="text"
                        placeholder={isRevealed ? `ส่งข้อความถึง ${partner.name}...` : "พิมพ์ข้อความ..."}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onFocus={() => setShowIceBreakers(false)}
                    />
                    {inputText.trim() ? (
                        <button type="submit" className="send-btn">
                            <Send size={18} />
                        </button>
                    ) : (
                        <button 
                            type="button" 
                            className={`mic-btn ${isRecording ? 'recording' : ''}`}
                            onMouseDown={startRecording} 
                            onMouseUp={stopRecording}
                            onMouseLeave={stopRecording}
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                        >
                            <Mic size={18} color={isRecording ? 'white' : 'currentColor'} />
                        </button>
                    )}
                </div>
            </form>

            <style>{`
                .soul-chat-room {
                    position: fixed; inset: 0; background: var(--bg-dark);
                    z-index: 2100; display: flex; flex-direction: column;
                }
                .glass-panel-bottom {
                    background: rgba(0,0,0,0.3); backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                }
                
                /* Header */
                .scr-header {
                    display: flex; align-items: center; gap: 10px;
                    padding: 12px 14px; padding-top: calc(12px + env(safe-area-inset-top));
                }
                .scr-back { background: none; border: none; color: white; padding: 4px; border-radius: 50%; }
                .scr-partner { flex: 1; display: flex; align-items: center; gap: 10px; overflow: hidden; }
                .scr-avatar {
                    width: 38px; height: 38px; border-radius: 50%; position: relative;
                    border: 2px solid var(--primary); flex-shrink: 0;
                }
                .scr-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
                .scr-mask {
                    position: absolute; bottom: -2px; right: -2px; font-size: 0.7rem;
                    background: var(--bg-dark); border-radius: 50%; padding: 1px 3px;
                }
                .scr-info h4 { margin: 0; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .scr-meta { display: flex; align-items: center; gap: 4px; font-size: 0.7rem; color: var(--text-dim); }
                .typing-text { color: var(--primary); font-style: italic; animation: pulse 1.5s infinite; }
                
                .scr-actions-right { display: flex; gap: 8px; align-items: center; }
                .scr-reveal-btn {
                    width: 34px; height: 34px; border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.1); background: none;
                    color: var(--text-dim); display: flex; align-items: center; justify-content: center;
                }
                .scr-reveal-btn.ready { border-color: var(--primary); color: var(--primary); background: rgba(168,85,247,0.1); }
                .scr-opt-btn { background: none; border: none; color: white; padding: 6px; }
                
                .scr-dropdown {
                    position: absolute; top: 100%; right: 0; width: 160px;
                    background: #1e1e1e; border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px; overflow: hidden; margin-top: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                }
                .scr-dropdown button {
                    width: 100%; text-align: left; padding: 12px; background: none; border: none;
                    color: white; display: flex; gap: 10px; align-items: center; font-size: 0.9rem;
                }
                .scr-dropdown button:active { background: rgba(255,255,255,0.05); }
                .scr-dropdown button.danger { color: #ef4444; border-top: 1px solid rgba(255,255,255,0.05); }

                /* Progress */
                .scr-progress { padding: 6px 16px; background: rgba(0,0,0,0.2); display: flex; flex-direction: column; gap: 3px; }
                .scr-track { width: 100%; height: 3px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; }
                .scr-fill { height: 100%; background: linear-gradient(to right, var(--primary), #FF4081); }
                .scr-progress span { font-size: 0.65rem; color: var(--text-dim); text-align: center; }

                /* Messages */
                .scr-messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 4px; }
                .scr-sys-msg {
                    align-self: center; display: flex; align-items: center; gap: 5px;
                    padding: 6px 12px; background: rgba(255,255,255,0.03); border-radius: 20px;
                    color: var(--text-dim); font-size: 0.72rem; margin: 10px 0;
                }
                .scr-ice-breaker-hint {
                    text-align: center; margin: 20px 0; padding: 20px;
                    background: rgba(var(--primary-rgb), 0.05); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1);
                }
                .scr-ice-breaker-hint p { font-size: 0.85rem; color: var(--text-dim); margin-bottom: 10px; }
                .scr-ice-breaker-hint button {
                    background: var(--primary); color: white; border: none;
                    padding: 6px 16px; border-radius: 20px; font-size: 0.8rem;
                }
                
                .scr-row { display: flex; align-items: flex-end; gap: 8px; margin-bottom: 4px; }
                .scr-row.mine { justify-content: flex-end; }
                .scr-mini-avatar { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
                .scr-mini-avatar img { width: 100%; height: 100%; object-fit: cover; }
                
                .scr-bubble-group { display: flex; flex-direction: column; max-width: 75%; }
                .scr-bubble { padding: 10px 14px; border-radius: 18px; position: relative; }
                .scr-bubble.me { background: var(--primary); border-bottom-right-radius: 2px; color: white; }
                .scr-bubble.them { background: rgba(255,255,255,0.08); border-bottom-left-radius: 2px; color: var(--text-main); }
                .scr-bubble p { margin: 0; font-size: 0.95rem; line-height: 1.4; word-wrap: break-word; }
                
                .scr-time {
                    font-size: 0.6rem; color: rgba(255,255,255,0.3); margin-top: 2px;
                    display: flex; align-items: center; gap: 4px;
                }
                .scr-time.me { align-self: flex-end; }
                
                .scr-bubble.typing { display: flex; gap: 4px; padding: 14px 16px; align-items: center; }
                .dot {
                    width: 6px; height: 6px; background: rgba(255,255,255,0.4);
                    border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both;
                }
                .dot:nth-child(1) { animation-delay: -0.32s; }
                .dot:nth-child(2) { animation-delay: -0.16s; }
                
                /* Ice Breakers Overlay */
                .ice-breakers-container {
                    position: absolute; bottom: 80px; left: 10px; right: 10px;
                    background: rgba(30,30,30,0.95); backdrop-filter: blur(10px);
                    border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);
                    padding: 12px; box-shadow: 0 -10px 40px rgba(0,0,0,0.5); z-index: 20;
                }
                .ice-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.85rem; color: var(--text-dim); }
                .ice-header button { background: none; border: none; color: #ef4444; font-size: 0.8rem; }
                .ice-list { display: flex; flex-wrap: wrap; gap: 8px; max-height: 200px; overflow-y: auto; }
                .ice-list button {
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);
                    padding: 8px 12px; border-radius: 12px; color: white; font-size: 0.85rem;
                    text-align: left; transition: all 0.2s;
                }
                .ice-list button:active { background: var(--primary); border-color: var(--primary); }

                /* Input */
                .scr-input-area {
                    padding: 8px 10px; padding-bottom: calc(8px + env(safe-area-inset-bottom));
                    background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
                    display: flex; gap: 8px; align-items: flex-end;
                }
                .scr-tools { display: flex; gap: 4px; margin-bottom: 6px; }
                .tool-icon {
                    width: 36px; height: 36px; border-radius: 50%; border: none;
                    background: none; color: var(--text-dim); display: flex; align-items: center; justify-content: center;
                }
                .scr-spinner {
                    width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1);
                    border-top-color: var(--primary); border-radius: 50%;
                }
                .scr-empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    text-align: center;
                    margin-top: 20px;
                }
                .scr-empty-icon {
                    width: 80px;
                    height: 80px;
                    background: rgba(168, 85, 247, 0.1);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                    border: 1px solid rgba(168, 85, 247, 0.2);
                }
                .scr-empty-state h3 { font-size: 1.2rem; margin-bottom: 8px; color: white; }
                .scr-empty-state p { font-size: 0.9rem; color: var(--text-dim); max-width: 200px; line-height: 1.5; margin-bottom: 20px; }
                .scr-ice-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 50px;
                    color: white;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .scr-ice-btn:hover { background: rgba(255,255,255,0.1); }
                
                .scr-input {
                    flex: 1; display: flex; align-items: center; gap: 8px;
                    padding: 8px 8px 8px 16px; border-radius: 24px;
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.05);
                }
                .scr-input input {
                    flex: 1; background: transparent; border: none; color: white;
                    font-size: 0.95rem; outline: none; padding: 0;
                }
                .send-btn {
                    width: 36px; height: 36px; border-radius: 50%;
                    background: var(--primary); color: white; border: none;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 10px var(--primary-glow);
                }
                .mic-btn {
                    width: 36px; height: 36px; border-radius: 50%;
                    background: rgba(255,255,255,0.1); color: white; border: none;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s;
                    user-select: none;
                }
                .mic-btn.recording {
                    background: #ef4444;
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);
                    transform: scale(1.1);
                }
                .msg-audio-wrapper {
                    padding: 4px;
                    border-radius: 20px;
                    background: rgba(255,255,255,0.05);
                }
                .msg-audio-wrapper audio {
                    filter: invert(0.9) hue-rotate(180deg);
                    outline: none;
                }
                
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }
                @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
            `}</style>
        </div>
    );
};

export default SoulChatRoom;

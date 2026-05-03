import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, MessageCircle, Gamepad2, Moon, Globe, Lock, Users, Sparkles, Map, Palette } from 'lucide-react';

const CATEGORIES = [
    { id: 'music', label: 'Music', icon: <Music size={18} />, color: '#a855f7' },
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={18} />, color: '#3b82f6' },
    { id: 'gaming', label: 'Gaming', icon: <Gamepad2 size={18} />, color: '#10b981' },
    { id: 'latenight', label: 'Late Night', icon: <Moon size={18} />, color: '#f59e0b' },
];

const THEME_COLORS = [
    { id: 'purple', label: 'Purple Night', primary: '#a855f7', secondary: '#7c3aed', bg: 'rgba(168,85,247,0.1)' },
    { id: 'pink', label: 'Pink Dream', primary: '#ec4899', secondary: '#db2777', bg: 'rgba(236,72,153,0.1)' },
    { id: 'blue', label: 'Ocean Blue', primary: '#3b82f6', secondary: '#2563eb', bg: 'rgba(59,130,246,0.1)' },
    { id: 'green', label: 'Forest Glow', primary: '#10b981', secondary: '#059669', bg: 'rgba(16,185,129,0.1)' },
    { id: 'red', label: 'Fire Red', primary: '#ef4444', secondary: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
    { id: 'amber', label: 'Golden Hour', primary: '#f59e0b', secondary: '#d97706', bg: 'rgba(245,158,11,0.1)' },
];

const MAP_SIZES = [
    { id: 'small', label: 'เล็ก (ใกล้ชิด)', width: 200, height: 200 },
    { id: 'medium', label: 'กลาง', width: 400, height: 300 },
    { id: 'large', label: 'ใหญ่ (สำรวจ)', width: 800, height: 300 },
];

const ICEBREAKERS = [
    "ถ้าย้อนเวลาได้ จะไปอดีตหรืออนาคต?",
    "เพลงที่ฟังซ้ำบ่อยที่สุดตอนนี้คืออะไร?",
    "สิ่งที่ทำให้ยิ้มได้ง่ายที่สุดคืออะไร?",
    "ถ้าเลือกได้ 1 พลังวิเศษ จะเลือกอะไร?",
    "อาหารมื้อสุดท้ายในชีวิต จะเลือกกินอะไร?",
    "คนแบบไหนที่คุณอยากนั่งคุยด้วยนานๆ?",
];

const CreatePartyRoom = ({ isOpen, onClose, onCreate }) => {
    const [roomName, setRoomName] = useState('');
    const [category, setCategory] = useState('music');
    const [maxParticipants, setMaxParticipants] = useState(20);
    const [isPrivate, setIsPrivate] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [icebreaker, setIcebreaker] = useState(ICEBREAKERS[0]);
    const [customIcebreaker, setCustomIcebreaker] = useState('');
    const [mapSize, setMapSize] = useState('medium');
    const [themeColor, setThemeColor] = useState('purple');
    const [autoClose, setAutoClose] = useState(0); // 0 = no auto close
    const [step, setStep] = useState(1); // Multi-step form

    const generateInviteCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        setInviteCode(code);
    };

    const handleCreate = () => {
        const theme = THEME_COLORS.find(t => t.id === themeColor);
        const mapConfig = MAP_SIZES.find(m => m.id === mapSize);

        const roomConfig = {
            id: `room-${Date.now()}`,
            name: roomName || 'Untitled Party',
            category,
            maxParticipants,
            isPrivate,
            inviteCode: isPrivate ? inviteCode : null,
            icebreaker: customIcebreaker || icebreaker,
            mapSize: mapConfig,
            theme,
            autoClose,
            createdAt: new Date().toISOString(),
            hostId: null, // Will be set by the parent
        };

        onCreate(roomConfig);
        // Reset form
        setStep(1);
        setRoomName('');
        setCategory('music');
        setMaxParticipants(20);
        setIsPrivate(false);
        setInviteCode('');
        setIcebreaker(ICEBREAKERS[0]);
        setCustomIcebreaker('');
        setMapSize('medium');
        setThemeColor('purple');
        setAutoClose(0);
    };

    const selectedTheme = THEME_COLORS.find(t => t.id === themeColor);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="create-room-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="create-room-modal"
                    initial={{ scale: 0.9, y: 40 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 40 }}
                    style={{ borderColor: selectedTheme?.primary + '40' }}
                >
                    {/* Header */}
                    <div className="modal-header">
                        <div className="header-info">
                            <Sparkles size={20} color={selectedTheme?.primary} />
                            <h2>สร้างห้องปาร์ตี้</h2>
                        </div>
                        <div className="step-indicator">
                            <span className={step >= 1 ? 'active' : ''}>1</span>
                            <span className={step >= 2 ? 'active' : ''}>2</span>
                            <span className={step >= 3 ? 'active' : ''}>3</span>
                        </div>
                        <button className="close-btn" onClick={onClose}><X size={20} /></button>
                    </div>

                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <motion.div className="form-step" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                            <div className="form-group">
                                <label>ชื่อห้อง</label>
                                <input
                                    type="text"
                                    placeholder="เช่น Midnight Lo-Fi Chill..."
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    maxLength={40}
                                />
                                <span className="char-count">{roomName.length}/40</span>
                            </div>

                            <div className="form-group">
                                <label>ประเภทห้อง</label>
                                <div className="category-grid">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            className={`category-btn ${category === cat.id ? 'selected' : ''}`}
                                            onClick={() => setCategory(cat.id)}
                                            style={{
                                                borderColor: category === cat.id ? cat.color : 'rgba(255,255,255,0.1)',
                                                background: category === cat.id ? cat.color + '20' : 'transparent'
                                            }}
                                        >
                                            {cat.icon}
                                            <span>{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>จำนวนคนสูงสุด: <b>{maxParticipants}</b> คน</label>
                                <input
                                    type="range"
                                    min={2}
                                    max={50}
                                    value={maxParticipants}
                                    onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                                    className="styled-slider"
                                    style={{ accentColor: selectedTheme?.primary }}
                                />
                                <div className="slider-labels">
                                    <span>2</span><span>10</span><span>20</span><span>50</span>
                                </div>
                            </div>

                            <button className="next-btn" onClick={() => setStep(2)} style={{ background: `linear-gradient(135deg, ${selectedTheme?.primary}, ${selectedTheme?.secondary})` }}>
                                ถัดไป →
                            </button>
                        </motion.div>
                    )}

                    {/* Step 2: Privacy & Icebreaker */}
                    {step === 2 && (
                        <motion.div className="form-step" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                            <div className="form-group">
                                <label>โหมดความเป็นส่วนตัว</label>
                                <div className="privacy-toggle">
                                    <button
                                        className={`toggle-btn ${!isPrivate ? 'selected' : ''}`}
                                        onClick={() => setIsPrivate(false)}
                                    >
                                        <Globe size={18} />
                                        <div>
                                            <span>Public</span>
                                            <small>ใครก็เข้าได้</small>
                                        </div>
                                    </button>
                                    <button
                                        className={`toggle-btn ${isPrivate ? 'selected' : ''}`}
                                        onClick={() => { setIsPrivate(true); if (!inviteCode) generateInviteCode(); }}
                                    >
                                        <Lock size={18} />
                                        <div>
                                            <span>Private</span>
                                            <small>ต้องมีรหัสเชิญ</small>
                                        </div>
                                    </button>
                                </div>
                                {isPrivate && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="invite-code-area">
                                        <div className="code-display">
                                            <span className="the-code">{inviteCode}</span>
                                            <button onClick={generateInviteCode} className="refresh-btn">🔄</button>
                                        </div>
                                        <small>แชร์รหัสนี้ให้เพื่อนเพื่อเข้าห้อง</small>
                                    </motion.div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>คำถามเปิดวง (Icebreaker)</label>
                                <div className="icebreaker-list">
                                    {ICEBREAKERS.map((q, i) => (
                                        <button
                                            key={i}
                                            className={`ice-btn ${icebreaker === q && !customIcebreaker ? 'selected' : ''}`}
                                            onClick={() => { setIcebreaker(q); setCustomIcebreaker(''); }}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    placeholder="หรือเขียนคำถามเอง..."
                                    value={customIcebreaker}
                                    onChange={(e) => setCustomIcebreaker(e.target.value)}
                                    maxLength={80}
                                />
                            </div>

                            <div className="step-nav">
                                <button className="back-btn" onClick={() => setStep(1)}>← ย้อนกลับ</button>
                                <button className="next-btn" onClick={() => setStep(3)} style={{ background: `linear-gradient(135deg, ${selectedTheme?.primary}, ${selectedTheme?.secondary})` }}>
                                    ถัดไป →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Map & Theme */}
                    {step === 3 && (
                        <motion.div className="form-step" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                            <div className="form-group">
                                <label><Map size={16} /> ขนาดแมพ</label>
                                <div className="map-size-grid">
                                    {MAP_SIZES.map(m => (
                                        <button
                                            key={m.id}
                                            className={`map-btn ${mapSize === m.id ? 'selected' : ''}`}
                                            onClick={() => setMapSize(m.id)}
                                            style={{ borderColor: mapSize === m.id ? selectedTheme?.primary : 'rgba(255,255,255,0.1)' }}
                                        >
                                            <div className="map-preview" style={{
                                                width: m.id === 'small' ? 40 : m.id === 'medium' ? 60 : 90,
                                                height: m.id === 'small' ? 40 : m.id === 'medium' ? 45 : 35,
                                                background: mapSize === m.id ? selectedTheme?.bg : 'rgba(255,255,255,0.05)',
                                                borderRadius: 6,
                                                border: `1px dashed ${mapSize === m.id ? selectedTheme?.primary + '60' : 'rgba(255,255,255,0.1)'}`,
                                            }} />
                                            <span>{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label><Palette size={16} /> สีธีมห้อง</label>
                                <div className="theme-grid">
                                    {THEME_COLORS.map(t => (
                                        <button
                                            key={t.id}
                                            className={`theme-btn ${themeColor === t.id ? 'selected' : ''}`}
                                            onClick={() => setThemeColor(t.id)}
                                        >
                                            <div className="color-swatch" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }} />
                                            <span>{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>⏰ ปิดอัตโนมัติ</label>
                                <div className="auto-close-options">
                                    {[0, 30, 60, 120].map(mins => (
                                        <button
                                            key={mins}
                                            className={`time-btn ${autoClose === mins ? 'selected' : ''}`}
                                            onClick={() => setAutoClose(mins)}
                                            style={{ borderColor: autoClose === mins ? selectedTheme?.primary : 'rgba(255,255,255,0.1)' }}
                                        >
                                            {mins === 0 ? 'ไม่ปิด' : `${mins} นาที`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preview Card */}
                            <div className="room-preview" style={{ borderColor: selectedTheme?.primary + '40', background: selectedTheme?.bg }}>
                                <h4 style={{ color: selectedTheme?.primary }}>{roomName || 'Untitled Party'}</h4>
                                <div className="preview-tags">
                                    <span>{CATEGORIES.find(c => c.id === category)?.label}</span>
                                    <span>{isPrivate ? '🔒 Private' : '🌍 Public'}</span>
                                    <span><Users size={12} /> {maxParticipants}</span>
                                </div>
                            </div>

                            <div className="step-nav">
                                <button className="back-btn" onClick={() => setStep(2)}>← ย้อนกลับ</button>
                                <button
                                    className="create-btn"
                                    onClick={handleCreate}
                                    style={{ background: `linear-gradient(135deg, ${selectedTheme?.primary}, ${selectedTheme?.secondary})` }}
                                >
                                    🎉 เปิดปาร์ตี้!
                                </button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>

                <style>{`
                    .create-room-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(5, 2, 10, 0.85);
                        backdrop-filter: blur(12px);
                        z-index: 300;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .create-room-modal {
                        width: 100%;
                        max-width: 480px;
                        max-height: 90vh;
                        overflow-y: auto;
                        background: rgba(20, 12, 30, 0.95);
                        border: 1px solid rgba(168,85,247,0.3);
                        border-radius: 28px;
                        padding: 28px;
                        color: #fff;
                    }
                    .create-room-modal::-webkit-scrollbar { width: 4px; }
                    .create-room-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }

                    .modal-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 24px;
                    }
                    .header-info {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .header-info h2 {
                        font-size: 1.2rem;
                        margin: 0;
                        font-weight: 700;
                    }
                    .step-indicator {
                        display: flex;
                        gap: 6px;
                    }
                    .step-indicator span {
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.75rem;
                        font-weight: 700;
                        background: rgba(255,255,255,0.08);
                        color: rgba(255,255,255,0.3);
                        transition: all 0.3s;
                    }
                    .step-indicator span.active {
                        background: rgba(168,85,247,0.3);
                        color: #a855f7;
                        border: 1px solid rgba(168,85,247,0.5);
                    }
                    .close-btn {
                        background: rgba(255,255,255,0.08);
                        border: none;
                        color: #fff;
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: background 0.2s;
                    }
                    .close-btn:hover { background: rgba(255,255,255,0.15); }

                    .form-step {
                        display: flex;
                        flex-direction: column;
                        gap: 22px;
                    }
                    .form-group {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    .form-group label {
                        font-size: 0.85rem;
                        font-weight: 600;
                        color: rgba(255,255,255,0.7);
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .form-group input[type="text"] {
                        background: rgba(255,255,255,0.06);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 14px;
                        padding: 14px 16px;
                        color: #fff;
                        font-size: 0.95rem;
                        outline: none;
                        transition: border 0.2s;
                    }
                    .form-group input[type="text"]:focus {
                        border-color: rgba(168,85,247,0.5);
                    }
                    .char-count {
                        font-size: 0.7rem;
                        color: rgba(255,255,255,0.3);
                        text-align: right;
                    }

                    .category-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                    }
                    .category-btn {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 12px 14px;
                        border-radius: 14px;
                        border: 1px solid rgba(255,255,255,0.1);
                        background: transparent;
                        color: rgba(255,255,255,0.7);
                        cursor: pointer;
                        transition: all 0.2s;
                        font-size: 0.85rem;
                    }
                    .category-btn.selected { color: #fff; font-weight: 600; }
                    .category-btn:hover { background: rgba(255,255,255,0.05); }

                    .styled-slider {
                        width: 100%;
                        height: 6px;
                        appearance: none;
                        background: rgba(255,255,255,0.1);
                        border-radius: 10px;
                        outline: none;
                    }
                    .styled-slider::-webkit-slider-thumb {
                        appearance: none;
                        width: 22px;
                        height: 22px;
                        background: #a855f7;
                        border-radius: 50%;
                        cursor: pointer;
                        box-shadow: 0 0 10px rgba(168,85,247,0.5);
                    }
                    .slider-labels {
                        display: flex;
                        justify-content: space-between;
                        font-size: 0.7rem;
                        color: rgba(255,255,255,0.3);
                    }

                    .privacy-toggle {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                    }
                    .toggle-btn {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 14px;
                        border-radius: 16px;
                        border: 1px solid rgba(255,255,255,0.1);
                        background: transparent;
                        color: rgba(255,255,255,0.6);
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .toggle-btn.selected {
                        border-color: rgba(168,85,247,0.5);
                        background: rgba(168,85,247,0.1);
                        color: #fff;
                    }
                    .toggle-btn div { display: flex; flex-direction: column; align-items: flex-start; }
                    .toggle-btn span { font-size: 0.9rem; font-weight: 600; }
                    .toggle-btn small { font-size: 0.7rem; color: rgba(255,255,255,0.4); }

                    .invite-code-area {
                        text-align: center;
                        overflow: hidden;
                    }
                    .code-display {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 12px;
                        margin: 8px 0;
                    }
                    .the-code {
                        font-size: 2rem;
                        font-weight: 800;
                        letter-spacing: 8px;
                        color: #a855f7;
                        font-family: monospace;
                    }
                    .refresh-btn {
                        background: none;
                        border: none;
                        font-size: 1.2rem;
                        cursor: pointer;
                    }
                    .invite-code-area small {
                        color: rgba(255,255,255,0.4);
                        font-size: 0.75rem;
                    }

                    .icebreaker-list {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                        max-height: 160px;
                        overflow-y: auto;
                    }
                    .icebreaker-list::-webkit-scrollbar { width: 3px; }
                    .icebreaker-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
                    .ice-btn {
                        text-align: left;
                        padding: 10px 14px;
                        border-radius: 12px;
                        border: 1px solid rgba(255,255,255,0.08);
                        background: transparent;
                        color: rgba(255,255,255,0.6);
                        cursor: pointer;
                        font-size: 0.82rem;
                        transition: all 0.2s;
                    }
                    .ice-btn.selected {
                        border-color: rgba(168,85,247,0.4);
                        background: rgba(168,85,247,0.1);
                        color: #fff;
                    }
                    .ice-btn:hover { background: rgba(255,255,255,0.05); }

                    .map-size-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        gap: 10px;
                    }
                    .map-btn {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 8px;
                        padding: 14px 8px;
                        border-radius: 16px;
                        border: 1px solid rgba(255,255,255,0.1);
                        background: transparent;
                        color: rgba(255,255,255,0.6);
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .map-btn.selected { color: #fff; background: rgba(255,255,255,0.05); }
                    .map-btn span { font-size: 0.75rem; }

                    .theme-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        gap: 8px;
                    }
                    .theme-btn {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 6px;
                        padding: 10px;
                        border-radius: 14px;
                        border: 2px solid transparent;
                        background: transparent;
                        color: rgba(255,255,255,0.6);
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .theme-btn.selected {
                        border-color: rgba(255,255,255,0.3);
                        background: rgba(255,255,255,0.05);
                        color: #fff;
                    }
                    .color-swatch {
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    }
                    .theme-btn span { font-size: 0.7rem; }

                    .auto-close-options {
                        display: flex;
                        gap: 8px;
                    }
                    .time-btn {
                        flex: 1;
                        padding: 10px;
                        border-radius: 12px;
                        border: 1px solid rgba(255,255,255,0.1);
                        background: transparent;
                        color: rgba(255,255,255,0.6);
                        cursor: pointer;
                        font-size: 0.8rem;
                        transition: all 0.2s;
                    }
                    .time-btn.selected {
                        background: rgba(168,85,247,0.15);
                        color: #fff;
                    }

                    .room-preview {
                        padding: 16px;
                        border-radius: 16px;
                        border: 1px solid;
                        text-align: center;
                    }
                    .room-preview h4 { margin: 0 0 8px; font-size: 1rem; }
                    .preview-tags {
                        display: flex;
                        gap: 8px;
                        justify-content: center;
                        flex-wrap: wrap;
                    }
                    .preview-tags span {
                        background: rgba(255,255,255,0.08);
                        padding: 4px 10px;
                        border-radius: 10px;
                        font-size: 0.75rem;
                        color: rgba(255,255,255,0.6);
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }

                    .step-nav {
                        display: flex;
                        gap: 12px;
                    }
                    .back-btn {
                        flex: 1;
                        padding: 14px;
                        border-radius: 16px;
                        border: 1px solid rgba(255,255,255,0.15);
                        background: transparent;
                        color: rgba(255,255,255,0.7);
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.9rem;
                    }
                    .next-btn, .create-btn {
                        flex: 2;
                        padding: 14px;
                        border-radius: 16px;
                        border: none;
                        color: #fff;
                        cursor: pointer;
                        font-weight: 700;
                        font-size: 1rem;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    .next-btn:hover, .create-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 25px rgba(0,0,0,0.4);
                    }
                `}</style>
            </motion.div>
        </AnimatePresence>
    );
};

export default CreatePartyRoom;

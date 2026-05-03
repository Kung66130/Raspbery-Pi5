import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Users, Lock, Globe, Music, MessageCircle, Gamepad2, Moon, ChevronLeft, Crown, Sparkles, Check } from 'lucide-react';
import CreatePartyRoom from './CreatePartyRoom';
import SoulParty from './SoulParty';

const CATEGORY_META = {
    music: { icon: <Music size={16} />, color: '#a855f7' },
    chat: { icon: <MessageCircle size={16} />, color: '#3b82f6' },
    gaming: { icon: <Gamepad2 size={16} />, color: '#10b981' },
    latenight: { icon: <Moon size={16} />, color: '#f59e0b' },
};

// Initial rooms (currently empty, will be populated by active sessions)
const MOCK_ROOMS = [];

const SoulPartyLobby = ({ user, onBack }) => {
    const [rooms, setRooms] = useState(MOCK_ROOMS);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [joinCode, setJoinCode] = useState('');
    const [showJoinPrivate, setShowJoinPrivate] = useState(null);
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem('hasSeenSoulPartyTutorial');
        if (!hasSeenTutorial) {
            setShowTutorial(true);
        }
    }, []);

    const handleCloseTutorial = () => {
        localStorage.setItem('hasSeenSoulPartyTutorial', 'true');
        setShowTutorial(false);
    };

    const filteredRooms = rooms.filter(room => {
        const matchSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCategory = filterCategory === 'all' || room.category === filterCategory;
        return matchSearch && matchCategory;
    });

    const handleCreateRoom = (roomConfig) => {
        const newRoom = {
            ...roomConfig,
            currentCount: 1,
            hostName: user?.name || 'You',
            hostId: user?.id,
        };
        setRooms(prev => [newRoom, ...prev]);
        setShowCreateModal(false);
        setSelectedRoom(newRoom); // Auto-enter your new room
    };

    const handleJoinRoom = (room) => {
        if (room.isPrivate) {
            setShowJoinPrivate(room);
        } else {
            setSelectedRoom(room);
        }
    };

    const handlePrivateJoin = () => {
        if (joinCode === showJoinPrivate?.inviteCode || !showJoinPrivate?.inviteCode) {
            setSelectedRoom(showJoinPrivate);
            setShowJoinPrivate(null);
            setJoinCode('');
        }
    };

    if (selectedRoom) {
        return (
            <SoulParty
                user={user}
                onExit={() => setSelectedRoom(null)}
                roomConfig={selectedRoom}
            />
        );
    }

    return (
        <div className="lobby-container">
            {/* Header */}
            <div className="lobby-header">
                <button className="back-arrow" onClick={onBack}><ChevronLeft size={24} /></button>
                <h1>Soul Party</h1>
                <div className="online-badge">
                    <span className="pulse-dot"></span>
                    <span>{rooms.reduce((sum, r) => sum + r.currentCount, 0)} Online</span>
                </div>
            </div>

            {/* Search */}
            <div className="search-bar">
                <Search size={18} />
                <input
                    type="text"
                    placeholder="ค้นหาห้อง..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Category Filter */}
            <div className="category-filter">
                <button
                    className={`filter-btn ${filterCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterCategory('all')}
                >
                    ทั้งหมด
                </button>
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <button
                        key={key}
                        className={`filter-btn ${filterCategory === key ? 'active' : ''}`}
                        onClick={() => setFilterCategory(key)}
                        style={{ color: filterCategory === key ? meta.color : undefined }}
                    >
                        {meta.icon}
                        <span>{key === 'music' ? 'Music' : key === 'chat' ? 'Chat' : key === 'gaming' ? 'Gaming' : 'Late Night'}</span>
                    </button>
                ))}
            </div>

            {/* Room List */}
            <div className="room-list">
                <AnimatePresence>
                    {filteredRooms.map((room, index) => {
                        const catMeta = CATEGORY_META[room.category] || CATEGORY_META.chat;
                        const isFull = room.currentCount >= room.maxParticipants;

                        return (
                            <motion.div
                                key={room.id}
                                className={`room-card ${isFull ? 'full' : ''}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => !isFull && handleJoinRoom(room)}
                                style={{ borderColor: room.theme?.primary + '30' }}
                            >
                                <div className="room-card-header">
                                    <div className="room-title-row">
                                        <h3>{room.name}</h3>
                                        {room.isPrivate && <Lock size={14} color="#f59e0b" />}
                                    </div>
                                    <div className="room-meta">
                                        <span className="tag" style={{ color: catMeta.color, borderColor: catMeta.color + '40' }}>
                                            {catMeta.icon} {room.category}
                                        </span>
                                        <span className="member-count" style={{ color: isFull ? '#ef4444' : '#10b981' }}>
                                            <Users size={12} />
                                            {room.currentCount}/{room.maxParticipants}
                                        </span>
                                    </div>
                                </div>

                                <div className="room-card-body">
                                    <p className="icebreaker-text">💬 "{room.icebreaker}"</p>
                                    <div className="host-info">
                                        <Crown size={12} color="#fbbf24" />
                                        <span>{room.hostName}</span>
                                    </div>
                                </div>

                                <div
                                    className="room-accent"
                                    style={{ background: `linear-gradient(90deg, ${room.theme?.primary}20, transparent)` }}
                                />

                                {isFull && <div className="full-overlay">เต็มแล้ว</div>}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filteredRooms.length === 0 && (
                    <div className="empty-state">
                        <span>🔍</span>
                        <p>ไม่พบห้องที่ค้นหา</p>
                        <small>ลองสร้างห้องใหม่ดูสิ!</small>
                    </div>
                )}
            </div>

            {/* FAB Create Button */}
            <motion.button
                className="fab-create"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
            >
                <Plus size={28} />
            </motion.button>

            {/* Create Room Modal */}
            <CreatePartyRoom
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateRoom}
            />

            {/* Private Room Join Modal */}
            <AnimatePresence>
                {showJoinPrivate && (
                    <motion.div
                        className="private-join-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="private-join-modal"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                        >
                            <Lock size={32} color="#f59e0b" />
                            <h3>ห้องส่วนตัว</h3>
                            <p>กรุณาใส่รหัสเชิญเพื่อเข้าห้อง <b>{showJoinPrivate.name}</b></p>
                            <input
                                type="text"
                                placeholder="รหัส 6 หลัก"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="code-input"
                            />
                            <div className="join-actions">
                                <button onClick={() => { setShowJoinPrivate(null); setJoinCode(''); }}>ยกเลิก</button>
                                <button className="join-btn" onClick={handlePrivateJoin}>เข้าห้อง</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tutorial Modal */}
            <AnimatePresence>
                {showTutorial && (
                    <motion.div
                        className="tutorial-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="tutorial-modal glass-panel"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        >
                            <div className="tutorial-header">
                                <div className="tutorial-icon-wrapper">
                                    <Sparkles size={32} color="#facc15" />
                                </div>
                                <h2>ยินดีต้อนรับสู่ Soul Party! ✨</h2>
                                <p>พื้นที่สำหรับปาร์ตี้และพูดคุยแบบสดๆ กับเพื่อนๆ ที่มีความสนใจเหมือนกับคุณ</p>
                            </div>

                            <div className="tutorial-steps">
                                <div className="tutorial-step">
                                    <div className="step-icon"><Search size={20} color="#a855f7" /></div>
                                    <div className="step-content">
                                        <h4>ค้นหาห้องที่ใช่</h4>
                                        <p>เลือกเข้าร่วมห้องปาร์ตี้ตามหมวดหมู่ที่คุณสนใจ เช่น ดนตรี, เกม, หรือพูดคุย</p>
                                    </div>
                                </div>
                                <div className="tutorial-step">
                                    <div className="step-icon"><Plus size={20} color="#ec4899" /></div>
                                    <div className="step-content">
                                        <h4>สร้างห้องของคุณเอง</h4>
                                        <p>รับบทเป็นโฮสต์! เปิดห้องส่วนตัวหรือห้องสาธารณะเพื่อชวนเพื่อนๆ มาร่วมสนุก</p>
                                    </div>
                                </div>
                                <div className="tutorial-step">
                                    <div className="step-icon"><MessageCircle size={20} color="#10b981" /></div>
                                    <div className="step-content">
                                        <h4>สนุกไปกับการแชท</h4>
                                        <p>พูดคุย ส่งสติกเกอร์ หรือทำกิจกรรมสนุกๆ ไปพร้อมๆ กับคนในห้อง</p>
                                    </div>
                                </div>
                            </div>

                            <button className="btn-primary tutorial-done-btn" onClick={handleCloseTutorial}>
                                <Check size={18} /> เริ่มต้นใช้งานเลย
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .lobby-container {
                    position: fixed;
                    inset: 0;
                    background: var(--bg-dark);
                    z-index: 200;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Inter', sans-serif;
                    color: var(--text-main);
                    overflow: hidden;
                }
                .lobby-header {
                    display: flex;
                    align-items: center;
                    padding: 16px 20px;
                    gap: 12px;
                }
                .back-arrow {
                    background: rgba(255,255,255,0.08);
                    border: none;
                    color: #fff;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                .lobby-header h1 {
                    flex: 1;
                    font-size: 1.4rem;
                    font-weight: 800;
                    margin: 0;
                    background: linear-gradient(135deg, #a855f7, #ec4899);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .online-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(16,185,129,0.12);
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 0.78rem;
                    color: #10b981;
                    font-weight: 600;
                }
                .pulse-dot {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    animation: pulse-glow 2s infinite;
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.6); }
                    50% { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
                }

                .search-bar {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 0 20px 12px;
                    padding: 12px 16px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 16px;
                    color: rgba(255,255,255,0.5);
                }
                .search-bar input {
                    flex: 1;
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 0.9rem;
                    outline: none;
                }

                .category-filter {
                    display: flex;
                    gap: 8px;
                    padding: 0 20px 16px;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .category-filter::-webkit-scrollbar { display: none; }
                .filter-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 16px;
                    border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: transparent;
                    color: rgba(255,255,255,0.5);
                    cursor: pointer;
                    font-size: 0.8rem;
                    white-space: nowrap;
                    transition: all 0.2s;
                }
                .filter-btn.active {
                    background: rgba(168,85,247,0.15);
                    color: #a855f7;
                    border-color: rgba(168,85,247,0.4);
                }

                .room-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 20px 100px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .room-list::-webkit-scrollbar { width: 3px; }
                .room-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

                .room-card {
                    position: relative;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 20px;
                    padding: 18px;
                    cursor: pointer;
                    overflow: hidden;
                    transition: all 0.2s;
                }
                .room-card:hover {
                    background: rgba(255,255,255,0.07);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
                }
                .room-card.full {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .room-accent {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    border-radius: 20px 0 0 20px;
                }

                .room-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 10px;
                }
                .room-title-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .room-title-row h3 {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 700;
                }
                .room-meta {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .tag {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.72rem;
                    padding: 3px 10px;
                    border: 1px solid;
                    border-radius: 10px;
                    font-weight: 600;
                }
                .member-count {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.78rem;
                    font-weight: 700;
                }

                .room-card-body {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .icebreaker-text {
                    margin: 0;
                    font-size: 0.78rem;
                    color: rgba(255,255,255,0.4);
                    font-style: italic;
                    max-width: 70%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .host-info {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.73rem;
                    color: rgba(255,255,255,0.5);
                }

                .full-overlay {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(239,68,68,0.2);
                    color: #ef4444;
                    padding: 4px 12px;
                    border-radius: 10px;
                    font-size: 0.72rem;
                    font-weight: 700;
                }

                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 60px 20px;
                    color: rgba(255,255,255,0.3);
                }
                .empty-state span { font-size: 3rem; margin-bottom: 12px; }
                .empty-state p { margin: 0; font-size: 1rem; font-weight: 600; }
                .empty-state small { margin-top: 4px; }

                .fab-create {
                    position: fixed;
                    bottom: 30px;
                    right: 24px;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #a855f7, #ec4899);
                    border: none;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 6px 25px rgba(168,85,247,0.5);
                    z-index: 50;
                }

                .private-join-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(5,2,10,0.85);
                    backdrop-filter: blur(10px);
                    z-index: 400;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .private-join-modal {
                    background: rgba(20,12,30,0.95);
                    border: 1px solid rgba(245,158,11,0.3);
                    border-radius: 28px;
                    padding: 36px;
                    text-align: center;
                    max-width: 360px;
                    width: 90%;
                }
                .private-join-modal h3 { margin: 12px 0 4px; font-size: 1.2rem; }
                .private-join-modal p { color: rgba(255,255,255,0.5); font-size: 0.85rem; margin: 0 0 20px; }
                .code-input {
                    width: 100%;
                    text-align: center;
                    font-size: 2rem;
                    font-weight: 800;
                    letter-spacing: 10px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(245,158,11,0.3);
                    border-radius: 16px;
                    padding: 14px;
                    color: #f59e0b;
                    outline: none;
                    font-family: monospace;
                    box-sizing: border-box;
                }
                .join-actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 20px;
                }
                .join-actions button {
                    flex: 1;
                    padding: 14px;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: transparent;
                    color: rgba(255,255,255,0.7);
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.9rem;
                }
                .join-btn {
                    background: linear-gradient(135deg, #f59e0b, #d97706) !important;
                    border: none !important;
                    color: #fff !important;
                }

                .tutorial-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(5,2,10,0.85);
                    backdrop-filter: blur(12px);
                    z-index: 500;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .tutorial-modal {
                    background: rgba(20,12,30,0.95);
                    border: 1px solid rgba(168,85,247,0.3);
                    border-radius: 28px;
                    padding: 40px 30px;
                    max-width: 400px;
                    width: 100%;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05);
                }
                .tutorial-header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .tutorial-icon-wrapper {
                    width: 70px;
                    height: 70px;
                    background: rgba(250,204,21,0.1);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                    box-shadow: 0 0 20px rgba(250,204,21,0.2);
                }
                .tutorial-header h2 {
                    margin: 0 0 8px;
                    font-size: 1.5rem;
                    background: linear-gradient(135deg, #a855f7, #ec4899);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .tutorial-header p {
                    color: rgba(255,255,255,0.7);
                    font-size: 0.95rem;
                    margin: 0;
                    line-height: 1.5;
                }
                .tutorial-steps {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    margin-bottom: 35px;
                }
                .tutorial-step {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                }
                .step-icon {
                    width: 40px;
                    height: 40px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .step-content h4 {
                    margin: 0 0 4px;
                    font-size: 1.05rem;
                    color: #fff;
                }
                .step-content p {
                    margin: 0;
                    font-size: 0.85rem;
                    color: rgba(255,255,255,0.5);
                    line-height: 1.4;
                }
                .tutorial-done-btn {
                    width: 100%;
                    padding: 16px;
                    font-size: 1.05rem;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    box-shadow: 0 8px 25px rgba(168,85,247,0.4);
                }
            `}</style>
        </div>
    );
};

export default SoulPartyLobby;

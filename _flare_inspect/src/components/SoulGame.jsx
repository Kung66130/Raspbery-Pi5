import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';
import SoulProfileSetup from './SoulProfileSetup';
import SoulSwipe from './SoulSwipe';
import SoulLikedModal from './SoulLikedModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from './NotificationSystem';
import { api } from '../services/api';

const SoulGame = ({ user, onUpdateUser, onOpenSettings }) => {
    const [soulProfile, setSoulProfile] = useState(user.soulProfile || null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [showLikedModal, setShowLikedModal] = useState(false);
    const { t } = useLanguage();
    const { showNotification } = useNotification();

    useEffect(() => {
        const checkAndAutoImport = async () => {
            setIsLoadingProfile(true);
            try {
                // 1. Sync local state with prop
                if (user.soulProfile) {
                    setSoulProfile(user.soulProfile);
                    setIsLoadingProfile(false);
                    return;
                }

                // 2. Double check with server
                console.log('[Soul] Checking profile on server...');
                const profile = await api.get('/soul/profile');
                
                if (profile && profile.displayName) {
                    console.log('[Soul] Found soul profile on server.');
                    setSoulProfile(profile);
                    // Update global state if out of sync
                    if (onUpdateUser) onUpdateUser({ ...user, soulProfile: profile });
                } else {
                    // 3. Auto-import as per "ให้ดึงโปรไฟล์มาใช้เลย"
                    console.log('[Soul] No soul profile, start auto-importing...');
                    await handleAutoImport();
                }
            } catch (err) {
                console.error('[Soul] Init Error:', err);
                // Even on error, we try to auto-import once
                await handleAutoImport();
            } finally {
                setIsLoadingProfile(false);
            }
        };

        checkAndAutoImport();
    }, [user.id]); // Only re-run when user ID changes (or mount)

    const handleAutoImport = async () => {
        try {
            const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}&backgroundColor=b6e3f4,c0aede,d1d4f9&scale=80`;
            const profileToSave = {
                displayName: user.name || user.username || 'Soul User',
                bio: user.bio || 'Hello, I\'m new here!',
                age: 22,
                gender: 'other',
                imagePreview: user.image || defaultAvatar,
                interests: ['music', 'travel', 'food'],
                lookingFor: ['friends', 'anything'],
                location: 'กรุงเทพมหานคร',
                ownerId: user.id || 'anonymous',
                updatedAt: new Date().toISOString()
            };

            const savedProfile = await api.post('/soul/profile', profileToSave);
            console.log('[Soul] Auto-import Success:', savedProfile);
            setSoulProfile(savedProfile || profileToSave);
            
            // Refresh main environment
            const latestUser = await api.get('/users/profile');
            if (onUpdateUser) onUpdateUser(latestUser);
            
            showNotification(t('soul.ready') || 'ยินดีต้อนรับสู่ Soul!', 'success');
        } catch (err) {
            console.error('[Soul] Auto-import CRITICAL Error:', err);
            showNotification('Auto-import failed: ' + (err.message || 'Error'), 'error');
            // If it REALLY fails, then we allow the setup screen
        }
    };



    const handleSoulProfileComplete = async (profile) => {
        setSoulProfile(profile);
        setIsEditing(false);
        try {
            const latestUser = await api.get('/users/profile');
            if (onUpdateUser) onUpdateUser(latestUser);
        } catch (err) {
            if (onUpdateUser) onUpdateUser({ ...user, soulProfile: profile });
        }
        showNotification(t('soul.updated'), 'success');
    };

    const handleEditSoulProfile = () => {
        setIsEditing(true);
    };

    if (isLoadingProfile) {
        return (
            <div className="page-content soul-page-master" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    <Sparkles size={48} color="#a855f7" />
                </motion.div>
            </div>
        );
    }

    if (!soulProfile || isEditing) {
        return (
            <div className="page-content soul-page-master">
                <SoulProfileSetup
                    user={user}
                    onComplete={handleSoulProfileComplete}
                    initialData={soulProfile}
                />
            </div>
        );
    }

    return (
        <div className="page-content soul-page-master">
            <SoulLikedModal
                isOpen={showLikedModal}
                onClose={() => setShowLikedModal(false)}
            />
            
            {/* Redundant top bar removed to support SoulSwipe's new header */}


            <div className="soul-content-wrapper">
                <SoulSwipe user={{ ...user, soulProfile }} onMatch={(partner) => { if (onMatch) onMatch(partner); }} />
            </div>

            <style>{`
                .soul-page-master {
                    display: flex;
                    flex-direction: column;
                    padding-top: 20px;
                    min-height: 100vh;
                    background: transparent;
                }
                .soul-top-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 20px 20px;
                }
                .soul-header-info h2 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin: 0;
                    background: linear-gradient(135deg, var(--text-main), var(--primary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .soul-header-info p {
                    font-size: 0.85rem;
                    color: var(--text-dim);
                    margin: 4px 0 0;
                }
                .soul-top-actions {
                    display: flex;
                    gap: 10px;
                }
                .soul-header-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    color: var(--text-main);
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .soul-header-btn:hover {
                    background: var(--glass-border);
                    transform: translateY(-2px);
                    border-color: var(--glass-border);
                }
                .soul-header-btn.liked:hover {
                    background: rgba(236, 72, 153, 0.1);
                    border-color: rgba(236, 72, 153, 0.2);
                }
                .soul-header-btn.setup:hover {
                    background: rgba(168, 85, 247, 0.1);
                    border-color: rgba(168, 85, 247, 0.2);
                    color: #a855f7;
                }
                .soul-content-wrapper {
                    flex: 1;
                    width: 100%;
                }
            `}</style>
        </div>
    );
};

export default SoulGame;

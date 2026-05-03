import React, { useState, useEffect } from 'react';
import {
    Camera,
    Heart,
    Edit2,
    MessageCircle,
    ChevronRight,
    Star,
    Copy,
    RefreshCw,
    X,
    Settings as SettingsIcon,
    Grid,
    Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useNotification } from './NotificationSystem';
import { useLanguage } from '../contexts/LanguageContext';
import SoulProfileSetup from './SoulProfileSetup';
import ProfileSettings from './ProfileSettings';

const UserProfile = ({ user, onLogout, onUpdateUser, refreshTrigger, onOpenCreateModal, onOpenSettings, isViewOnly = false, activeTab, onSelectUser, onMessageClick }) => {
    const { showNotification } = useNotification();
    const { language } = useLanguage();
    const [profileUser, setProfileUser] = useState(user);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [activeProfileTab, setActiveProfileTab] = useState('moments');
    const [allFetchedPosts, setAllFetchedPosts] = useState([]);
    const [showPostsSection, setShowPostsSection] = useState(false);

    // Connections List State
    const [showConnectionsModal, setShowConnectionsModal] = useState(false);
    const [connectionsType, setConnectionsType] = useState('followers');
    const [connectionsList, setConnectionsList] = useState([]);
    const [loadingConnections, setLoadingConnections] = useState(false);

    const [referralData, setReferralData] = useState({ referralCode: '', inviteCount: 0 });
    const [referralCodeInput, setReferralCodeInput] = useState('');
    const [isApplyingCode, setIsApplyingCode] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        setProfileUser(user);
    }, [user]);

    useEffect(() => {
        if (isViewOnly && user.id) {
            fetchOtherProfile(user.id);
        } else if (activeTab === 'profile') {
            fetchMyPosts();
            fetchUserData();
            fetchReferralData();
        }
    }, [refreshTrigger, user?.id, activeTab, activeProfileTab]);

    const fetchReferralData = async () => {
        try {
            const data = await api.get('/users/referral');
            setReferralData(data);
        } catch (err) {
            console.error('Failed to fetch referral:', err);
        }
    };

    const handleApplyCode = async () => {
        if (!referralCodeInput.trim()) return;
        setIsApplyingCode(true);
        try {
            await api.post('/users/referral/apply', { code: referralCodeInput });
            showNotification(language === 'th' ? 'ใช้รหัสแนะนำสำเร็จ!' : 'Referral applied!', 'success');
            setReferralCodeInput('');
            fetchUserData();
        } catch (err) {
            showNotification(err.message || 'Failed to apply code', 'error');
        } finally {
            setIsApplyingCode(false);
        }
    };

    const fetchOtherProfile = async (userId) => {
        try {
            setLoading(true);
            const data = await api.get(`/users/${userId}`);
            setProfileUser(data.user);
            setPosts(data.posts || []);
        } catch (err) {
            console.error('Error fetching profile:', err);
            showNotification('Failed to load profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchUserData = async () => {
        try {
            const freshUser = await api.get('/users/profile');
            onUpdateUser(freshUser);
            localStorage.setItem('flare_user', JSON.stringify(freshUser));
        } catch (error) {
            console.error('Failed to fetch user stats:', error);
        }
    };

    const fetchMyPosts = async () => {
        try {
            setLoading(true);
            const allPosts = await api.get('/posts');
            setAllFetchedPosts(allPosts);
            const currentUserId = String(user?.id || user?.user_id || '');
            const myPosts = allPosts.filter(p => {
                const pUserId = String(p.userId || p.user_id || '');
                return pUserId === currentUserId && currentUserId !== '';
            });
            setPosts(myPosts);
        } catch (err) {
            console.error('Error fetching posts:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchConnections = async (type) => {
        setConnectionsType(type);
        setShowConnectionsModal(true);
        setLoadingConnections(true);
        setConnectionsList([]);
        try {
            const data = await api.get(`/users/${profileUser.id}/${type}`);
            setConnectionsList(data || []);
        } catch (err) {
            console.error('Failed to fetch connections:', err);
        } finally {
            setLoadingConnections(false);
        }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setPreviewImage(URL.createObjectURL(file));
            setSelectedFile(file);
            if (!isEditing) {
                try {
                    setIsUploadingAvatar(true);
                    const formData = new FormData();
                    formData.append('name', user.name || '');
                    formData.append('bio', user.bio || '');
                    formData.append('image', file);
                    const updatedUser = await api.put('/users/profile', formData, true);
                    onUpdateUser(updatedUser);
                    localStorage.setItem('flare_user', JSON.stringify(updatedUser));
                    showNotification('อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว ✨', 'success');
                } catch (err) {
                    showNotification('ไม่สามารถอัปเดตรูปได้: ' + err.message, 'error');
                } finally {
                    setIsUploadingAvatar(false);
                    setPreviewImage(null);
                    setSelectedFile(null);
                }
            }
        }
    };

    const getDisplayedPosts = () => {
        if (!allFetchedPosts || allFetchedPosts.length === 0) return [];
        if (isViewOnly) return posts;
        const currentUserId = String(user?.id || user?.user_id || '');
        if (activeProfileTab === 'liked') return allFetchedPosts.filter(p => p.hasLiked === true);
        if (activeProfileTab === 'saved') return allFetchedPosts.filter(p => p.hasSaved === true || p.isSaved === true);
        return allFetchedPosts.filter(p => {
            const pUserId = String(p.userId || p.user_id || '');
            return pUserId === currentUserId && currentUserId !== '';
        });
    };

    const displayedPosts = getDisplayedPosts();
    const isVip = profileUser.is_vip || (profileUser.vip_until && new Date(profileUser.vip_until) > new Date());
    const displayName = profileUser.soulProfile?.displayName || profileUser.soul_profile?.displayName || profileUser.name || 'User';
    const username = profileUser.username || (profileUser.email ? profileUser.email.split('@')[0] : profileUser.id?.slice(0, 10)) || 'flare_user';
    const bio = profileUser.soulProfile?.bio || profileUser.soul_profile?.bio || profileUser.bio;

    // Menu items removed as requested
    const menuItems = [];

    const settingsItems = [
        {
            icon: '🔔',
            iconBg: '#3b82f6',
            title: language === 'th' ? 'การแจ้งเตือน' : 'Notifications',
            subtitle: language === 'th' ? 'จัดการการแจ้งเตือนของคุณ' : 'Manage your notifications',
            action: () => onOpenSettings && onOpenSettings(),
        },
        {
            icon: '🔒',
            iconBg: '#10b981',
            title: language === 'th' ? 'ความเป็นส่วนตัว' : 'Privacy & Security',
            subtitle: language === 'th' ? 'การมองเห็นโปรไฟล์และความปลอดภัย' : 'Profile visibility & security',
            action: () => onOpenSettings && onOpenSettings(),
        },
        {
            icon: '🎨',
            iconBg: '#a855f7',
            title: language === 'th' ? 'ธีมและรูปลักษณ์' : 'Appearance',
            subtitle: language === 'th' ? 'โหมดมืด, สีธีม, ขนาดตัวอักษร' : 'Dark mode, theme color, font size',
            action: () => onOpenSettings && onOpenSettings(),
        },
        {
            icon: '🌐',
            iconBg: '#06b6d4',
            title: language === 'th' ? 'ภาษา' : 'Language',
            subtitle: language === 'th' ? 'เปลี่ยนภาษาของแอป' : 'Change app language',
            action: () => onOpenSettings && onOpenSettings(),
        },
        {
            icon: '⚙️',
            iconBg: '#6b7280',
            title: language === 'th' ? 'การตั้งค่าทั้งหมด' : 'All Settings',
            subtitle: language === 'th' ? 'ดูการตั้งค่าเพิ่มเติมทั้งหมด' : 'View all settings',
            action: () => onOpenSettings && onOpenSettings(),
        },
    ];

    return (
        <div className="page-content profile-page-v2">
            {/* === TOP HEADER === */}
            <div className="profile-top-header">
                <h2 className="header-title">{language === 'th' ? 'ฉัน' : 'Me'}</h2>
                <div style={{ display: 'flex', gap: 10 }}>
                </div>
            </div>

            {/* === PROFILE CARD === */}
            <div className="profile-card-v2">
                {/* Avatar + Info row */}
                <div className="profile-main-row">
                    <label className="profile-avatar-wrap" style={{ cursor: 'pointer' }}>
                        <img
                            src={previewImage || profileUser.image || profileUser.soulProfile?.imagePreview || profileUser.soul_profile?.imagePreview || `https://ui-avatars.com/api/?name=${displayName}&background=random`}
                            alt="Profile"
                            className="profile-avatar-v2"
                            style={{ opacity: isUploadingAvatar ? 0.5 : 1 }}
                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${displayName}&background=random`; }}
                        />
                        {isUploadingAvatar && (
                            <div className="avatar-loading-overlay">
                                <RefreshCw size={20} className="spin-icon" />
                            </div>
                        )}
                        {!isViewOnly && (
                            <input type="file" hidden onChange={handleImageChange} accept="image/*" disabled={isUploadingAvatar} />
                        )}
                    </label>

                    <div className="profile-info-v2">
                        <div className="profile-name-row">
                            <h1 className="profile-name-v2">{displayName}</h1>
                            {isVip && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="vip-badge-v2">
                                    <Star size={12} fill="gold" color="gold" />
                                    <span>VIP</span>
                                </motion.div>
                            )}
                        </div>
                        <p className="profile-handle-v2">Flare ID: {profileUser.id?.slice(0, 10)?.toUpperCase() || username}</p>
                        <div className="profile-coins-row">
                            <span className="coin-icon">💎</span>
                            <span className="coin-text">
                                {isVip
                                    ? (language === 'th' ? `VIP ถึง: ${new Date(profileUser.vip_until).toLocaleDateString('th-TH')}` : `VIP until: ${new Date(profileUser.vip_until).toLocaleDateString()}`)
                                    : (language === 'th' ? 'สมาชิกปกติ' : 'Standard Member')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* === VIP CARD === */}
            {!isViewOnly && (
                <div className={`vip-promo-card ${isVip ? 'is-vip' : ''}`}>
                    <div className="vip-promo-left">
                        <div className="vip-promo-label">{isVip ? 'VIP Member' : 'VIP'}</div>
                        {!isVip && (
                            <div className="vip-price-btn">
                                <span>{language === 'th' ? 'สิทธิพิเศษ VIP' : 'VIP Privileges'}</span>
                            </div>
                        )}
                        <p className="vip-promo-desc">
                            {isVip
                                ? (language === 'th' ? 'ขอบคุณที่สนับสนุน Flare! 🎉' : 'Thank you for supporting Flare! 🎉')
                                : (language === 'th' ? 'ปลดล็อก Like ไม่จำกัด, ย้อนกลับการปิด, และสิทธิพิเศษอีกมากมาย!' : 'Unlock unlimited likes, rewinds, and exclusive perks!')}
                        </p>
                    </div>
                    <div className="vip-promo-icon">
                        {isVip ? '👑' : '🏅'}
                    </div>
                </div>
            )}

            {/* === REFERRAL ROW === */}
            {!isViewOnly && (
                <div className="referral-compact-card">
                    <div className="ref-left">
                        <span className="ref-icon">🎟️</span>
                        <div className="ref-info">
                            <span className="ref-title">{language === 'th' ? 'รหัสชวนเพื่อน' : 'Referral Code'}</span>
                            <span className="ref-code">{referralData?.referralCode || '------'}</span>
                        </div>
                    </div>
                    <button className="ref-copy-btn" onClick={() => {
                        if (referralData?.referralCode) {
                            navigator.clipboard.writeText(referralData.referralCode);
                            showNotification(language === 'th' ? 'คัดลอกรหัสแล้ว!' : 'Code copied!', 'success');
                        }
                    }}>
                        <Copy size={14} />
                        {language === 'th' ? 'คัดลอก' : 'Copy'}
                    </button>
                </div>
            )}

            {/* === VIEW ONLY ACTIONS === */}
            {isViewOnly && (
                <div className="viewonly-actions">
                    <button
                        className={`btn-follow-v2 ${profileUser.isFollowing ? 'following' : ''}`}
                        onClick={async () => {
                            try {
                                const res = await api.post(`/users/${profileUser.id}/follow`);
                                setProfileUser(prev => ({
                                    ...prev,
                                    isFollowing: res.isFollowing,
                                    followersCount: prev.followersCount + (res.isFollowing ? 1 : -1)
                                }));
                            } catch (err) {
                                showNotification('Failed to update follow status', 'error');
                            }
                        }}
                    >
                        {profileUser.isFollowing
                            ? (language === 'th' ? 'กำลังติดตาม' : 'Following')
                            : (language === 'th' ? 'ติดตาม' : 'Follow')}
                    </button>
                    <button
                        className="btn-message-v2"
                        onClick={() => onMessageClick && onMessageClick(profileUser)}
                    >
                        <MessageCircle size={18} />
                        {language === 'th' ? 'ส่งข้อความ' : 'Message'}
                    </button>
                </div>
            )}

            {/* === VIEW ONLY POSTS === */}
            {isViewOnly && (
                <div className="viewonly-posts-section">
                    <div className="moments-grid-v2">
                        {loading ? [1, 2, 3].map(i => <div key={i} className="skeleton-post" />) :
                            posts.map(post => (
                                <div key={post.id} className="post-thumb">
                                    <img src={post.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${post.id}`} alt="post" />
                                    <div className="post-thumb-overlay"><Heart size={14} fill="white" /><span>{post.likes || 0}</span></div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}

            {/* === SERVICES SECTION === */}
            {!isViewOnly && (
                <>
                    <div className="section-label">{language === 'th' ? 'บริการอื่นๆ' : 'Services'}</div>
                    <div className="menu-list-card">
                        {menuItems.map((item, idx) => (
                            <button key={idx} className="menu-list-item" onClick={item.action}>
                                <span className="menu-icon-wrap" style={{ background: item.iconBg }}>
                                    {item.icon}
                                </span>
                                <div className="menu-item-info">
                                    <span className="menu-item-title">{item.title}</span>
                                    <span className="menu-item-sub">{item.subtitle}</span>
                                </div>
                                {item.badge && <span className="menu-badge">{item.badge}</span>}
                                <ChevronRight size={18} className="menu-chevron" />
                            </button>
                        ))}
                    </div>

                    {/* All Settings Sections Embedded */}
                    <ProfileSettings
                        user={user}
                        onUpdateUser={onUpdateUser}
                        onLogout={onLogout}
                    />
                </>
            )}

            {/* === EDIT PROFILE OVERLAY === */}
            {isEditing && (
                <div className="soul-edit-overlay">
                    <SoulProfileSetup
                        user={user}
                        initialData={user.soulProfile || user.soul_profile}
                        onComplete={(profile) => {
                            setIsEditing(false);
                            fetchUserData();
                        }}
                    />
                    <button className="close-edit-btn" onClick={() => setIsEditing(false)}>
                        <X size={24} />
                    </button>
                </div>
            )}

            {/* === CONNECTIONS MODAL === */}
            <AnimatePresence>
                {showConnectionsModal && (
                    <motion.div
                        className="connections-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="connections-modal glass-panel"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        >
                            <div className="modal-top">
                                <div className="pull-bar"></div>
                                <div className="modal-header">
                                    <h3>
                                        {connectionsType === 'followers'
                                            ? (language === 'th' ? 'ผู้ติดตาม' : 'Followers')
                                            : (language === 'th' ? 'กำลังติดตาม' : 'Following')}
                                    </h3>
                                    <button className="close-btn" onClick={() => setShowConnectionsModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="connections-list-content">
                                {loadingConnections ? (
                                    [1, 2, 3].map(i => (
                                        <div key={i} className="skeleton-user-item">
                                            <div className="skeleton-avatar"></div>
                                            <div className="skeleton-info">
                                                <div className="skeleton-name"></div>
                                                <div className="skeleton-bio"></div>
                                            </div>
                                        </div>
                                    ))
                                ) : connectionsList.length > 0 ? (
                                    connectionsList.map(item => (
                                        <div
                                            key={item.id}
                                            className="user-item"
                                            onClick={() => {
                                                if (onSelectUser) {
                                                    onSelectUser(item.id);
                                                    setShowConnectionsModal(false);
                                                }
                                            }}
                                        >
                                            <img src={item.image || `https://ui-avatars.com/api/?name=${item.name}&background=random`} alt={item.name} className="item-avatar" />
                                            <div className="item-info">
                                                <div className="item-name">{item.name}</div>
                                                <div className="item-username">@{item.username || item.id?.slice(0, 8)}</div>
                                            </div>
                                            <button className="btn-view-profile">{language === 'th' ? 'ดูโปรไฟล์' : 'View'}</button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-connections">
                                        <p>{language === 'th' ? 'ไม่พบรายชื่อ' : 'No users found'}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* === LOGOUT CONFIRM === */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="confirm-modal glass-panel"
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ fontSize: 48, marginBottom: 16 }}>🚪</div>
                            <h3>{language === 'th' ? 'ออกจากระบบ?' : 'Log Out?'}</h3>
                            <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginBottom: 24 }}>
                                {language === 'th' ? 'คุณต้องการออกจากระบบใช่ไหม?' : 'Are you sure you want to log out?'}
                            </p>
                            <div className="modal-actions">
                                <button className="btn-cancel" onClick={() => setShowLogoutConfirm(false)}>
                                    {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                                </button>
                                <button className="btn-danger" onClick={() => { setShowLogoutConfirm(false); onLogout(); }}>
                                    {language === 'th' ? 'ออกจากระบบ' : 'Log Out'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .profile-page-v2 {
                    padding: 0 0 100px;
                    background: var(--bg-dark);
                    color: var(--text-main);
                    min-height: 100vh;
                }

                /* ─── TOP HEADER ─── */
                .profile-top-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 52px 20px 16px;
                }
                .header-title {
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: var(--text-main);
                    margin: 0;
                }
                .header-icon-btn {
                    width: 40px; height: 40px;
                    border-radius: 14px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    color: var(--text-main);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .header-icon-btn:hover { background: rgba(255,255,255,0.12); }

                /* ─── PROFILE CARD ─── */
                .profile-card-v2 {
                    margin: 0 16px 14px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    border-radius: 20px;
                    padding: 18px;
                }
                .profile-main-row {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    margin-bottom: 18px;
                }
                .profile-avatar-wrap {
                    position: relative;
                    flex-shrink: 0;
                }
                .profile-avatar-v2 {
                    width: 72px; height: 72px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 3px solid var(--primary, #a855f7);
                    box-shadow: 0 0 0 3px rgba(168,85,247,0.2);
                }
                .avatar-loading-overlay {
                    position: absolute; inset: 0;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(0,0,0,0.5);
                    border-radius: 50%;
                }
                .avatar-cam-badge {
                    position: absolute; bottom: 0; right: 0;
                    width: 22px; height: 22px;
                    background: var(--primary, #a855f7);
                    border: 2px solid #0f0518;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    color: white; cursor: pointer;
                }
                .profile-info-v2 { flex: 1; min-width: 0; }
                .profile-name-row {
                    display: flex; align-items: center; gap: 8px;
                    margin-bottom: 4px;
                }
                .profile-name-v2 { font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0; }
                .vip-badge-v2 {
                    display: flex; align-items: center; gap: 3px;
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    color: black; padding: 2px 8px; border-radius: 20px;
                    font-size: 0.65rem; font-weight: 800;
                    box-shadow: 0 2px 8px rgba(255,215,0,0.3);
                }
                .profile-handle-v2 { font-size: 0.78rem; color: var(--text-dim); margin: 0 0 6px; }
                .profile-coins-row {
                    display: flex; align-items: center; gap: 5px;
                    background: var(--glass);
                    border-radius: 20px; padding: 4px 10px;
                    width: fit-content;
                }
                .coin-icon { font-size: 0.8rem; }
                .coin-text { font-size: 0.72rem; color: var(--text-dim); font-weight: 600; }
                .profile-edit-btn-v2 {
                    width: 36px; height: 36px; flex-shrink: 0;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    border-radius: 12px;
                    color: var(--text-dim);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: all 0.2s;
                }
                .profile-edit-btn-v2:hover { background: var(--glass-border); color: var(--text-main); }

                /* Stats */
                .profile-stats-row {
                    display: flex; align-items: center;
                    padding: 14px 0 0;
                    border-top: 1px solid var(--glass-border);
                }
                .stat-v2 {
                    flex: 1; display: flex; flex-direction: column;
                    align-items: center; gap: 3px;
                }
                .stat-val { font-size: 1.15rem; font-weight: 800; color: var(--text-main); }
                .stat-lbl { font-size: 0.7rem; color: var(--text-dim); }
                .stat-divider { width: 1px; height: 32px; background: var(--glass-border); }

                /* ─── VIP PROMO CARD ─── */
                .vip-promo-card {
                    margin: 0 16px 14px;
                    background: linear-gradient(135deg, #2b1f0f, #190f05);
                    border: 1px solid rgba(255,199,59,0.4);
                    border-radius: 18px;
                    padding: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                .vip-promo-card.is-vip {
                    background: linear-gradient(135deg, #332100, #140d00);
                    border-color: rgba(255,215,0,0.5);
                }
                .vip-promo-card::before {
                    content: '';
                    position: absolute; top: -40px; right: -20px;
                    width: 100px; height: 100px;
                    background: radial-gradient(circle, rgba(255,199,59,0.3), transparent);
                    border-radius: 50%;
                }
                .vip-promo-left { flex: 1; }
                .vip-promo-label {
                    font-size: 1.3rem; font-weight: 900;
                    color: #FFC73B;
                    font-style: italic;
                    margin-bottom: 8px;
                    letter-spacing: -0.5px;
                }
                .vip-price-btn {
                    display: inline-flex; align-items: center;
                    background: rgba(255,199,59,0.2);
                    border: 1px solid rgba(255,199,59,0.4);
                    border-radius: 20px;
                    padding: 5px 14px;
                    color: #FFC73B;
                    font-weight: 700; font-size: 0.85rem;
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .vip-price-btn:hover { background: rgba(255,199,59,0.3); }
                .vip-promo-desc { font-size: 0.72rem; color: rgba(255,255,255,0.9); line-height: 1.4; }
                .vip-promo-icon { font-size: 3rem; z-index: 1; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }

                /* ─── REFERRAL COMPACT ─── */
                .referral-compact-card {
                    margin: 0 16px 14px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    border-radius: 16px;
                    padding: 12px 16px;
                    display: flex; align-items: center; gap: 12px;
                }
                .ref-left { display: flex; align-items: center; gap: 10px; flex: 1; }
                .ref-icon { font-size: 1.4rem; }
                .ref-info { display: flex; flex-direction: column; }
                .ref-title { font-size: 0.7rem; color: var(--text-dim); }
                .ref-code { font-size: 1rem; font-weight: 800; color: var(--primary, #a855f7); letter-spacing: 2px; font-family: monospace; }
                .ref-copy-btn {
                    display: flex; align-items: center; gap: 6px;
                    padding: 8px 14px;
                    background: var(--primary);
                    border: none; border-radius: 12px;
                    color: #fff; font-size: 0.78rem; font-weight: 700;
                    cursor: pointer; transition: all 0.2s;
                }
                .ref-copy-btn:hover { filter: brightness(1.1); }

                /* ─── VIEW ONLY ACTIONS ─── */
                .viewonly-actions {
                    display: flex; gap: 12px;
                    margin: 0 16px 14px;
                }
                .btn-follow-v2 {
                    flex: 1; height: 44px;
                    background: var(--primary);
                    border: none; border-radius: 14px;
                    color: #fff; font-weight: 700; font-size: 0.9rem;
                    cursor: pointer; transition: all 0.2s;
                }
                .btn-follow-v2.following {
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    color: var(--text-main);
                }
                .btn-message-v2 {
                    flex: 1; height: 44px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    border-radius: 14px;
                    color: var(--text-main); font-weight: 700; font-size: 0.9rem;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    cursor: pointer; transition: all 0.2s;
                }

                /* ─── SECTION LABEL ─── */
                .section-label {
                    padding: 16px 20px 8px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: var(--text-dim);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                /* ─── MENU LIST ─── */
                .moments-preview-section,
                .menu-list-card {
                    margin: 0 16px 14px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    border-radius: 20px;
                    overflow: hidden;
                }
                .menu-list-item, .section-toggle-row {
                    width: 100%;
                    display: flex; align-items: center; gap: 14px;
                    padding: 14px 16px;
                    background: none;
                    border: none; border-bottom: 1px solid var(--glass-border);
                    color: var(--text-main); cursor: pointer;
                    text-align: left;
                    transition: background 0.15s;
                    -webkit-tap-highlight-color: transparent;
                }
                .menu-list-item:last-child, .section-toggle-row { border-bottom: none; }
                .menu-list-item:active, .section-toggle-row:active { background: var(--glass); }
                .menu-icon-wrap {
                    width: 40px; height: 40px; flex-shrink: 0;
                    border-radius: 14px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.1rem;
                }
                .menu-item-info { flex: 1; min-width: 0; }
                .menu-item-title { display: block; font-size: 0.9rem; font-weight: 600; color: var(--text-main); }
                .menu-item-sub { display: block; font-size: 0.73rem; color: var(--text-dim); margin-top: 2px; }
                .menu-chevron { color: var(--text-dim); flex-shrink: 0; transition: transform 0.25s; }
                .menu-chevron.rotated { transform: rotate(90deg); }
                .menu-badge {
                    background: var(--secondary); color: #fff;
                    font-size: 0.7rem; font-weight: 700;
                    padding: 2px 7px; border-radius: 20px;
                    min-width: 22px; text-align: center;
                }
                .danger-item { }
                .danger-text { color: #ff5252 !important; }

                /* ─── POSTS SECTION ─── */
                .content-tabs-v2 {
                    display: flex; gap: 0;
                    border-bottom: 1px solid var(--glass-border);
                }
                .tab-v2 {
                    flex: 1; height: 40px;
                    background: none; border: none;
                    color: var(--text-dim);
                    display: flex; align-items: center; justify-content: center; gap: 6px;
                    font-size: 0.8rem; font-weight: 600;
                    cursor: pointer; transition: all 0.2s;
                    border-bottom: 2px solid transparent;
                }
                .tab-v2.active { color: var(--primary, #a855f7); border-bottom-color: var(--primary, #a855f7); }
                .moments-grid-v2 {
                    display: grid; grid-template-columns: repeat(3, 1fr);
                    gap: 2px; padding: 2px;
                }
                .post-thumb, .skeleton-post {
                    aspect-ratio: 1;
                    border-radius: 6px;
                    overflow: hidden;
                    position: relative;
                    background: var(--glass);
                }
                .post-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .post-thumb-overlay {
                    position: absolute; inset: 0;
                    background: rgba(0,0,0,0.3);
                    display: flex; align-items: flex-end; justify-content: flex-start;
                    padding: 6px;
                    gap: 4px; opacity: 0; transition: opacity 0.2s;
                    font-size: 0.75rem; color: #fff; font-weight: 600;
                }
                .post-thumb:hover .post-thumb-overlay { opacity: 1; }
                .skeleton-post { animation: shimmer 1.5s infinite ease-in-out; }
                @keyframes shimmer {
                    0% { opacity: 0.3; } 50% { opacity: 0.6; } 100% { opacity: 0.3; }
                }
                .empty-posts-inline {
                    grid-column: span 3;
                    padding: 40px 20px;
                    display: flex; flex-direction: column;
                    align-items: center; gap: 12px;
                    color: var(--text-dim); cursor: pointer;
                    font-size: 0.85rem;
                }

                /* ─── VIEW ONLY POSTS ─── */
                .viewonly-posts-section {
                    margin: 0 16px 14px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    border-radius: 20px; overflow: hidden;
                }

                /* ─── CONNECTIONS MODAL ─── */
                .connections-modal-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(5px);
                    z-index: 1000;
                    display: flex; align-items: flex-end;
                }
                .connections-modal {
                    width: 100%; max-height: 80vh;
                    background: var(--bg-dark);
                    border-radius: 30px 30px 0 0;
                    overflow: hidden; display: flex; flex-direction: column;
                    border: 1px solid var(--glass-border); border-bottom: none;
                }
                .modal-top { padding: 10px 0 20px; }
                .pull-bar {
                    width: 40px; height: 5px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 10px; margin: 0 auto 15px;
                }
                .modal-header {
                    display: flex; align-items: center; justify-content: space-between; padding: 0 24px;
                }
                .modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-main); }
                .close-btn {
                    background: var(--glass); border: none; color: var(--text-main);
                    width: 32px; height: 32px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center; cursor: pointer;
                }
                .connections-list-content { padding: 0 20px 40px; overflow-y: auto; flex: 1; }
                .user-item {
                    display: flex; align-items: center; gap: 14px;
                    padding: 12px; border-radius: 14px;
                    cursor: pointer; transition: background 0.15s;
                }
                .user-item:hover { background: rgba(255,255,255,0.05); }
                .item-avatar { width: 46px; height: 46px; border-radius: 16px; object-fit: cover; }
                .item-info { flex: 1; }
                .item-name { font-weight: 700; font-size: 0.9rem; color: var(--text-main); }
                .item-username { font-size: 0.8rem; color: var(--primary); opacity: 0.8; }
                .btn-view-profile {
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    color: var(--text-main); padding: 6px 14px;
                    border-radius: 10px; font-size: 0.78rem; font-weight: 600;
                }
                .empty-connections { text-align: center; padding: 40px 0; color: rgba(255,255,255,0.3); }
                .skeleton-user-item { display: flex; gap: 14px; padding: 12px; animation: shimmer 1.5s infinite; }
                .skeleton-avatar { width: 46px; height: 46px; border-radius: 16px; background: rgba(255,255,255,0.06); }
                .skeleton-info { flex: 1; display: flex; flex-direction: column; gap: 6px; justify-content: center; }
                .skeleton-name { height: 12px; width: 100px; border-radius: 4px; background: rgba(255,255,255,0.06); }
                .skeleton-bio { height: 10px; width: 140px; border-radius: 4px; background: rgba(255,255,255,0.04); }

                /* ─── LOGOUT/CONFIRM MODAL ─── */
                .modal-overlay {
                    position: fixed; inset: 0; z-index: 2000;
                    background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
                    display: flex; align-items: center; justify-content: center;
                }
                .confirm-modal {
                    margin: 20px; padding: 30px 24px;
                    border-radius: 24px; text-align: center;
                    background: var(--bg-dark);
                    border: 1px solid var(--glass-border);
                    width: 100%; max-width: 340px;
                }
                .confirm-modal h3 { font-size: 1.2rem; font-weight: 800; margin: 0 0 8px; color: var(--text-main); }
                .modal-actions { display: flex; gap: 12px; }
                .btn-cancel {
                    flex: 1; height: 46px;
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 14px; color: white; font-weight: 700; cursor: pointer;
                }
                .btn-danger {
                    flex: 1; height: 46px;
                    background: rgba(255, 82, 82, 0.15);
                    border: 1px solid rgba(255, 82, 82, 0.3);
                    border-radius: 14px; color: #ff5252; font-weight: 700; cursor: pointer;
                }

                /* ─── EDIT OVERLAY ─── */
                .soul-edit-overlay {
                    position: fixed; inset: 0; background: var(--bg-dark); z-index: 2000;
                    display: flex; flex-direction: column;
                    overflow-y: auto;
                }
                .close-edit-btn {
                    position: absolute; top: 20px; right: 20px; z-index: 2001;
                    width: 44px; height: 44px; background: var(--glass);
                    border: 1px solid var(--glass-border); border-radius: 50%;
                    color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer;
                }
                .spin-icon { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default UserProfile;

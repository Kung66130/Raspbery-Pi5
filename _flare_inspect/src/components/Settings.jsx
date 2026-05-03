import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import {
    ArrowLeft, User, Lock, Link2, BadgeCheck,
    Globe, Palette, Type, Paintbrush,
    Eye, Wifi, CheckCheck, ShieldCheck, Ban, Smartphone,
    Bell, Volume2, Vibrate, Heart, MessageCircle, Sparkles, Users,
    MessageSquare, Timer, Image as ImageIcon, Download,
    Database, BarChart3, HardDrive,
    HelpCircle, AlertTriangle, FileText, Shield, Info,
    LogOut, Trash2, ChevronRight, Check, X
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from './NotificationSystem';
import { useAppearance } from '../contexts/AppearanceContext';
import SoulProfileSetup from './SoulProfileSetup';

const Settings = ({ onClose, onLogout, user, onUpdateUser }) => {
    const { t, language, switchLanguage, availableLanguages } = useLanguage();
    const { showNotification } = useNotification();
    const [subPage, setSubPage] = useState(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({ name: user?.name || '', email: user?.email || '', username: user?.username || '', bio: user?.bio || '' });
    const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
    const [subLoading, setSubLoading] = useState(false);
    const [blockedUsersState, setBlockedUsersState] = useState([]);

    const { appearance: globalAppearance, fontSize: globalFontSize, themeColor: globalThemeColor, updateAppearance } = useAppearance();

    const [settingsState, setSettingsState] = useState(() => {
        const saved = localStorage.getItem('flare_settings');
        return saved ? JSON.parse(saved) : {
            profileVisibility: 'public',
            onlineStatus: true,
            readReceipts: true,
            twoFactor: false,
            pushNotifications: true,
            notifSound: true,
            vibration: true,
            notifLikes: true,
            notifComments: true,
            notifMessages: true,
            notifMatches: true,
            chatBubbleStyle: 'round',
            autoDeleteMessages: 'never',
            mediaAutoDownload: true,
        };
    });

    const [activeSection, setActiveSection] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const updateSetting = (key, value) => {
        if (['appearance', 'fontSize', 'themeColor'].includes(key)) {
            updateAppearance({ [key]: value });
        } else {
            const newState = { ...settingsState, [key]: value };
            setSettingsState(newState);
            localStorage.setItem('flare_settings', JSON.stringify(newState));
        }
    };

    useEffect(() => {
        if (subPage === 'blockedUsers') {
            const blockedRaw = localStorage.getItem('flare_blocked_users');
            if (blockedRaw) {
                setBlockedUsersState(JSON.parse(blockedRaw));
            }
        }
    }, [subPage]);

    const handleUnblock = (userId) => {
        const updated = blockedUsersState.filter(u => u.id !== userId);
        setBlockedUsersState(updated);
        localStorage.setItem('flare_blocked_users', JSON.stringify(updated));
        showNotification(language === 'th' ? 'เลิกบล็อกผู้ใช้แล้ว' : 'User unblocked', 'success');
    };

    const themeColors = [
        { color: '#a855f7', name: 'Purple' },
        { color: '#ec4899', name: 'Pink' },
        { color: '#3b82f6', name: 'Blue' },
        { color: '#10b981', name: 'Green' },
        { color: '#f59e0b', name: 'Amber' },
        { color: '#ef4444', name: 'Red' },
        { color: '#06b6d4', name: 'Cyan' },
        { color: '#8b5cf6', name: 'Violet' },
    ];

    const settingSections = [
        {
            id: 'account',
            title: t('settings.account'),
            icon: <User size={20} />,
            items: [
                { id: 'personalInfo', icon: <User size={18} />, title: t('settings.personalInfo'), desc: t('settings.personalInfoDesc'), type: 'action', action: () => setIsEditingProfile(true) },
                { id: 'changePassword', icon: <Lock size={18} />, title: t('settings.changePassword'), desc: t('settings.changePasswordDesc'), type: 'link' },
                { id: 'linkedAccounts', icon: <Link2 size={18} />, title: t('settings.linkedAccounts'), desc: t('settings.linkedAccountsDesc'), type: 'link' },
                { id: 'verifyAccount', icon: <BadgeCheck size={18} />, title: t('settings.verifyAccount'), desc: t('settings.verifyAccountDesc'), type: 'link' },
            ]
        },
        {
            id: 'general',
            title: t('settings.general'),
            icon: <Globe size={20} />,
            items: [
                { id: 'language', icon: <Globe size={18} />, title: t('settings.language'), desc: t('settings.languageDesc'), type: 'language' },
                {
                    id: 'appearance', icon: <Palette size={18} />, title: t('settings.appearance'), desc: t('settings.appearanceDesc'), type: 'select', key: 'appearance', options: [
                        { value: 'dark', label: t('settings.dark') },
                        { value: 'light', label: t('settings.light') },
                        { value: 'system', label: t('settings.system') },
                    ]
                },
                {
                    id: 'fontSize', icon: <Type size={18} />, title: t('settings.fontSize'), desc: t('settings.fontSizeDesc'), type: 'select', key: 'fontSize', options: [
                        { value: 'small', label: t('settings.small') },
                        { value: 'medium', label: t('settings.medium') },
                        { value: 'large', label: t('settings.large') },
                    ]
                },
                { id: 'themeColor', icon: <Paintbrush size={18} />, title: t('settings.themeColor'), desc: t('settings.themeColorDesc'), type: 'color' },
            ]
        },
        {
            id: 'privacy',
            title: t('settings.privacySecurity'),
            icon: <Shield size={20} />,
            items: [
                {
                    id: 'profileVisibility', icon: <Eye size={18} />, title: t('settings.profileVisibility'), desc: t('settings.profileVisibilityDesc'), type: 'select', key: 'profileVisibility', options: [
                        { value: 'public', label: t('settings.public') },
                        { value: 'friends', label: t('settings.friendsOnly') },
                        { value: 'private', label: t('settings.private') },
                    ]
                },
                { id: 'onlineStatus', icon: <Wifi size={18} />, title: t('settings.onlineStatus'), desc: t('settings.onlineStatusDesc'), type: 'toggle', key: 'onlineStatus' },
                { id: 'readReceipts', icon: <CheckCheck size={18} />, title: t('settings.readReceipts'), desc: t('settings.readReceiptsDesc'), type: 'toggle', key: 'readReceipts' },
                { id: 'twoFactor', icon: <ShieldCheck size={18} />, title: t('settings.twoFactor'), desc: t('settings.twoFactorDesc'), type: 'toggle', key: 'twoFactor' },
                { id: 'blockedUsers', icon: <Ban size={18} />, title: t('settings.blockedUsers'), desc: t('settings.blockedUsersDesc'), type: 'link' },
                { id: 'loginActivity', icon: <Smartphone size={18} />, title: t('settings.loginActivity'), desc: t('settings.loginActivityDesc'), type: 'link' },
            ]
        },
        {
            id: 'notifications',
            title: t('settings.notificationsSound'),
            icon: <Bell size={20} />,
            items: [
                { id: 'pushNotifications', icon: <Bell size={18} />, title: t('settings.pushNotifications'), desc: t('settings.pushNotificationsDesc'), type: 'toggle', key: 'pushNotifications' },
                { id: 'notifSound', icon: <Volume2 size={18} />, title: t('settings.notifSound'), desc: t('settings.notifSoundDesc'), type: 'toggle', key: 'notifSound' },
                { id: 'vibration', icon: <Vibrate size={18} />, title: t('settings.vibration'), desc: t('settings.vibrationDesc'), type: 'toggle', key: 'vibration' },
                { id: 'notifLikes', icon: <Heart size={18} />, title: t('settings.notifLikes'), desc: t('settings.notifLikesDesc'), type: 'toggle', key: 'notifLikes' },
                { id: 'notifComments', icon: <MessageCircle size={18} />, title: t('settings.notifComments'), desc: t('settings.notifCommentsDesc'), type: 'toggle', key: 'notifComments' },
                { id: 'notifMessages', icon: <MessageSquare size={18} />, title: t('settings.notifMessages'), desc: t('settings.notifMessagesDesc'), type: 'toggle', key: 'notifMessages' },
                { id: 'notifMatches', icon: <Sparkles size={18} />, title: t('settings.notifMatches'), desc: t('settings.notifMatchesDesc'), type: 'toggle', key: 'notifMatches' },
            ]
        },
        {
            id: 'chat',
            title: t('settings.chatSettings'),
            icon: <MessageSquare size={20} />,
            items: [
                {
                    id: 'chatBubbleStyle', icon: <MessageSquare size={18} />, title: t('settings.chatBubbleStyle'), desc: t('settings.chatBubbleStyleDesc'), type: 'select', key: 'chatBubbleStyle', options: [
                        { value: 'round', label: t('settings.round') },
                        { value: 'sharp', label: t('settings.sharp') },
                        { value: 'minimal', label: t('settings.minimal') },
                    ]
                },
                {
                    id: 'autoDeleteMessages', icon: <Timer size={18} />, title: t('settings.autoDeleteMessages'), desc: t('settings.autoDeleteMessagesDesc'), type: 'select', key: 'autoDeleteMessages', options: [
                        { value: 'never', label: t('settings.never') },
                        { value: '24h', label: t('settings.after24h') },
                        { value: '7d', label: t('settings.after7d') },
                        { value: '30d', label: t('settings.after30d') },
                    ]
                },
                { id: 'chatWallpaper', icon: <ImageIcon size={18} />, title: t('settings.chatWallpaper'), desc: t('settings.chatWallpaperDesc'), type: 'link' },
                { id: 'mediaAutoDownload', icon: <Download size={18} />, title: t('settings.mediaAutoDownload'), desc: t('settings.mediaAutoDownloadDesc'), type: 'toggle', key: 'mediaAutoDownload' },
            ]
        },
        {
            id: 'storage',
            title: t('settings.storageData'),
            icon: <Database size={20} />,
            items: [
                {
                    id: 'clearCache', icon: <HardDrive size={18} />, title: t('settings.clearCache'), desc: t('settings.clearCacheDesc'), type: 'action', action: () => {
                        showNotification(t('settings.cacheCleared'), 'success');
                    }
                },
                { id: 'dataUsage', icon: <BarChart3 size={18} />, title: t('settings.dataUsage'), desc: t('settings.dataUsageDesc'), type: 'link' },
                { id: 'downloadData', icon: <Download size={18} />, title: t('settings.downloadData'), desc: t('settings.downloadDataDesc'), type: 'link' },
            ]
        },
        {
            id: 'support',
            title: t('settings.support'),
            icon: <HelpCircle size={20} />,
            items: [
                { id: 'helpCenter', icon: <HelpCircle size={18} />, title: t('settings.helpCenter'), desc: t('settings.helpCenterDesc'), type: 'link' },
                { id: 'reportProblem', icon: <AlertTriangle size={18} />, title: t('settings.reportProblem'), desc: t('settings.reportProblemDesc'), type: 'link' },
                { id: 'termsOfService', icon: <FileText size={18} />, title: t('settings.termsOfService'), desc: t('settings.termsOfServiceDesc'), type: 'link' },
                { id: 'privacyPolicy', icon: <Shield size={18} />, title: t('settings.privacyPolicy'), desc: t('settings.privacyPolicyDesc'), type: 'link' },
                { id: 'about', icon: <Info size={18} />, title: t('settings.about'), desc: t('settings.aboutDesc'), type: 'link' },
            ]
        },
        {
            id: 'actions',
            title: 'การจัดการบัญชี',
            icon: <LogOut size={20} />,
            items: [
                { id: 'logout', icon: <LogOut size={18} />, title: t('settings.logout'), desc: t('settings.logoutDesc'), type: 'action', action: () => setShowLogoutConfirm(true), danger: 'orange' },
                { id: 'deleteAccount', icon: <Trash2 size={18} />, title: t('settings.deleteAccount'), desc: t('settings.deleteAccountDesc'), type: 'action', action: () => setShowDeleteConfirm(true), danger: 'red' },
            ]
        },
    ];

    const renderToggle = (key) => {
        const isActive = ['appearance'].includes(key) ? globalAppearance === 'dark' : settingsState[key];
        return (
            <div
                className={`settings-toggle ${isActive ? 'active' : ''}`}
                onClick={() => updateSetting(key, !isActive)}
            >
                <motion.div className="toggle-thumb" layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            </div>
        );
    };

    const renderSelect = (item) => {
        const currentVal = item.key === 'appearance' ? globalAppearance :
            item.key === 'fontSize' ? globalFontSize :
                settingsState[item.key];
        return (
            <div className="select-options">
                {item.options.map(opt => (
                    <button
                        key={opt.value}
                        className={`select-option ${currentVal === opt.value ? 'active' : ''}`}
                        onClick={() => updateSetting(item.key, opt.value)}
                    >
                        {currentVal === opt.value && <Check size={14} />}
                        {opt.label}
                    </button>
                ))}
            </div>
        );
    };

    const renderLanguageSelector = () => (
        <div className="language-selector">
            {availableLanguages.map(lang => (
                <button
                    key={lang.code}
                    className={`language-option ${language === lang.code ? 'active' : ''}`}
                    onClick={() => switchLanguage(lang.code)}
                >
                    <span className="lang-flag">{lang.flag}</span>
                    <span className="lang-name">{lang.name}</span>
                    {language === lang.code && <Check size={16} className="lang-check" />}
                </button>
            ))}
        </div>
    );

    const renderColorPicker = () => (
        <div className="color-picker">
            {themeColors.map(tc => (
                <button
                    key={tc.color}
                    className={`color-option ${globalThemeColor === tc.color ? 'active' : ''}`}
                    style={{ background: tc.color }}
                    onClick={() => updateSetting('themeColor', tc.color)}
                >
                    {globalThemeColor === tc.color && <Check size={14} color="white" />}
                </button>
            ))}
        </div>
    );

    const renderSettingItem = (item) => {
        switch (item.type) {
            case 'toggle':
                return (
                    <div key={item.id} className="setting-item">
                        <div className="setting-icon">{item.icon}</div>
                        <div className="setting-info">
                            <span className="setting-title">{item.title}</span>
                            <span className="setting-desc">{item.desc}</span>
                        </div>
                        {renderToggle(item.key)}
                    </div>
                );
            case 'select':
                return (
                    <div key={item.id} className="setting-item expandable">
                        <div className="setting-row" onClick={() => setActiveSection(activeSection === item.id ? null : item.id)}>
                            <div className="setting-icon">{item.icon}</div>
                            <div className="setting-info">
                                <span className="setting-title">{item.title}</span>
                                <span className="setting-desc">{item.desc}</span>
                            </div>
                            <ChevronRight size={18} className={`chevron ${activeSection === item.id ? 'rotated' : ''}`} />
                        </div>
                        <AnimatePresence>
                            {activeSection === item.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="setting-expanded"
                                >
                                    {renderSelect(item)}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            case 'language':
                return (
                    <div key={item.id} className="setting-item expandable">
                        <div className="setting-row" onClick={() => setActiveSection(activeSection === item.id ? null : item.id)}>
                            <div className="setting-icon">{item.icon}</div>
                            <div className="setting-info">
                                <span className="setting-title">{item.title}</span>
                                <span className="setting-desc">{availableLanguages.find(l => l.code === language)?.flag} {availableLanguages.find(l => l.code === language)?.name}</span>
                            </div>
                            <ChevronRight size={18} className={`chevron ${activeSection === item.id ? 'rotated' : ''}`} />
                        </div>
                        <AnimatePresence>
                            {activeSection === item.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="setting-expanded"
                                >
                                    {renderLanguageSelector()}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            case 'color':
                return (
                    <div key={item.id} className="setting-item expandable">
                        <div className="setting-row" onClick={() => setActiveSection(activeSection === item.id ? null : item.id)}>
                            <div className="setting-icon">{item.icon}</div>
                            <div className="setting-info">
                                <span className="setting-title">{item.title}</span>
                                <span className="setting-desc">{item.desc}</span>
                            </div>
                            <div className="color-preview" style={{ background: globalThemeColor }}></div>
                        </div>
                        <AnimatePresence>
                            {activeSection === item.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="setting-expanded"
                                >
                                    {renderColorPicker()}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            case 'action':
                return (
                    <div key={item.id} className="setting-item clickable" onClick={item.action}>
                        <div className={`setting-icon ${item.danger === 'orange' ? 'logout-icon' : item.danger === 'red' ? 'delete-icon' : ''}`}>{item.icon}</div>
                        <div className="setting-info">
                            <span className={`setting-title ${item.danger === 'orange' ? 'danger-text' : item.danger === 'red' ? 'danger-text-red' : ''}`}>{item.title}</span>
                            <span className="setting-desc">{item.desc}</span>
                        </div>
                        <ChevronRight size={18} className="chevron" />
                    </div>
                );
            case 'link':
            default:
                return (
                    <div key={item.id} className="setting-item clickable" onClick={() => setSubPage(item.id)}>
                        <div className="setting-icon">{item.icon}</div>
                        <div className="setting-info">
                            <span className="setting-title">{item.title}</span>
                            <span className="setting-desc">{item.desc}</span>
                        </div>
                        <ChevronRight size={18} className="chevron" />
                    </div>
                );
        }
    };

    const handleSaveProfile = async () => {
        setSubLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', editForm.name);
            formData.append('username', editForm.username);
            formData.append('email', editForm.email);
            formData.append('bio', editForm.bio);

            const data = await api.put('/users/profile', formData, true);
            if (onUpdateUser) onUpdateUser(data);
            localStorage.setItem('flare_user', JSON.stringify(data));
            showNotification(t('settings.saved') || 'บันทึกสำเร็จ! ✅', 'success');
            setSubPage(null);
        } catch (err) {
            showNotification(err.message, 'error');
        } finally {
            setSubLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordForm.newPass !== passwordForm.confirm) {
            return showNotification(t('settings.passwordMismatch') || 'รหัสผ่านไม่ตรงกัน', 'error');
        }
        if (passwordForm.newPass.length < 6) {
            return showNotification(t('settings.passwordTooShort') || 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
        }
        setSubLoading(true);
        try {
            await api.put('/users/password', { currentPassword: passwordForm.current, newPassword: passwordForm.newPass });
            showNotification(t('settings.passwordChanged') || 'เปลี่ยนรหัสผ่านสำเร็จ! 🔒', 'success');
            setPasswordForm({ current: '', newPass: '', confirm: '' });
            setSubPage(null);
        } catch (err) {
            showNotification(err.message, 'error');
        } finally {
            setSubLoading(false);
        }
    };

    const renderSubPage = () => {
        const subHeader = (title) => (
            <div className="settings-header glass-panel">
                <button className="back-btn" onClick={() => setSubPage(null)}><ArrowLeft size={22} /></button>
                <h2>{title}</h2>
                <div style={{ width: 22 }}></div>
            </div>
        );

        switch (subPage) {
            case 'personalInfo':
                return null; // Now handled by isEditingProfile overlay
            case 'changePassword':
                return (<>
                    {subHeader(t('settings.changePassword'))}
                    <div className="settings-scroll">
                        <div className="sub-form">
                            <label>{t('settings.currentPassword') || 'รหัสผ่านปัจจุบัน'}</label>
                            <input type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} />
                            <label>{t('settings.newPassword') || 'รหัสผ่านใหม่'}</label>
                            <input type="password" value={passwordForm.newPass} onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })} />
                            <label>{t('settings.confirmPassword') || 'ยืนยันรหัสผ่านใหม่'}</label>
                            <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
                            <button className="sub-save-btn" onClick={handleChangePassword} disabled={subLoading}>
                                {subLoading ? (t('auth.processing') || 'กำลังดำเนินการ...') : (t('settings.changePassword'))}
                            </button>
                        </div>
                    </div>
                </>);
            case 'linkedAccounts':
                return (<>
                    {subHeader(t('settings.linkedAccounts'))}
                    <div className="settings-scroll">
                        <div className="sub-linked">
                            {['Google', 'Facebook', 'LINE'].map(provider => (
                                <div key={provider} className="linked-item">
                                    <div className="linked-info"><span className="linked-name">{provider}</span><span className="linked-status">{provider === 'Google' && user?.image?.includes('google') ? '✅ เชื่อมต่อแล้ว' : '❌ ยังไม่เชื่อมต่อ'}</span></div>
                                    <button className="linked-btn" onClick={() => showNotification(`เชื่อมต่อ ${provider} ในเร็วๆ นี้`, 'info')}>{provider === 'Google' && user?.image?.includes('google') ? 'ยกเลิก' : 'เชื่อมต่อ'}</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </>);
            case 'verifyAccount':
                return (<>
                    {subHeader(t('settings.verifyAccount'))}
                    <div className="settings-scroll">
                        <div className="sub-verify">
                            <BadgeCheck size={64} color="var(--primary)" />
                            <h3>{t('settings.verifyAccount')}</h3>
                            <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginBottom: 20 }}>ยืนยันตัวตนเพื่อรับเครื่องหมาย ✓ บนโปรไฟล์ของคุณ</p>
                            <div className="verify-requirements">
                                <div className="verify-item"><Check size={16} color="#10b981" /><span>มีโพสต์อย่างน้อย 5 โพสต์</span></div>
                                <div className="verify-item"><Check size={16} color="#10b981" /><span>ใช้งานมาแล้ว 7 วัน</span></div>
                                <div className="verify-item"><X size={16} color="var(--text-dim)" /><span>มีผู้ติดตามอย่างน้อย 10 คน</span></div>
                            </div>
                            <button className="sub-save-btn" onClick={() => showNotification('กำลังตรวจสอบคุณสมบัติ...', 'info')} style={{ marginTop: 20 }}>ส่งคำขอยืนยัน</button>
                        </div>
                    </div>
                </>);
            case 'blockedUsers':
                return (<>
                    {subHeader(t('settings.blockedUsers'))}
                    <div className="settings-scroll">
                        {blockedUsersState.length === 0 ? (
                            <div className="sub-empty"><Ban size={48} opacity={0.3} /><p>{t('settings.noBlockedUsers')}</p></div>
                        ) : (
                            <div className="sub-linked">
                                {blockedUsersState.map(u => (
                                    <div key={u.id} className="linked-item">
                                        <div className="linked-info" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <img src={u.image || `https://ui-avatars.com/api/?name=${u.name}&background=random`} alt={u.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                            <span className="linked-name">{u.name}</span>
                                        </div>
                                        <button className="linked-btn" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => handleUnblock(u.id)}>
                                            {t('settings.unblock')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>);
            case 'loginActivity':
                return (<>
                    {subHeader(t('settings.loginActivity'))}
                    <div className="settings-scroll">
                        <div className="sub-activity">
                            <div className="activity-item active-now"><Smartphone size={20} /><div><strong>อุปกรณ์นี้</strong><span>Windows • Chrome • กำลังใช้งาน</span></div></div>
                            <div className="activity-item"><Smartphone size={20} /><div><strong>iPhone 15</strong><span>iOS • Safari • ล่าสุดเมื่อวานนี้</span></div></div>
                        </div>
                    </div>
                </>);
            case 'chatWallpaper':
                return (<>
                    {subHeader(t('settings.chatWallpaper'))}
                    <div className="settings-scroll">
                        <div className="sub-wallpapers">
                            {['#1a1a2e', '#16213e', '#0f3460', '#533483', '#2c003e', '#1b1b2f', '#162447', '#1f4068'].map((c, i) => (
                                <div key={i} className="wallpaper-item" style={{ background: c }} onClick={() => showNotification('วอลเปเปอร์ถูกเปลี่ยนแล้ว ✅', 'success')}></div>
                            ))}
                        </div>
                    </div>
                </>);
            case 'termsOfService':
                return (<>
                    {subHeader(t('settings.termsOfService'))}
                    <div className="settings-scroll">
                        <div className="sub-content">
                            <h3>1. การยอมรับข้อตกลง</h3>
                            <p>การใช้งานแอปพลิเคชัน Flare ถือว่าคุณยอมรับเงื่อนไขการให้บริการทั้งหมดของเรา โปรดอ่านเงื่อนไขเหล่านี้อย่างละเอียดก่อนเริ่มต้นใช้งาน</p>
                            <h3>2. เนื้อหาของผู้ใช้</h3>
                            <p>คุณเป็นเจ้าของเนื้อหาที่คุณโพสต์ แต่คุณอนุญาตให้เราใช้งานเนื้อหานั้นภายใต้ขอบเขตของแอปเพื่อให้เพื่อนๆ และผู้ใช้คนอื่นสามารถเข้าถึงได้</p>
                            <h3>3. ข้อห้ามในการใช้งาน</h3>
                            <p>ห้ามโพสต์เนื้อหาที่ผิดกฎหมาย, คุกคาม, อนาจาร หรือละเมิดลิขสิทธิ์ผู้อื่น ทางแอปมีสิทธิ์ลบเนื้อหาหรือระงับบัญชีหากพบการละเมิด</p>
                            <h3>4. การอัปเดตแอป</h3>
                            <p>เราอาจมีการอัปเดตฟีเจอร์หรือข้อกำหนดต่างๆ เป็นระยะเพื่อให้แอปทำงานได้ดียิ่งขึ้น</p>
                        </div>
                    </div>
                </>);
            case 'privacyPolicy':
                return (<>
                    {subHeader(t('settings.privacyPolicy'))}
                    <div className="settings-scroll">
                        <div className="sub-content">
                            <h3>ข้อมูลที่เราเก็บรวบรวม</h3>
                            <p>เราเก็บข้อมูลโปรไฟล์ ได้แก่ ชื่อ, อีเมล และเบอร์โทรศัพท์ รวมถึงกิจกรรมการใช้งาน และความสนใจเพื่อพัฒนาประสบการณ์การใช้งานเฉพาะบุคคล</p>
                            <h3>การใช้งานข้อมูล</h3>
                            <p>ข้อมูลของคุณจะถูกใช้เพื่อเชื่อมต่อคุณกับผู้ใช้คนอื่นๆ และปรับแต่งฟีดให้ตรงกับความต้องการของคุณ เราจะไม่ขายข้อมูลของคุณให้กับบุคคลภายนอก</p>
                            <h3>ความปลอดภัย</h3>
                            <p>ข้อมูลของคุณจะถูกเก็บรักษาอย่างปลอดภัยสูงสุดตามมาตรฐานสากล เรามีการเข้ารหัสข้อมูลในทุกระดับเพื่อป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต</p>
                            <h3>สิทธิ์ในข้อมูลของคุณ</h3>
                            <p>คุณสามารถขอดาวน์โหลดสำเนาข้อมูลของคุณ หรือขอลบบัญชีและข้อมูลทั้งหมดได้ตลอดเวลาผ่านหน้าการตั้งค่า</p>
                        </div>
                    </div>
                </>);
            case 'about':
                return (<>
                    {subHeader(t('settings.about'))}
                    <div className="settings-scroll">
                        <div className="sub-about">
                            <img src="/Gemini_Generated_Image_ybdaz3ybdaz3ybda.png" alt="Flare" style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 16, objectFit: 'contain' }} />
                            <h2>Flare Social</h2>
                            <p>Connect Authentically</p>
                            <span style={{ marginTop: 20, color: 'var(--text-dim)' }}>Version 2.1.0 (Build 569)</span>
                            <div className="about-links">
                                <button className="link-item">Website</button>
                                <button className="link-item">Community</button>
                                <button className="link-item">Credits</button>
                            </div>
                        </div>
                    </div>
                </>);
            case 'dataUsage':
                return (<>
                    {subHeader(t('settings.dataUsage'))}
                    <div className="settings-scroll">
                        <div className="sub-linked">
                            <div className="linked-item">
                                <div className="linked-info"><span className="linked-name">สื่อและรูปภาพ (Media & Photos)</span><span className="linked-status">1.2 GB</span></div>
                            </div>
                            <div className="linked-item">
                                <div className="linked-info"><span className="linked-name">เอกสารและไฟล์ (Documents)</span><span className="linked-status">150 MB</span></div>
                            </div>
                            <div className="linked-item">
                                <div className="linked-info"><span className="linked-name">แคชของแอป (App Cache)</span><span className="linked-status">320 MB</span></div>
                            </div>
                            <button className="sub-save-btn" onClick={() => showNotification(t('settings.cacheCleared') || 'ล้างพื้นที่จัดเก็บสำเร็จ', 'success')}>ล้างพื้นที่จัดเก็บ</button>
                        </div>
                    </div>
                </>);
            case 'downloadData':
                return (<>
                    {subHeader(t('settings.downloadData'))}
                    <div className="settings-scroll">
                        <div className="sub-content">
                            <h3>ขอรับสำเนาข้อมูลของคุณ</h3>
                            <p>เราจะรวบรวมไฟล์ข้อมูลบัญชี โพสต์ แชท และรูปภาพทั้งหมดของคุณ จากนั้นจะส่งลิงก์ดาวน์โหลดให้ทางอีเมล ภายใน 3-5 วันทำการ</p>
                            <button className="sub-save-btn" onClick={() => {
                                showNotification('ส่งคำขอดาวน์โหลดข้อมูลแล้ว กรุณารอรับอีเมล', 'success');
                                setTimeout(() => setSubPage(null), 1500);
                            }} style={{ marginTop: 24 }}>ส่งคำขอข้อมูล</button>
                        </div>
                    </div>
                </>);
            case 'helpCenter':
                return (<>
                    {subHeader(t('settings.helpCenter'))}
                    <div className="settings-scroll">
                        <div className="sub-content">
                            <h3>คำถามที่พบบ่อย (FAQ)</h3>
                            <div className="faq-item" style={{ marginBottom: 16 }}>
                                <strong>เปลี่ยนรหัสผ่านอย่างไร?</strong>
                                <p style={{ margin: '4px 0 0', color: 'var(--text-dim)' }}>ไปที่ ตั้งค่า &gt; บัญชี &gt; เปลี่ยนรหัสผ่าน</p>
                            </div>
                            <div className="faq-item" style={{ marginBottom: 16 }}>
                                <strong>ลบบัญชีอย่างไร?</strong>
                                <p style={{ margin: '4px 0 0', color: 'var(--text-dim)' }}>เลื่อนไปที่ส่วนของ 'บัญชี' ในหน้าการตั้งค่า และเลือก 'ลบบัญชี'</p>
                            </div>
                            <div className="faq-item" style={{ marginBottom: 16 }}>
                                <strong>Soul Profile คืออะไร?</strong>
                                <p style={{ margin: '4px 0 0', color: 'var(--text-dim)' }}>โปรไฟล์ที่แยกพิเศษสำหรับใช้หาเพื่อนหรือคนคุยใหม่ โดยไม่กระทบกับตัวตนหน้าโปรไฟล์หลัก</p>
                            </div>

                            <div style={{ marginTop: 32, padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 12, textAlign: 'center' }}>
                                <p style={{ color: 'var(--text-dim)', marginBottom: 8, fontSize: '0.9rem' }}>ต้องการความช่วยเหลือเพิ่มเติม?</p>
                                <p
                                    style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem', margin: '8px 0', cursor: 'pointer' }}
                                    onClick={() => {
                                        navigator.clipboard.writeText('support@flaresocial.com');
                                        showNotification('คัดลอกอีเมลแล้ว 📋', 'success');
                                    }}
                                    title="คลิกเพื่อคัดลอกอีเมล"
                                >
                                    <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>support@flaresocial.com</span>
                                </p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>(แตะที่อีเมลเพื่อคัดลอก)</p>
                            </div>
                        </div>
                    </div>
                </>);
            case 'reportProblem':
                return (<>
                    {subHeader(t('settings.reportProblem'))}
                    <div className="settings-scroll">
                        <div className="sub-form">
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: 8, marginTop: 0 }}>อธิบายปัญหาที่คุณพบ</label>
                            <textarea
                                className="glass-input"
                                rows={5}
                                placeholder="รายละเอียดข้อมูลข้อผิดพลาด..."
                                style={{ width: '100%', padding: '12px', background: 'var(--glass)', border: '1px solid var(--glass-border)', outline: 'none', borderRadius: '12px', color: 'white', fontFamily: 'inherit', resize: 'none' }}
                                id="report-text"
                            />
                            <button className="sub-save-btn" onClick={() => {
                                const val = document.getElementById('report-text')?.value;
                                if (!val || val.trim() === '') return showNotification('กรุณาระบุรายละเอียดปัญหา', 'error');
                                showNotification('ส่งรายงานปัญหาแล้ว ขอบคุณค่ะ', 'success');
                                setTimeout(() => setSubPage(null), 1500);
                            }}>ส่งรายงาน</button>
                        </div>
                    </div>
                </>);
            default:
                return (<>
                    {subHeader(subPage)}
                    <div className="settings-scroll">
                        <div className="sub-empty"><Info size={48} opacity={0.3} /><p>ฟีเจอร์นี้กำลังอยู่ในช่วงการพัฒนา</p></div>
                    </div>
                </>);
        }
    };

    return (
        <motion.div
            className="settings-page"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
            {/* Main Settings List (Always mounted to preserve scroll) */}
            <div style={{ display: subPage ? 'none' : 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                <div className="settings-header glass-panel">
                    <button className="back-btn" onClick={onClose}>
                        <ArrowLeft size={22} />
                    </button>
                    <h2>{t('settings.title')}</h2>
                    <div style={{ width: 22 }}></div>
                </div>

                <div className="settings-scroll">
                    {settingSections.map(section => (
                        <div key={section.id} className="settings-section">
                            <div className="section-header">
                                {section.icon}
                                <h3>{section.title}</h3>
                            </div>
                            <div className="section-items">
                                {section.items.map(item => renderSettingItem(item))}
                            </div>
                        </div>
                    ))}

                    <div className="app-version">
                        <p>Flare Social v2.1.0</p>
                        <p className="copyright">© 2025 Flare Inc.</p>
                    </div>
                </div>
            </div>

            {/* Profile Editing Overlay */}
            {isEditingProfile && (
                <div className="soul-edit-overlay">
                    <SoulProfileSetup 
                        user={user} 
                        initialData={user.soulProfile || user.soul_profile}
                        onComplete={(profile) => {
                            setIsEditingProfile(false);
                            if (onUpdateUser) {
                                api.get('/users/profile').then(onUpdateUser);
                            }
                        }}
                    />
                    <button className="close-edit-btn" onClick={() => setIsEditingProfile(false)}>
                        <X size={24} />
                    </button>
                </div>
            )}

            {/* Sub-pages */}
            {subPage && renderSubPage()}

            {/* Logout Confirmation */}
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
                            <LogOut size={40} className="modal-icon" />
                            <h3>{t('settings.logout')}?</h3>
                            <p>{t('settings.logoutDesc')}</p>
                            <div className="modal-actions">
                                <button className="btn-cancel" onClick={() => setShowLogoutConfirm(false)}>{t('common.cancel')}</button>
                                <button className="btn-danger" onClick={() => { setShowLogoutConfirm(false); onLogout(); }}>{t('settings.logout')}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Account Confirmation */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="confirm-modal glass-panel"
                            onClick={e => e.stopPropagation()}
                        >
                            <Trash2 size={40} className="modal-icon danger" />
                            <h3>{t('settings.deleteAccount')}?</h3>
                            <p>{t('settings.deleteAccountDesc')}</p>
                            <div className="modal-actions">
                                <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>{t('common.cancel')}</button>
                                <button className="btn-danger-red" onClick={async () => {
                                    try {
                                        await api.delete('/users/profile');
                                        setShowDeleteConfirm(false);
                                        showNotification('ลบบัญชีสำเร็จแล้ว ยินดีที่ได้ให้บริการค่ะ', 'success');
                                        setTimeout(() => onLogout(), 2000);
                                    } catch (err) {
                                        showNotification('ลบบัญชีไม่สำเร็จ: ' + err.message, 'error');
                                    }
                                }}>{t('settings.deleteAccount')}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .settings-page {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: var(--bg-dark);
                    z-index: 200;
                    display: flex;
                    flex-direction: column;
                }
                .settings-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    border-radius: 0 0 20px 20px;
                }
                .settings-header h2 {
                    font-size: 1.2rem;
                    font-weight: 700;
                }
                .back-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    padding: 4px;
                }

                .settings-scroll {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px 16px 120px;
                }

                .settings-section {
                    margin-bottom: 24px;
                }
                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 12px;
                    color: var(--primary);
                    font-weight: 700;
                    font-size: 0.85rem;
                }
                .section-header h3 {
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .section-items {
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    border-radius: 16px;
                    overflow: hidden;
                }

                .setting-item {
                    display: flex;
                    align-items: center;
                    padding: 14px 16px;
                    gap: 14px;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                    transition: background 0.2s;
                }
                .setting-item:last-child { border-bottom: none; }
                .setting-item.clickable { cursor: pointer; }
                .setting-item.clickable:hover { background: rgba(255,255,255,0.03); }
                .setting-item.expandable {
                    flex-direction: column;
                    align-items: stretch;
                    padding: 0;
                }
                .setting-row {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 14px 16px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .setting-row:hover { background: rgba(255,255,255,0.03); }

                .setting-icon {
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255,255,255,0.06);
                    border-radius: 10px;
                    color: var(--text-main);
                    flex-shrink: 0;
                }
                .setting-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    min-width: 0;
                }
                .setting-title {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: white;
                }
                .setting-desc {
                    font-size: 0.75rem;
                    color: var(--text-dim);
                }

                .chevron {
                    color: var(--text-dim);
                    transition: transform 0.2s;
                    flex-shrink: 0;
                }
                .chevron.rotated { transform: rotate(90deg); }

                /* Toggle */
                .settings-toggle {
                    width: 48px;
                    height: 28px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 14px;
                    padding: 3px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    transition: background 0.3s;
                    flex-shrink: 0;
                }
                .settings-toggle.active {
                    background: var(--primary);
                    justify-content: flex-end;
                }
                .toggle-thumb {
                    width: 22px;
                    height: 22px;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                /* Expandable Content */
                .setting-expanded {
                    overflow: hidden;
                    padding: 0 16px;
                }

                /* Select Options */
                .select-options {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    padding: 8px 0 14px;
                }
                .select-option {
                    padding: 8px 16px;
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.04);
                    color: var(--text-muted);
                    cursor: pointer;
                    font-size: 0.82rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                }
                .select-option.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                    font-weight: 600;
                }

                /* Language Selector */
                .language-selector {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    padding: 8px 0 14px;
                }
                .language-option {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.08);
                    background: rgba(255,255,255,0.03);
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .language-option:hover {
                    background: rgba(255,255,255,0.06);
                }
                .language-option.active {
                    background: rgba(168, 85, 247, 0.15);
                    border-color: var(--primary);
                }
                .lang-flag { font-size: 1.3rem; }
                .lang-name { flex: 1; font-weight: 500; font-size: 0.95rem; text-align: left; }
                .lang-check { color: var(--primary); }

                /* Color Picker */
                .color-picker {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    padding: 8px 0 14px;
                }
                .color-option {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    border: 3px solid transparent;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .color-option.active {
                    border-color: white;
                    transform: scale(1.15);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }
                .color-preview {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                /* Danger Zone */
                .danger-zone .section-items {
                    border-color: rgba(239, 68, 68, 0.15);
                }
                .logout-icon { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
                .delete-icon { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
                .danger-text { color: #f59e0b; }
                .danger-text-red { color: #ef4444; }

                /* Modal */
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.7);
                    z-index: 300;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    backdrop-filter: blur(5px);
                }
                .confirm-modal {
                    width: 100%;
                    max-width: 320px;
                    padding: 30px;
                    text-align: center;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(20, 10, 30, 0.95);
                    border-radius: 24px;
                }
                .modal-icon { color: var(--primary); margin-bottom: 16px; }
                .modal-icon.danger { color: #ef4444; }
                .confirm-modal h3 { margin-bottom: 8px; color: white; font-size: 1.1rem; }
                .confirm-modal p { color: var(--text-dim); font-size: 0.85rem; margin-bottom: 24px; }
                .modal-actions { display: flex; gap: 12px; }
                .btn-cancel {
                    flex: 1;
                    padding: 12px;
                    border-radius: 12px;
                    background: rgba(255,255,255,0.08);
                    border: none;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                }
                .btn-danger {
                    flex: 1;
                    padding: 12px;
                    border-radius: 12px;
                    background: #f59e0b;
                    border: none;
                    color: black;
                    font-weight: 600;
                    cursor: pointer;
                }
                .btn-danger-red {
                    flex: 1;
                    padding: 12px;
                    border-radius: 12px;
                    background: #ef4444;
                    border: none;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
                }

                /* App Version */
                .app-version {
                    text-align: center;
                    padding: 30px 0 20px;
                    color: var(--text-dim);
                    font-size: 0.75rem;
                }
                .app-version .copyright { margin-top: 4px; opacity: 0.5; }

                /* Scrollbar */
                .settings-scroll::-webkit-scrollbar { width: 4px; }
                .settings-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 2px;
                }

                /* Sub-page Forms */
                .sub-form { padding: 20px; }
                .sub-form label { display: block; color: var(--text-muted); font-size: 0.8rem; margin-bottom: 6px; margin-top: 16px; }
                .sub-form label:first-child { margin-top: 0; }
                .sub-form input, .sub-form textarea {
                    width: 100%; padding: 14px 16px; border-radius: 12px;
                    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
                    color: white; font-size: 0.95rem; outline: none; font-family: inherit; resize: none;
                    transition: border-color 0.2s;
                }
                .sub-form input:focus, .sub-form textarea:focus { border-color: var(--primary); }
                .sub-save-btn {
                    width: 100%; padding: 14px; border-radius: 14px; border: none;
                    background: linear-gradient(135deg, var(--primary), var(--secondary));
                    color: white; font-weight: 700; font-size: 1rem; cursor: pointer;
                    margin-top: 24px; transition: opacity 0.2s;
                }
                .sub-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                /* Linked Accounts */
                .sub-linked { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
                .linked-item {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 16px; border-radius: 14px;
                    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
                }
                .linked-info { display: flex; flex-direction: column; gap: 4px; }
                .linked-name { font-weight: 600; color: white; }
                .linked-status { font-size: 0.78rem; color: var(--text-dim); }
                .linked-btn {
                    padding: 8px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.06); color: white; font-size: 0.82rem;
                    cursor: pointer; font-weight: 500; transition: all 0.2s;
                }
                .linked-btn:hover { background: var(--primary); border-color: var(--primary); }

                /* Verify Account */
                .sub-verify { padding: 30px 20px; display: flex; flex-direction: column; align-items: center; }
                .sub-verify h3 { margin: 16px 0 8px; color: white; }
                .verify-requirements { width: 100%; display: flex; flex-direction: column; gap: 12px; margin-top: 10px; }
                .verify-item {
                    display: flex; align-items: center; gap: 12px; padding: 14px 16px;
                    border-radius: 12px; background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.06); color: var(--text-muted); font-size: 0.9rem;
                }

                /* Empty State */
                .sub-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 16px; color: var(--text-dim); }

                /* Activity */
                .sub-activity { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
                .activity-item {
                    display: flex; align-items: center; gap: 14px; padding: 16px;
                    border-radius: 14px; background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.06); color: var(--text-muted);
                }
                .activity-item div { display: flex; flex-direction: column; gap: 2px; }
                .activity-item strong { color: white; font-size: 0.9rem; }
                .activity-item span { font-size: 0.78rem; }
                .activity-item.active-now { border-color: rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.05); }

                /* Wallpapers */
                .sub-wallpapers { padding: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
                .wallpaper-item {
                    aspect-ratio: 9/16; border-radius: 14px; cursor: pointer;
                    border: 2px solid transparent; transition: all 0.2s;
                }
                .wallpaper-item:hover { border-color: var(--primary); transform: scale(1.05); }
                /* Sub-content & About */
                .sub-content { padding: 20px; color: var(--text-muted); line-height: 1.6; }
                .sub-content h3 { color: white; margin: 24px 0 12px; font-size: 1.1rem; }
                .sub-content p { font-size: 0.9rem; margin-bottom: 16px; }
                .sub-about { display: flex; flex-direction: column; align-items: center; padding: 40px 20px; }
                .about-links { display: flex; gap: 12px; margin-top: 30px; }
                .link-item { background: var(--glass); border: 1px solid var(--glass-border); color: white; padding: 8px 16px; border-radius: 10px; font-size: 0.8rem; cursor: pointer; }
                .soul-edit-overlay {
                    position: fixed;
                    inset: 0;
                    background: var(--bg-dark);
                    z-index: 3000;
                    display: flex;
                    flex-direction: column;
                }
                .close-edit-btn {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    z-index: 3001;
                    width: 44px;
                    height: 44px;
                    background: rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 50%;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
            `}</style>
        </motion.div>
    );
};

export default Settings;

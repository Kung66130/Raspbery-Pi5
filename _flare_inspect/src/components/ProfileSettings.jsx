import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { ArrowLeft, ChevronRight, Check, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from './NotificationSystem';
import { useAppearance } from '../contexts/AppearanceContext';
import SoulProfileSetup from './SoulProfileSetup';

const ProfileSettings = ({ user, onUpdateUser, onLogout }) => {
    const { t, language, switchLanguage, availableLanguages } = useLanguage();
    const { showNotification } = useNotification();
    const { appearance: globalAppearance, fontSize: globalFontSize, themeColor: globalThemeColor, updateAppearance } = useAppearance();
    const [subPage, setSubPage] = useState(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [activeSection, setActiveSection] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
    const [subLoading, setSubLoading] = useState(false);

    const [settings, setSettings] = useState(() => {
        const s = localStorage.getItem('flare_settings');
        return s ? JSON.parse(s) : {
            profileVisibility: 'public', onlineStatus: true, readReceipts: true,
            twoFactor: false, pushNotifications: true, notifSound: true,
            vibration: true, notifLikes: true, notifComments: true,
            notifMessages: true, notifMatches: true, chatBubbleStyle: 'round',
            autoDeleteMessages: 'never', mediaAutoDownload: true,
        };
    });

    useEffect(() => {
        if (subPage === 'blockedUsers') {
            const raw = localStorage.getItem('flare_blocked_users');
            if (raw) setBlockedUsers(JSON.parse(raw));
        }
    }, [subPage]);

    const updateSetting = (key, value) => {
        if (['appearance', 'fontSize', 'themeColor'].includes(key)) {
            updateAppearance({ [key]: value });
        } else {
            const next = { ...settings, [key]: value };
            setSettings(next);
            localStorage.setItem('flare_settings', JSON.stringify(next));
        }
    };

    const handleChangePassword = async () => {
        if (passwordForm.newPass !== passwordForm.confirm)
            return showNotification('รหัสผ่านไม่ตรงกัน', 'error');
        if (passwordForm.newPass.length < 6)
            return showNotification('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
        setSubLoading(true);
        try {
            await api.put('/users/password', { currentPassword: passwordForm.current, newPassword: passwordForm.newPass });
            showNotification('เปลี่ยนรหัสผ่านสำเร็จ! 🔒', 'success');
            setPasswordForm({ current: '', newPass: '', confirm: '' });
            setSubPage(null);
        } catch (err) { showNotification(err.message, 'error'); }
        finally { setSubLoading(false); }
    };

    const themeColors = [
        { color: '#a855f7' }, { color: '#ec4899' }, { color: '#3b82f6' },
        { color: '#10b981' }, { color: '#f59e0b' }, { color: '#ef4444' },
        { color: '#06b6d4' }, { color: '#8b5cf6' },
    ];

    const renderToggle = (key) => {
        const isActive = settings[key];
        return (
            <div className={`ps-toggle ${isActive ? 'active' : ''}`} onClick={() => updateSetting(key, !isActive)}>
                <motion.div className="ps-toggle-thumb" layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            </div>
        );
    };

    const sections = [
        {
            id: 'account', emoji: '👤', title: t('settings.account'),
            items: [
                { id: 'personalInfo', emoji: '🪪', title: t('settings.personalInfo'), desc: t('settings.personalInfoDesc'), action: () => setIsEditingProfile(true) },
                { id: 'changePassword', emoji: '🔑', title: t('settings.changePassword'), desc: t('settings.changePasswordDesc'), page: true },
                { id: 'linkedAccounts', emoji: '🔗', title: t('settings.linkedAccounts'), desc: t('settings.linkedAccountsDesc'), page: true },
                { id: 'verifyAccount', emoji: '✅', title: t('settings.verifyAccount'), desc: t('settings.verifyAccountDesc'), page: true },
            ]
        },
        {
            id: 'general', emoji: '🌐', title: t('settings.general'),
            items: [
                { id: 'language', emoji: '🌏', title: t('settings.language'), desc: availableLanguages.find(l => l.code === language)?.flag + ' ' + availableLanguages.find(l => l.code === language)?.name, expand: true },
                { id: 'appearance', emoji: '🎨', title: t('settings.appearance'), desc: t('settings.appearanceDesc'), expand: true },
                { id: 'fontSize', emoji: '🔤', title: t('settings.fontSize'), desc: t('settings.fontSizeDesc'), expand: true },
                { id: 'themeColor', emoji: '🖌️', title: t('settings.themeColor'), desc: t('settings.themeColorDesc'), expand: true, colorDot: true },
            ]
        },
        {
            id: 'privacy', emoji: '🔒', title: t('settings.privacySecurity'),
            items: [
                { id: 'profileVisibility', emoji: '👁️', title: t('settings.profileVisibility'), desc: t('settings.profileVisibilityDesc'), expand: true },
                { id: 'onlineStatus', emoji: '🟢', title: t('settings.onlineStatus'), desc: t('settings.onlineStatusDesc'), toggle: 'onlineStatus' },
                { id: 'readReceipts', emoji: '✓✓', title: t('settings.readReceipts'), desc: t('settings.readReceiptsDesc'), toggle: 'readReceipts' },
                { id: 'blockedUsers', emoji: '🚫', title: t('settings.blockedUsers'), desc: t('settings.blockedUsersDesc'), page: true },
            ]
        },
        {
            id: 'notifications', emoji: '🔔', title: t('settings.notificationsSound'),
            items: [
                { id: 'pushNotifications', emoji: '📳', title: t('settings.pushNotifications'), desc: t('settings.pushNotificationsDesc'), toggle: 'pushNotifications' },
                { id: 'notifSound', emoji: '🔊', title: t('settings.notifSound'), desc: t('settings.notifSoundDesc'), toggle: 'notifSound' },
                { id: 'notifMessages', emoji: '✉️', title: t('settings.notifMessages'), desc: t('settings.notifMessagesDesc'), toggle: 'notifMessages' },
                { id: 'notifMatches', emoji: '✨', title: t('settings.notifMatches'), desc: t('settings.notifMatchesDesc'), toggle: 'notifMatches' },
            ]
        },
        {
            id: 'support-section', emoji: '🆘', title: t('settings.support'),
            items: [
                { id: 'supportMain', emoji: '🆘', title: t('settings.support'), desc: 'คลิกเพื่อดูเมนูย่อย', expand: true },
            ]
        },
    ];

    const expandOptions = {
        language: availableLanguages.map(l => ({ value: l.code, label: l.flag + ' ' + l.name, action: () => switchLanguage(l.code), active: language === l.code })),
        appearance: [
            { value: 'dark', label: t('settings.dark'), action: () => updateAppearance({ appearance: 'dark' }), active: globalAppearance === 'dark' },
            { value: 'light', label: t('settings.light'), action: () => updateAppearance({ appearance: 'light' }), active: globalAppearance === 'light' },
            { value: 'system', label: t('settings.system'), action: () => updateAppearance({ appearance: 'system' }), active: globalAppearance === 'system' },
        ],
        fontSize: [
            { value: 'small', label: t('settings.small'), action: () => updateAppearance({ fontSize: 'small' }), active: globalFontSize === 'small' },
            { value: 'medium', label: t('settings.medium'), action: () => updateAppearance({ fontSize: 'medium' }), active: globalFontSize === 'medium' },
            { value: 'large', label: t('settings.large'), action: () => updateAppearance({ fontSize: 'large' }), active: globalFontSize === 'large' },
        ],
        profileVisibility: [
            { value: 'public', label: t('settings.public'), action: () => updateSetting('profileVisibility', 'public'), active: settings.profileVisibility === 'public' },
            { value: 'friends', label: t('settings.friendsOnly'), action: () => updateSetting('profileVisibility', 'friends'), active: settings.profileVisibility === 'friends' },
            { value: 'private', label: t('settings.private'), action: () => updateSetting('profileVisibility', 'private'), active: settings.profileVisibility === 'private' },
        ],
        chatBubbleStyle: [
            { value: 'round', label: t('settings.round'), action: () => updateSetting('chatBubbleStyle', 'round'), active: settings.chatBubbleStyle === 'round' },
            { value: 'sharp', label: t('settings.sharp'), action: () => updateSetting('chatBubbleStyle', 'sharp'), active: settings.chatBubbleStyle === 'sharp' },
            { value: 'minimal', label: t('settings.minimal'), action: () => updateSetting('chatBubbleStyle', 'minimal'), active: settings.chatBubbleStyle === 'minimal' },
        ],
        autoDeleteMessages: [
            { value: 'never', label: t('settings.never'), action: () => updateSetting('autoDeleteMessages', 'never'), active: settings.autoDeleteMessages === 'never' },
            { value: '24h', label: t('settings.after24h'), action: () => updateSetting('autoDeleteMessages', '24h'), active: settings.autoDeleteMessages === '24h' },
            { value: '7d', label: t('settings.after7d'), action: () => updateSetting('autoDeleteMessages', '7d'), active: settings.autoDeleteMessages === '7d' },
        ],
        themeColor: 'colors',
        supportMain: [
            { id: 'helpCenter', emoji: '❓', title: t('settings.helpCenter'), desc: t('settings.helpCenterDesc') || 'อ่านคำถามที่พบบ่อยและศูนย์ช่วยเหลือ', action: () => setSubPage('helpCenter') },
            { id: 'reportProblem', emoji: '⚠️', title: t('settings.reportProblem'), desc: t('settings.reportProblemDesc') || 'แจ้งปัญหาการใช้งานหรือผู้ใช้', action: () => setSubPage('reportProblem') },
            { id: 'termsOfService', emoji: '📄', title: t('settings.termsOfService'), desc: t('settings.termsOfServiceDesc') || 'ข้อตกลงและเงื่อนไขการใช้บริการ', action: () => setSubPage('termsOfService') },
            { id: 'privacyPolicy', emoji: '🔏', title: t('settings.privacyPolicy'), desc: t('settings.privacyPolicyDesc') || 'นโยบายความเป็นส่วนตัวและข้อมูล', action: () => setSubPage('privacyPolicy') },
            { id: 'about', emoji: 'ℹ️', title: t('settings.about'), desc: t('settings.aboutDesc') || 'ข้อมูลเวอร์ชันและเกี่ยวกับแอป', action: () => setSubPage('about') },
        ],
    };

    const renderItem = (item) => (
        <div key={item.id}>
            <button
                className="ps-item"
                onClick={() => {
                    if (item.toggle) return;
                    if (item.expand) setActiveSection(activeSection === item.id ? null : item.id);
                    if (item.page) setSubPage(item.id);
                    if (item.action) item.action();
                }}
            >
                <span className="ps-emoji">{item.emoji}</span>
                <div className="ps-info">
                    <span className="ps-title">{item.title}</span>
                    <span className="ps-desc">{item.desc}</span>
                </div>
                {item.toggle
                    ? renderToggle(item.toggle)
                    : item.colorDot
                        ? <div style={{ width: 20, height: 20, borderRadius: '50%', background: globalThemeColor, border: '2px solid white' }} />
                        : <ChevronRight size={16} style={{ color: 'var(--text-dim)', transform: activeSection === item.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                }
            </button>

            <AnimatePresence>
                {item.expand && activeSection === item.id && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ps-expand"
                    >
                        {expandOptions[item.id] === 'colors' ? (
                            <div className="ps-colors">
                                {themeColors.map(tc => (
                                    <button key={tc.color} className={`ps-color-dot ${globalThemeColor === tc.color ? 'active' : ''}`}
                                        style={{ background: tc.color }} onClick={() => updateAppearance({ themeColor: tc.color })}>
                                        {globalThemeColor === tc.color && <Check size={12} color="white" />}
                                    </button>
                                ))}
                            </div>
                        ) : item.id === 'supportMain' ? (
                            <div className="ps-support-options">
                                {(expandOptions[item.id] || []).map(opt => (
                                    <button key={opt.id} className="ps-item" style={{ background: 'var(--glass)', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '8px' }} onClick={opt.action}>
                                        <span className="ps-emoji">{opt.emoji}</span>
                                        <div className="ps-info">
                                            <span className="ps-title">{opt.title}</span>
                                            <span className="ps-desc">{opt.desc}</span>
                                        </div>
                                        <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="ps-options">
                                {(expandOptions[item.id] || []).map(opt => (
                                    <button key={opt.value} className={`ps-option ${opt.active ? 'active' : ''}`} onClick={opt.action}>
                                        {opt.active && <Check size={14} />} {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    const renderSubPage = () => {
        const back = <button className="ps-back-btn" onClick={() => setSubPage(null)}><ArrowLeft size={20} /></button>;
        switch (subPage) {
            case 'changePassword': return (
                <div className="ps-subpage">
                    <div className="ps-subpage-header">{back}<h2>เปลี่ยนรหัสผ่าน</h2></div>
                    <div className="ps-subpage-body">
                        {['current', 'newPass', 'confirm'].map((f, i) => (
                            <div key={f} className="ps-field">
                                <label>{['รหัสปัจจุบัน', 'รหัสใหม่', 'ยืนยันรหัสใหม่'][i]}</label>
                                <input type="password" value={passwordForm[f]} onChange={e => setPasswordForm({ ...passwordForm, [f]: e.target.value })} />
                            </div>
                        ))}
                        <button className="ps-save-btn" onClick={handleChangePassword} disabled={subLoading}>
                            {subLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </div>
            );
            case 'blockedUsers': return (
                <div className="ps-subpage">
                    <div className="ps-subpage-header">{back}<h2>{t('settings.blockedUsers')}</h2></div>
                    <div className="ps-subpage-body">
                        {blockedUsers.length === 0 ? <p style={{ color: 'var(--text-dim)', textAlign: 'center', paddingTop: 40 }}>{t('settings.noBlockedUsers')}</p> :
                            blockedUsers.map(u => (
                                <div key={u.id} className="ps-user-row">
                                    <img src={u.image || `https://ui-avatars.com/api/?name=${u.name}&background=random`} alt={u.name} />
                                    <span>{u.name}</span>
                                    <button onClick={() => {
                                        const updated = blockedUsers.filter(x => x.id !== u.id);
                                        setBlockedUsers(updated);
                                        localStorage.setItem('flare_blocked_users', JSON.stringify(updated));
                                        showNotification('เลิกบล็อกแล้ว', 'success');
                                    }}>{t('settings.unblock')}</button>
                                </div>
                            ))
                        }
                    </div>
                </div>
            );
            case 'about': return (
                <div className="ps-subpage">
                    <div className="ps-subpage-header">{back}<h2>{t('settings.about')}</h2></div>
                    <div className="ps-subpage-body" style={{ textAlign: 'center' }}>
                        <img src="/Gemini_Generated_Image_ybdaz3ybdaz3ybda.png" alt="Flare" style={{ width: 80, borderRadius: 20, marginBottom: 16 }} />
                        <h3 style={{ color: 'var(--text-main)' }}>Flare Social</h3>
                        <p style={{ color: 'var(--text-dim)' }}>Version 2.1.0</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 20 }}>© 2025 Flare Inc.</p>
                    </div>
                </div>
            );
            case 'helpCenter': return (
                <div className="ps-subpage">
                    <div className="ps-subpage-header">{back}<h2>{t('settings.helpCenter')}</h2></div>
                    <div className="ps-subpage-body">
                        {[['เปลี่ยนรหัสผ่านอย่างไร?', 'ตั้งค่า > บัญชี > เปลี่ยนรหัสผ่าน'],
                            ['Soul Profile คืออะไร?', 'โปรไฟล์แยกสำหรับหาเพื่อนใหม่โดยไม่กระทบโปรไฟล์หลัก'],
                            ['ติดต่อทีมงาน', 'support@flaresocial.com']
                        ].map(([q, a]) => (
                            <div key={q} style={{ marginBottom: 20 }}>
                                <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>{q}</strong>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{a}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
            case 'termsOfService': return (
                <div className="ps-subpage">
                    <div className="ps-subpage-header">{back}<h2>{t('settings.termsOfService')}</h2></div>
                    <div className="ps-subpage-body" style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                        <h3 style={{ color: 'var(--text-main)', marginBottom: 8 }}>Terms of Service</h3>
                        <p style={{ marginBottom: 12 }}>Welcome to Flare Social. By using our application, you agree to these terms.</p>
                        <h4 style={{ color: 'var(--text-main)', marginBottom: 4 }}>1. Acceptance of Terms</h4>
                        <p style={{ marginBottom: 12 }}>By accessing or using our services, you agree to be bound by these Terms.</p>
                        <h4 style={{ color: 'var(--text-main)', marginBottom: 4 }}>2. User Content</h4>
                        <p style={{ marginBottom: 12 }}>You retain your rights to any content you submit, post or display on or through the Services.</p>
                        <h4 style={{ color: 'var(--text-main)', marginBottom: 4 }}>3. Acceptable Use</h4>
                        <p style={{ marginBottom: 12 }}>You agree not to use the service for any unlawful purpose or in any way that interrupts, damages, or impairs the service.</p>
                        <h4 style={{ color: 'var(--text-main)', marginBottom: 4 }}>4. Dispute Resolution</h4>
                        <p style={{ marginBottom: 12 }}>Any disputes will be resolved through binding arbitration.</p>
                    </div>
                </div>
            );
            case 'privacyPolicy': return (
                <div className="ps-subpage">
                    <div className="ps-subpage-header">{back}<h2>{t('settings.privacyPolicy')}</h2></div>
                    <div className="ps-subpage-body" style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                        <h3 style={{ color: 'var(--text-main)', marginBottom: 8 }}>Privacy Policy</h3>
                        <p style={{ marginBottom: 12 }}>Your privacy is important to us. This policy outlines how we handle your data.</p>
                        <h4 style={{ color: 'var(--text-main)', marginBottom: 4 }}>1. Information We Collect</h4>
                        <p style={{ marginBottom: 12 }}>We collect information you provide directly to us, such as when you create an account, update your profile, or use our services.</p>
                        <h4 style={{ color: 'var(--text-main)', marginBottom: 4 }}>2. How We Use Information</h4>
                        <p style={{ marginBottom: 12 }}>We use the information we collect to provide, maintain, and improve our services, and to protect us and our users.</p>
                        <h4 style={{ color: 'var(--text-main)', marginBottom: 4 }}>3. Information Sharing</h4>
                        <p style={{ marginBottom: 12 }}>We do not share your personal information with third parties except as described in this privacy policy.</p>
                    </div>
                </div>
            );
            default: return (
                <div className="ps-subpage">
                    <div className="ps-subpage-header">{back}<h2>{subPage}</h2></div>
                    <div className="ps-subpage-body">
                        <p style={{ color: 'var(--text-dim)', textAlign: 'center', paddingTop: 40 }}>ฟีเจอร์นี้กำลังพัฒนา 🚧</p>
                    </div>
                </div>
            );
        }
    };

    return (
        <>
            {sections.map(section => (
                <div key={section.id}>
                    <div className="section-label">{section.emoji} {section.title}</div>
                    <div className="menu-list-card ps-section-card">
                        {section.items.map(renderItem)}
                    </div>
                </div>
            ))}

            {/* Logout / Delete */}
            <div className="section-label">⚠️ {language === 'th' ? 'การจัดการบัญชี' : 'Account'}</div>
            <div className="menu-list-card" style={{ marginBottom: 30 }}>
                <button className="ps-item" onClick={() => setShowLogoutConfirm(true)}>
                    <span className="ps-emoji">🚪</span>
                    <div className="ps-info"><span className="ps-title" style={{ color: '#f97316' }}>{t('settings.logout')}</span><span className="ps-desc">{t('settings.logoutDesc')}</span></div>
                    <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
                </button>
                <button className="ps-item" onClick={() => setShowDeleteConfirm(true)}>
                    <span className="ps-emoji">🗑️</span>
                    <div className="ps-info"><span className="ps-title" style={{ color: '#ef4444' }}>{t('settings.deleteAccount')}</span><span className="ps-desc">{t('settings.deleteAccountDesc')}</span></div>
                    <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
                </button>
            </div>

            <div style={{ textAlign: 'center', paddingBottom: 20, color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                Flare Social v2.1.0 • © 2025 Flare Inc.
            </div>

            {/* Sub-page overlay */}
            <AnimatePresence>
                {subPage && (
                    <motion.div className="ps-subpage-overlay" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
                        {renderSubPage()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Profile overlay */}
            {isEditingProfile && (
                <div className="soul-edit-overlay">
                    <SoulProfileSetup user={user} initialData={user.soulProfile || user.soul_profile}
                        onComplete={() => { setIsEditingProfile(false); if (onUpdateUser) api.get('/users/profile').then(onUpdateUser); }} />
                    <button className="close-edit-btn" onClick={() => setIsEditingProfile(false)}><X size={24} /></button>
                </div>
            )}

            {/* Logout confirm */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
                        <motion.div className="confirm-modal glass-panel" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
                            <h3 style={{ color: 'var(--text-main)', marginBottom: 8 }}>{t('settings.logout')}?</h3>
                            <p style={{ color: 'var(--text-dim)', marginBottom: 24, textAlign: 'center' }}>{t('settings.logoutDesc')}</p>
                            <div className="modal-actions">
                                <button className="btn-cancel" onClick={() => setShowLogoutConfirm(false)}>{t('common.cancel')}</button>
                                <button className="btn-danger" onClick={() => { setShowLogoutConfirm(false); onLogout(); }}>{t('settings.logout')}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete confirm */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                        <motion.div className="confirm-modal glass-panel" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
                            <h3 style={{ color: '#ef4444', marginBottom: 8 }}>{t('settings.deleteAccount')}?</h3>
                            <p style={{ color: 'var(--text-dim)', marginBottom: 24, textAlign: 'center' }}>{t('settings.deleteAccountDesc')}</p>
                            <div className="modal-actions">
                                <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>{t('common.cancel')}</button>
                                <button className="btn-danger" style={{ background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }} onClick={async () => {
                                    try { await api.delete('/users/profile'); showNotification('ลบบัญชีสำเร็จ', 'success'); setTimeout(() => onLogout(), 2000); }
                                    catch (err) { showNotification(err.message, 'error'); }
                                    setShowDeleteConfirm(false);
                                }}>{t('settings.deleteAccount')}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .ps-section-card { overflow: visible; }
                .ps-item {
                    width: 100%; display: flex; align-items: center; gap: 14px;
                    padding: 13px 16px; background: none; border: none;
                    border-bottom: 1px solid var(--glass-border);
                    color: var(--text-main); cursor: pointer; text-align: left;
                    -webkit-tap-highlight-color: transparent;
                }
                .ps-item:last-child { border-bottom: none; }
                .ps-item:active { background: var(--glass); }
                .ps-emoji { font-size: 1.2rem; width: 28px; text-align: center; flex-shrink: 0; }
                .ps-info { flex: 1; min-width: 0; }
                .ps-title { display: block; font-size: 0.88rem; font-weight: 600; color: var(--text-main); }
                .ps-desc { display: block; font-size: 0.72rem; color: var(--text-dim); margin-top: 2px; }
                .ps-toggle {
                    width: 44px; height: 24px; border-radius: 12px;
                    background: var(--glass-border); flex-shrink: 0;
                    display: flex; align-items: center; padding: 2px;
                    cursor: pointer; transition: background 0.2s;
                }
                .ps-toggle.active { background: var(--primary, #a855f7); justify-content: flex-end; }
                .ps-toggle-thumb {
                    width: 20px; height: 20px; border-radius: 50%; background: var(--text-main);
                    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                }
                .ps-expand { overflow: hidden; padding: 0 16px 10px; background: rgba(0,0,0,0.05); }
                .theme-dark .ps-expand { background: rgba(0,0,0,0.2); }
                .ps-options { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 10px; }
                .ps-option {
                    display: flex; align-items: center; gap: 6px;
                    padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;
                    border: 1px solid var(--glass-border); background: var(--glass); color: var(--text-main); cursor: pointer;
                }
                .ps-option.active { background: var(--primary, #a855f7); border-color: var(--primary, #a855f7); color: white; }
                .ps-colors { display: flex; gap: 10px; padding-top: 10px; flex-wrap: wrap; }
                .ps-color-dot {
                    width: 34px; height: 34px; border-radius: 50%; border: 3px solid transparent;
                    display: flex; align-items: center; justify-content: center; cursor: pointer;
                }
                .ps-color-dot.active { border-color: var(--text-main); }

                /* Sub-page overlay */
                .ps-subpage-overlay {
                    position: fixed; inset: 0; z-index: 3000;
                    background: var(--bg-dark); overflow-y: auto;
                }
                .ps-subpage { display: flex; flex-direction: column; min-height: 100vh; }
                .ps-subpage-header {
                    display: flex; align-items: center; gap: 16px;
                    padding: 52px 20px 16px;
                    border-bottom: 1px solid var(--glass-border);
                    background: var(--glass);
                    position: sticky; top: 0;
                }
                .ps-subpage-header h2 { font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin: 0; }
                .ps-back-btn {
                    width: 36px; height: 36px; border-radius: 12px;
                    background: var(--glass); border: 1px solid var(--glass-border);
                    color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer;
                }
                .ps-subpage-body { padding: 24px 20px; flex: 1; }
                .ps-field { margin-bottom: 16px; }
                .ps-field label { display: block; font-size: 0.8rem; color: var(--text-dim); margin-bottom: 6px; }
                .ps-field input {
                    width: 100%; padding: 12px 16px; background: var(--glass);
                    border: 1px solid var(--glass-border); border-radius: 12px;
                    color: var(--text-main); outline: none; font-size: 0.9rem;
                }
                .ps-save-btn {
                    width: 100%; padding: 14px; background: var(--primary, #a855f7);
                    border: none; border-radius: 14px; color: white;
                    font-weight: 700; font-size: 0.95rem; cursor: pointer; margin-top: 8px;
                }
                .ps-user-row {
                    display: flex; align-items: center; gap: 12px; padding: 12px 0;
                    border-bottom: 1px solid var(--glass-border);
                }
                .ps-user-row img { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; }
                .ps-user-row span { flex: 1; color: var(--text-main); font-weight: 600; }
                .ps-user-row button {
                    padding: 6px 14px; border-radius: 10px; font-size: 0.8rem;
                    background: var(--glass); border: 1px solid var(--glass-border); color: var(--text-main); cursor: pointer;
                }

                /* Reuse from UserProfile */
                .modal-overlay { position: fixed; inset: 0; z-index: 4000; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; }
                .confirm-modal { margin: 20px; padding: 28px 22px; border-radius: 22px; background: var(--bg-light); border: 1px solid var(--glass-border); width: 100%; max-width: 320px; text-align: center; }
                .modal-actions { display: flex; gap: 12px; }
                .btn-cancel { flex: 1; height: 44px; background: var(--glass); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text-main); font-weight: 700; cursor: pointer; }
                .btn-danger { flex: 1; height: 44px; background: rgba(249,115,22,0.15); border: 1px solid rgba(249,115,22,0.3); border-radius: 12px; color: #f97316; font-weight: 700; cursor: pointer; }
                .soul-edit-overlay { position: fixed; inset: 0; background: #0a0a14; z-index: 3500; display: flex; flex-direction: column; overflow-y: auto; }
                .close-edit-btn { position: absolute; top: 20px; right: 20px; z-index: 3600; width: 44px; height: 44px; background: rgba(0,0,0,0.5); border: 1px solid var(--glass-border); border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; }
            `}</style>
        </>
    );
};

export default ProfileSettings;

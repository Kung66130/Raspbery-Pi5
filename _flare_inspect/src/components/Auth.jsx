import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { Mail, Lock, User as UserIcon, Chrome, Eye, EyeOff, X, CircleUser, Ticket, Phone } from 'lucide-react';
// import { ShieldCheck } from 'lucide-react'; // Unused OTP icon backup
import { useNotification } from './NotificationSystem';
import BrandLogo from './BrandLogo';
import { supabase } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import FloatingBackground from './FloatingBackground';

const Auth = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ email: '', password: '', name: '', username: '', referralCode: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [signupMethod, setSignupMethod] = useState('phone');
    // OTP State (Moved to Backup)
    // const [useOtp, setUseOtp] = useState(false);
    // const [otpStep, setOtpStep] = useState('request'); 
    // const [otpCode, setOtpCode] = useState('');
    const [legalModal, setLegalModal] = useState({ isOpen: false, type: null }); // 'terms' or 'privacy'
    const { showNotification } = useNotification();
    const { t } = useLanguage();

    React.useEffect(() => {
        // Handle Deep Links (for social login redirects)
        const setupDeepLink = async () => {
            if (Capacitor.isNativePlatform()) {
                App.addListener('appUrlOpen', async (event) => {
                    console.log('App opened with URL:', event.url);
                    const url = new URL(event.url);

                    // The URL will have a fragment like #access_token=...
                    // Supabase can parse this if we pass it correctly
                    if (event.url.includes('access_token')) {
                        const { data, error } = await supabase.auth.setSession({
                            access_token: url.hash.split('access_token=')[1].split('&')[0],
                            refresh_token: url.hash.split('refresh_token=')[1].split('&')[0],
                        });

                        if (error) console.error('Error setting session from deep link:', error);
                    }
                    // Close the browser if it's still open
                    await Browser.close();
                });
            }
        };

        setupDeepLink();

        // Use onAuthStateChange for more reliable OAuth detection
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                try {
                    setLoading(true);
                    console.log("Google user detected, syncing with backend...", session.user.email);

                    const syncData = await api.post('/auth/google-sync', {
                        email: session.user.email,
                        name: session.user.user_metadata.full_name || session.user.email.split('@')[0],
                        image: session.user.user_metadata.avatar_url,
                        id: session.user.id
                    });

                    api.setToken(syncData.token);
                    localStorage.setItem('flare_user', JSON.stringify(syncData.user));
                    showNotification(`Welcome, ${syncData.user.name}! 🌟`, "success");

                    // Sign out from Supabase because we use our own JWT system
                    await supabase.auth.signOut();
                    onAuthSuccess(syncData.user);
                } catch (err) {
                    console.error("Google Sync error:", err);
                    showNotification(`Login failed: ${err.message}`, "error");
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setError('');

            const redirectTo = Capacitor.isNativePlatform()
                ? 'com.flare.social://login-callback'
                : window.location.origin;

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    skipBrowserRedirect: Capacitor.isNativePlatform()
                }
            });

            if (error) throw error;

            if (Capacitor.isNativePlatform() && data?.url) {
                // This fix avoids the "disallowed_useragent" error by using the system browser
                await Browser.open({ url: data.url });
            }
        } catch (err) {
            console.error('Google login error:', err);
            setError('Google sign-in failed: ' + err.message);
            setLoading(false);
        }
    };

    /* OTP Functions moved to src/backups/AuthOTP_Backup.js */

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);

        // Manual validation for normal flow
        if (!formData.email || !formData.password) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const data = await api.post(endpoint, formData);
            api.setToken(data.token);
            localStorage.setItem('flare_user', JSON.stringify(data.user));

            // Welcome notification for new users only
            if (!isLogin) {
                showNotification(`✨ ยินดีต้อนรับคุณ ${data.user.name} สู่ครอบครัว Flare! เราดีใจมากที่คุณมาร่วมสร้างโมเมนต์ดีๆ ไปด้วยกันนะ ขอให้วันนี้เป็นวันที่สดใสครับ 👋❤️`, 'welcome');
            }

            onAuthSuccess(data.user);
        } catch (err) {
            let msg = err.message;
            if (msg.includes('already exists')) {
                msg = 'เบอร์โทรศัพท์หรืออีเมลนี้มีอยู่ในระบบแล้วครับ! กรุณากด "เข้าสู่ระบบ" ด้วยบัญชีเดิมของคุณครับ';
            } else if (msg.includes('Invalid credentials')) {
                msg = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบเบอร์โทร/อีเมล และรหัสผ่านอีกครั้งครับ';
            } else if (msg.includes('Please fill in all fields')) {
                msg = 'กรุณากรอกข้อมูลให้ครบทุกช่องก่อนดำเนินการต่อครับ';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };
    const renderLegalContent = () => {
        if (legalModal.type === 'terms') {
            return (
                <div className="legal-text">
                    <h2>เงื่อนไขการใช้งาน (Terms of Service)</h2>
                    <p>ยินดีต้อนรับสู่ Flare! เมื่อคุณใช้งานแอปพลิเคชันของเรา คุณตกลงที่จะปฏิบัติตามเงื่อนไขดังต่อไปนี้:</p>
                    <ul>
                        <li><strong>การสร้างบัญชี:</strong> คุณต้องให้ข้อมูลที่เป็นจริงและรักษาความปลอดภัยของรหัสผ่านของคุณ</li>
                        <li><strong>เนื้อหาของผู้ใช้:</strong> คุณเป็นเจ้าของเนื้อหาที่คุณโพสต์ แต่คุณให้สิทธิ์เราในการแสดงผลและแชร์เนื้อหานั้นบนแพลตฟอร์ม</li>
                        <li><strong>ข้อห้าม:</strong> ห้ามโพสต์เนื้อหาที่ผิดกฎหมาย, คุกคาม, อนาจาร หรือละเมิดสิทธิ์ของผู้อื่น</li>
                        <li><strong>การยุติการใช้งาน:</strong> เราขอสงวนสิทธิ์ในการระงับหรือลบบัญชีที่ละเมิดกฎการใช้งาน</li>
                    </ul>
                    <p>เรามุ่งสร้างสังคมที่สร้างสรรค์และปลอดภัยสำหรับทุกคน ขอบคุณที่ร่วมเป็นส่วนหนึ่งของ Flare ครับ</p>
                </div>
            );
        } else {
            return (
                <div className="legal-text">
                    <h2>นโยบายความเป็นส่วนตัว (Privacy Policy)</h2>
                    <p>ความเป็นส่วนตัวของคุณคือสิ่งสำคัญที่สุดสำหรับเรา:</p>
                    <ul>
                        <li><strong>ข้อมูลที่เราเก็บ:</strong> เราเก็บข้อมูลโปรไฟล์, รูปภาพ และข้อมูลการใช้งานเพื่อปรับปรุงประสบการณ์ของคุณ</li>
                        <li><strong>การใช้งานข้อมูล:</strong> เราใช้ข้อมูลเพื่อเชื่อมต่อคุณกับเพื่อนใหม่และแสดงเนื้อหาที่น่าสนใจ</li>
                        <li><strong>การแบ่งปันข้อมูล:</strong> เราจะไม่ขายข้อมูลส่วนตัวของคุณให้กับบุคคลที่สามเพื่อจุดประสงค์ทางการค้า</li>
                        <li><strong>ความปลอดภัย:</strong> เราใช้ระบบรักษาความปลอดภัยที่ทันสมัยเพื่อปกป้องข้อมูลของคุณ</li>
                    </ul>
                    <p>คุณสามารถจัดการข้อมูลส่วนตัวและตั้งค่าความเป็นส่วนตัวได้ที่หน้าการตั้งค่าโปรไฟล์ของคุณครับ</p>
                </div>
            );
        }
    };

    if (legalModal.isOpen) {
        return (
            <div className="auth-container">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="legal-page glass-panel"
                >
                    <div className="legal-header page-header">
                        <h2>{legalModal.type === 'terms' ? 'เงื่อนไขการใช้งาน' : 'นโยบายความเป็นส่วนตัว'}</h2>
                        <button
                            className="close-page-btn"
                            onClick={() => setLegalModal({ isOpen: false, type: null })}
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div className="legal-content-scroll">
                        {renderLegalContent()}
                    </div>
                </motion.div>
                <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
                    .legal-page {
                        width: 100%;
                        max-width: 800px;
                        height: 85vh;
                        padding: 40px;
                        display: flex;
                        flex-direction: column;
                        position: relative;
                    }
                    .page-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    }
                    .page-header h2 {
                        margin: 0;
                        font-size: 1.8rem;
                        background: linear-gradient(135deg, var(--primary), #ec4899);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                    .close-page-btn {
                        background: rgba(255,255,255,0.1);
                        border: none;
                        color: white;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .close-page-btn:hover {
                        background: rgba(255,255,255,0.2);
                        transform: rotate(90deg);
                    }
                    .legal-content-scroll {
                        flex: 1;
                        overflow-y: auto;
                        padding-right: 15px;
                    }
                    /* Scrollbar styling */
                    .legal-content-scroll::-webkit-scrollbar {
                        width: 8px;
                    }
                    .legal-content-scroll::-webkit-scrollbar-track {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 4px;
                    }
                    .legal-content-scroll::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 4px;
                    }
                    .legal-content-scroll::-webkit-scrollbar-thumb:hover {
                        background: rgba(255, 255, 255, 0.3);
                    }
                    .legal-text h2 { display: none; } /* Hide duplicate header */
                    .legal-text p, .legal-text li {
                        font-size: 1.1rem;
                        line-height: 1.8;
                        color: #e0e0e0;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <FloatingBackground />
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="auth-card glass-panel"
            >
                <div className="auth-header">
                    <div className="auth-logo-container">
                        <BrandLogo size={120} animated={true} showText={true} />
                    </div>
                    <h1>{isLogin ? t('auth.welcomeBack') : t('auth.joinFlare')}</h1>
                    <p>{isLogin ? t('auth.signInContinue') : t('auth.startSharing')}</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <>
                            <div className="signup-method">
                                <p className="method-title">สมัครผ่านช่องทางไหน?</p>
                                <div className="method-options">
                                    <button
                                        type="button"
                                        className={`method-card ${signupMethod === 'phone' ? 'active' : ''}`}
                                        onClick={() => setSignupMethod('phone')}
                                    >
                                        <Phone size={20} />
                                        <div className="method-text">
                                            <span>เบอร์มือถือ</span>
                                            <small>รับรหัสยืนยันทาง SMS</small>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`method-card ${signupMethod === 'email' ? 'active' : ''}`}
                                        onClick={() => setSignupMethod('email')}
                                    >
                                        <Mail size={20} />
                                        <div className="method-text">
                                            <span>?????</span>
                                            <small>รับลิงก์ยืนยันในกล่องจดหมาย</small>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="input-group">
                        {(!isLogin && signupMethod === 'phone') ? <Phone size={20} /> : <Mail size={20} />}
                        <input
                            type={!isLogin && signupMethod === 'phone' ? 'tel' : (!isLogin && signupMethod === 'email' ? 'email' : 'text')}
                            placeholder={!isLogin ? (signupMethod === 'phone' ? '\u0e40\u0e1a\u0e2d\u0e23\u0e4c\u0e21\u0e37\u0e2d\u0e16\u0e37\u0e2d' : '\u0e2d\u0e35\u0e40\u0e21\u0e25') : t('auth.email')}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="input-group">
                        <Lock size={20} />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder={t('auth.password')}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <button
                            type="button"
                            className="eye-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {isLogin && (
                        <div className="forgot-password">
                            <span onClick={() => showNotification("Functionality coming soon! Please stay tuned. 🔑", "info")}>
                                {t('auth.forgotPassword') || 'ลืมรหัสผ่าน?'}
                            </span>
                        </div>
                    )}

                    {!isLogin && (
                        <div className="terms-checkbox">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                            />
                            <label htmlFor="terms">
                                ยอมรับ <span className="link" onClick={(e) => { e.preventDefault(); setLegalModal({ isOpen: true, type: 'terms' }); }}>เงื่อนไขการใช้งาน</span> และ <span className="link" onClick={(e) => { e.preventDefault(); setLegalModal({ isOpen: true, type: 'privacy' }); }}>นโยบายความเป็นส่วนตัว</span>
                            </label>
                        </div>
                    )}



                    {error && <p className="error-message">{error}</p>}

                    <button
                        type="submit"
                        className={`auth-submit btn-primary ${(!isLogin && !acceptedTerms) ? 'disabled' : ''}`}
                        disabled={loading || (!isLogin && !acceptedTerms)}
                    >
                        {loading ? t('auth.processing') : (isLogin ? t('auth.signIn') : t('auth.createAccount'))}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>{t('auth.orContinueWith')}</span>
                </div>

                <div className="social-auth">
                    <button onClick={handleGoogleLogin} className="social-btn google" disabled={loading} style={{ gridColumn: '1 / -1' }}>
                        <Chrome size={20} />
                        Google
                    </button>
                </div>

                <div className="auth-footer">
                    <p>
                        {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}
                        <span onClick={() => setIsLogin(!isLogin)} className="toggle-auth-link">
                            {isLogin ? t('auth.signUp') : t('auth.signIn')}
                        </span>
                    </p>
                </div>
            </motion.div>

            {/* Legal Modal */}
            {legalModal.isOpen && (
                <motion.div
                    className="legal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setLegalModal({ isOpen: false, type: null })}
                >
                    <motion.div
                        className="legal-modal glass-panel"
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="legal-modal-content">
                            {renderLegalContent()}
                            <button
                                className="btn-primary"
                                style={{ marginTop: '20px', width: '100%' }}
                                onClick={() => setLegalModal({ isOpen: false, type: null })}
                            >
                                เข้าใจแล้ว
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
                .auth-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 20px;
                    background: radial-gradient(circle at 15% 10%, rgba(255, 199, 95, 0.25), transparent 45%),
                                radial-gradient(circle at 85% 20%, rgba(96, 165, 250, 0.18), transparent 50%),
                                linear-gradient(135deg, #0b0c10 0%, #1b1233 40%, #250b2d 100%);
                    font-family: "Space Grotesk", "Plus Jakarta Sans", sans-serif;
                    position: relative;
                    overflow: hidden;
                }
                .auth-container::before {
                    content: "";
                    position: absolute;
                    inset: -20%;
                    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.08), transparent 45%),
                                radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.06), transparent 50%);
                    pointer-events: none;
                    filter: blur(6px);
                }
                .auth-card {
                    width: 100%;
                    max-width: 460px;
                    padding: 40px 36px;
                    text-align: center;
                    border-radius: 28px;
                    background: linear-gradient(135deg, rgba(24, 19, 38, 0.85), rgba(20, 11, 32, 0.9));
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
                    position: relative;
                    z-index: 1;
                }
                .auth-header {
                    margin-bottom: 30px;
                }
                .auth-logo-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    filter: drop-shadow(0 0 20px var(--primary-glow));
                    animation: float 6s ease-in-out infinite;
                }
                .auth-header h1 { font-size: 2rem; margin-bottom: 8px; letter-spacing: -0.02em; }
                .auth-header p { color: var(--text-muted); font-size: 0.95rem; }

                .auth-form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    width: 100%;
                }
                .signup-method {
                    text-align: left;
                    padding: 8px 0 6px;
                }
                .method-title {
                    margin: 0 0 10px;
                    font-size: 0.9rem;
                    color: rgba(255,255,255,0.7);
                    letter-spacing: 0.01em;
                }
                .method-options {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .method-card {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 14px;
                    border-radius: 16px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    color: white;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .method-card small {
                    display: block;
                    font-size: 0.75rem;
                    color: rgba(255,255,255,0.5);
                }
                .method-card.active {
                    border-color: rgba(255, 199, 95, 0.7);
                    box-shadow: 0 0 0 1px rgba(255, 199, 95, 0.2), 0 10px 25px rgba(255, 199, 95, 0.15);
                    background: linear-gradient(135deg, rgba(255, 199, 95, 0.18), rgba(255, 255, 255, 0.02));
                }
                .method-card:hover:not(.active) {
                    border-color: rgba(255,255,255,0.2);
                    transform: translateY(-2px);
                }
                .input-group {
                    position: relative;
                    width: 100%;
                    box-sizing: border-box;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    height: 52px; /* ปรับความสูงให้ดูเพรียวขึ้น */
                    display: flex;
                    align-items: center;
                    transition: all 0.3s ease;
                    overflow: hidden; /* บังคับให้อยู่ในขอบเส้น */
                }
                .input-group:focus-within {
                   border-color: rgba(255, 199, 95, 0.7);
                   background: rgba(255, 255, 255, 0.08);
                   box-shadow: 0 0 0 1px rgba(255, 199, 95, 0.2), 0 15px 35px rgba(0, 0, 0, 0.3);
                }
                .input-group svg:first-child {
                    margin-left: 18px; /* เว้นระยะจากขอบเส้นด้านซ้ายให้พอดีกับความโค้ง */
                    color: rgba(255, 255, 255, 0.5);
                    flex-shrink: 0;
                }
                .input-group input {
                    flex: 1;
                    height: 100%;
                    background: transparent;
                    border: none;
                    outline: none;
                    color: white;
                    padding: 0 14px;
                    font-size: 16px;
                    width: 100%;
                }
                .eye-toggle {
                    height: 100%;
                    width: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: none !important; /* บังคับให้ไม่มีพื้นหลังสีเทา */
                    border: none;
                    color: rgba(255, 255, 255, 0.4);
                    cursor: pointer;
                    margin-right: 4px; /* ระยะห่างจากขอบเส้นด้านใน */
                    transition: all 0.2s;
                    -webkit-tap-highlight-color: transparent;
                }
                .eye-toggle:hover {
                    color: white;
                }
                .eye-toggle svg {
                    opacity: 0.8;
                }
                .forgot-password {
                    display: flex;
                    justify-content: flex-end;
                    padding-right: 4px;
                    width: 100%;
                    margin-top: -8px;
                }
                .forgot-password span {
                    font-size: 0.85rem;
                    background: linear-gradient(135deg, var(--primary), #ec4899);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    opacity: 0.85;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 600;
                }
                .forgot-password span:hover {
                    opacity: 1;
                    filter: brightness(1.2);
                }
                .terms-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    text-align: left;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    margin-top: 5px;
                }
                .terms-checkbox input {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                .terms-checkbox label {
                    cursor: pointer;
                    line-height: 1.4;
                }
                .terms-checkbox .link {
                    color: var(--primary);
                    text-decoration: underline;
                }
                .input-group input:focus {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: var(--primary);
                    box-shadow: 0 0 10px var(--primary-glow);
                }
                .error-message {
                    color: #FF4081;
                    font-size: 0.85rem;
                    text-align: left;
                }
                .auth-submit {
                    margin-top: 10px;
                    padding: 14px;
                    font-size: 1rem;
                    font-weight: 600;
                    transition: all 0.3s;
                }
                .auth-submit.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    filter: grayscale(1);
                }
                .auth-footer {
                    margin-top: 15px;
                    font-size: 0.9rem;
                    color: var(--text-muted);
                }
                .auth-footer span {
                    color: var(--primary);
                    font-weight: 600;
                    cursor: pointer;
                    margin-left: 5px;
                }
                .auth-footer span:hover { text-decoration: underline; }

                .auth-divider {
                    display: flex;
                    align-items: center;
                    margin: 18px 0;
                    color: var(--text-dim);
                    font-size: 0.85rem;
                }
                .auth-divider::before, .auth-divider::after {
                    content: "";
                    flex: 1;
                    height: 1px;
                    background: rgba(255,255,255,0.1);
                    margin: 0 10px;
                }
                
                .social-auth {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 18px;
                }
                .social-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.05);
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                }
                .social-btn:hover:not(:disabled) {
                    background: rgba(255,255,255,0.1);
                    border-color: rgba(255,255,255,0.2);
                    transform: translateY(-2px);
                }
                .social-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .social-btn.google:hover { border-color: #4285F4; color: #4285F4; }
                .social-btn.otp:hover { border-color: var(--primary); color: var(--primary); }

                /* Hide default password eye in Edge and Chrome */
                input[type="password"]::-ms-reveal,
                input[type="password"]::-ms-clear {
                    display: none;
                }
                input[type="password"]::-webkit-textfield-decoration-container {
                    visibility: hidden;
                }
            `}</style>

        </div>
    );
};

export default Auth;

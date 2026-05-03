// ------------------------------------------------------------------
// BACKUP: Google Authentication Feature
// ------------------------------------------------------------------
// ฟังก์ชันนี้รองรับการเข้าสู่ระบบผ่าน Google OAuth ด้วย Supabase
// เคยอยู่ในไฟล์: src/components/Auth.jsx
// ------------------------------------------------------------------

/* 
  1. IMPORTS & DEPENDENCIES:
  import { Chrome } from 'lucide-react';
  import { supabase } from '../services/supabase';
*/

/* 
  2. FUNCTIONS (นำกลับไปวางใน Component Auth):
*/

const handleGoogleLogin = async () => {
    try {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    } catch (err) {
        setError('Google sign-in failed: ' + err.message);
        setLoading(false);
    }
};

/* 
  3. SESSION CHECK (useEffect):
  // ส่วนนี้ใช้สำหรับตรวจสอบเมื่อ user ถูก redirect กลับมาจาก Google
*/
/*
    React.useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                try {
                    setLoading(true);
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
                    console.error("Sync error:", err);
                } finally {
                    setLoading(false);
                }
            }
        };
        checkSession();
    }, []);
*/

/* 
  4. JSX PARTS (ปุ่ม Google และ Divider):
*/

/*
<div className="auth-divider">
    <span>{t('auth.orContinueWith')}</span>
</div>

<div className="social-auth">
    <button onClick={handleGoogleLogin} className="social-btn google" disabled={loading} style={{ gridColumn: '1 / -1' }}>
        <Chrome size={20} />
        Google
    </button>
</div>
*/

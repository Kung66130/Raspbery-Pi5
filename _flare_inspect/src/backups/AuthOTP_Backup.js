// ------------------------------------------------------------------
// BACKUP: OTP Authentication Feature (Email & Phone)
// ------------------------------------------------------------------
// ฟังก์ชันนี้รองรับการส่งและยืนยัน OTP ทั้งทางอีเมลและเบอร์โทรศัพท์ (Simulation Mode)
// เคยอยู่ในไฟล์: src/components/Auth.jsx
// ------------------------------------------------------------------

/* 
  1. STATE ที่ต้องใช้:
  const [useOtp, setUseOtp] = useState(false);
  const [otpStep, setOtpStep] = useState('request'); // 'request' or 'verify'
  const [otpCode, setOtpCode] = useState('');
*/

/* 
  2. FUNCTIONS (นำสไปวางใน Component Auth):
*/

const handleSendOtp = async () => {
    if (!formData.email) return setError('Please enter your email or phone number');
    setLoading(true);
    try {
        await api.post('/auth/otp/send', { email: formData.email });
        setOtpStep('verify');
        showNotification("Verification code sent! (Check Console for Demo) 📧", "info");
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
};

const handleVerifyOtp = async () => {
    if (!otpCode) return setError('Please enter the code');
    setLoading(true);
    try {
        const data = await api.post('/auth/otp/verify', {
            email: formData.email,
            code: otpCode,
            name: formData.name
        });
        api.setToken(data.token);
        localStorage.setItem('flare_user', JSON.stringify(data.user));
        showNotification(`Welcome back, ${data.user.name}! ✨`, "success");
        onAuthSuccess(data.user);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
};

/*
  3. JSX PARTS (ส่วนที่แสดงผล):
*/

// ส่วน Input สำหรับกรอก OTP (วางใน Form)
/*
{useOtp && otpStep === 'verify' && (
    <div className="input-group">
        <ShieldCheck size={20} />
        <input
            type="text"
            placeholder={t('auth.sixDigitCode')}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            maxLength={6}
        />
    </div>
)}
*/

// ปุ่มกดสลับโหมด (วางในส่วน social-auth)
/*
<button onClick={() => { setUseOtp(!useOtp); setOtpStep('request'); setError(''); }} className="social-btn otp" disabled={loading}>
    <ShieldCheck size={20} />
    {useOtp ? t('auth.usePassword') : t('auth.emailOtp')}
</button>
*/

// ปรับแต่งปุ่ม Submit (เมื่อใช้ OTP)
/*
<button type="submit" ... >
    {loading ? t('auth.processing') : (
        useOtp
            ? (otpStep === 'request' ? t('auth.sendCode') : t('auth.verifyCode'))
            : (isLogin ? t('auth.signIn') : t('auth.createAccount'))
    )}
</button>
*/

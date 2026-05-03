import React, { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Geolocation } from '@capacitor/geolocation'
import {
  Home as HomeIcon,
  Search,
  Sparkles,
  MessageCircle,
  User as UserIcon,
  X
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import SoulGame from './components/SoulGame'
import MomentsFeed from './components/MomentsFeed'
import Discover from './components/Discover'
import Auth from './components/Auth'
import UserProfile from './components/UserProfile'
import SoulProfileSetup from './components/SoulProfileSetup'
import CreatePostModal from './components/CreatePostModal'
import SoulChatContainer from './components/SoulChatContainer'
// Settings embedded in UserProfile
import { api } from './services/api'
import { NotificationProvider, useNotification } from './components/NotificationSystem'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { AppearanceProvider } from './contexts/AppearanceContext'
import { supabase } from './services/supabase'

export default function App() {
  return (
    <AppearanceProvider>
      <LanguageProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </LanguageProvider>
    </AppearanceProvider>
  )
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('soul')
  const [user, setUser] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [selectedUserId, setSelectedUserId] = useState(null)
  const [directChatUser, setDirectChatUser] = useState(null) // New state for direct messaging
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [locationGranted, setLocationGranted] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const { showNotification, clearHistory } = useNotification()
  const { t } = useLanguage()

  const handleMessageClick = (profileUser) => {
    setSelectedUserId(null);
    setDirectChatUser({ ...profileUser, forceReveal: true });
    setActiveTab('chat');
  };

  const handleMatch = (partner) => {
    // Navigate to chat tab and open conversation with matched partner
    setDirectChatUser({ ...partner, forceReveal: true });
    setActiveTab('chat');
  };

  useEffect(() => {
    let appListener;

    // Dynamically import Capacitor App to use backButton listener safely
    import('@capacitor/app').then(({ App }) => {
      appListener = App.addListener('backButton', ({ canGoBack }) => {
        if (selectedUserId) {
          setSelectedUserId(null);
        } else if (showCreateModal) {
          setShowCreateModal(false);
        } else if (activeTab !== 'soul') {
          setActiveTab('soul');
        } else {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        }
      });
    }).catch(err => {
      console.warn('Failed to load @capacitor/app plugin. Back button handling may not work.', err);
    });

    return () => {
      if (appListener) {
        appListener.then(handle => handle.remove());
      }
    };
  }, [activeTab, showCreateModal, selectedUserId]);

  // Request location right after login is verified
  useEffect(() => {
    if (user && !locationGranted) {
      const getDeviceLocation = async () => {
        try {
          if (Capacitor.isNativePlatform()) {
            // Check native permissions
            let perm = await Geolocation.checkPermissions();
            if (perm.location !== 'granted') {
              // Request native permissions - this triggers the system popup!
              perm = await Geolocation.requestPermissions();
            }

            if (perm.location === 'granted') {
              const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
              try {
                const { latitude, longitude } = position.coords;
                await api.post('/users/location', { latitude, longitude });
                console.log('[App] Initial location saved via Capacitor');
              } catch (err) {
                 console.warn('[App] Location save error on backend, ignoring to let user in');
              }
              setLocationGranted(true);
            } else {
              setLocationError('คุณจำเป็นต้องอนุญาตการเข้าถึงตำแหน่งที่ตั้ง (Location) เพื่อใช้งานระบบหาเพื่อนรอบตัวในแอปพลิเคชันของเรา');
            }
          } else {
            // Browser fallback
            if ('geolocation' in navigator) {
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  try {
                    const { latitude, longitude } = position.coords;
                    await api.post('/users/location', { latitude, longitude });
                    console.log('[App] Initial location saved via Browser Browser API');
                  } catch (err) {
                     console.warn('[App] Location save error, perhaps DB fields missing, ignoring to let user in');
                  }
                  setLocationGranted(true);
                },
                (error) => {
                  console.error('[App] Geolocation denied:', error);
                  setLocationError('คุณจำเป็นต้องอนุญาตการเข้าถึงตำแหน่งที่ตั้ง (Location) เพื่อใช้งานระบบหาเพื่อนรอบตัวในแอปพลิเคชันของเรา');
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
              );
            } else {
              setLocationError('อุปกรณ์/เบราว์เซอร์ของคุณไม่รองรับ GPS');
            }
          }
        } catch (err) {
           console.error('[App] Geolocation critical error:', err);
           setLocationError('ไม่สามารถเข้าถึงตำแหน่งที่ตั้งได้ กรุณาตรวจสอบการตั้งค่าอุปกรณ์ของคุณ');
        }
      };

      getDeviceLocation();
    }
  }, [user, locationGranted]);

  useEffect(() => {
    if (!user) return;

    // Real-time subscription for overall user events (like new messages)
    const channel = supabase.channel(`user_events:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, async (payload) => {
        // If we are NOT in the chat room with this person, show notification
        const currentChatPartnerId = localStorage.getItem('flare_active_chat_partner');
        
        if (currentChatPartnerId !== String(payload.new.sender_id)) {
          try {
            const sender = await api.get(`/users/${payload.new.sender_id}/minimal`);
            showNotification(
              payload.new.text || "ส่งรูปภาพถึงคุณ", 
              'message', 
              'chat', 
              { 
                title: `ข้อความจาก ${sender.name}`,
                sender_id: sender.id
              }
            );
          } catch (err) {
             showNotification("คุณมีข้อความใหม่", 'message');
          }
          if (activeTab === 'chat') {
            setRefreshTrigger(prev => prev.refreshTrigger + 1);
          }
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
        filter: `user1_id=eq.${user.id}`
      }, (payload) => {
        showNotification("คุณมีการแมตช์ใหม่! ❤️", "match");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeTab, showNotification]);

  useEffect(() => {
    const init = async () => {
      // Request Notification Permissions if on Native Platform
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await LocalNotifications.checkPermissions();
          if (perm.display !== 'granted') {
            await LocalNotifications.requestPermissions();
          }
        } catch (err) {
          console.warn('Native notification request error:', err);
        }
      }

      // Force loading to finish after 3 seconds even if API fails
      setTimeout(() => setInitialized(true), 3000);

      const savedUser = localStorage.getItem('flare_user')
      const token = api.getToken()

      if (token) {
        try {
          const latestUser = await api.get('/users/profile');
          setUser(latestUser);
          localStorage.setItem('flare_user', JSON.stringify(latestUser));
        } catch (err) {
          console.error('Failed to sync profile:', err);
          if (savedUser) {
            const u = JSON.parse(savedUser);
            setUser(u);
          }
        }
      }
      setInitialized(true);
    };
    init();
  }, []);

  const handleAuthSuccess = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    api.clearToken()
    localStorage.removeItem('flare_user')
    localStorage.removeItem('flare_notif_history')
    clearHistory()
    setUser(null)
  }

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('flare_user', JSON.stringify(updatedUser)); // จดจำข้อมูลลงเครื่องทันที
  }

  const handlePostSuccess = (newPost) => {
    setRefreshTrigger(prev => prev + 1)
  }

  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a14', color: 'white' }}>
        Loading App...
      </div>
    )
  }

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />
  }

  // Force profile setup if profileComplete is not set
  // Check both camelCase and snake_case, and also consider soulProfile as evidence of completion
  const isProfileComplete = 
    Number(user.profileComplete) === 1 || 
    Number(user.profile_complete) === 1 || 
    (user.soulProfile && user.soulProfile.displayName);

  if (user && !isProfileComplete) {
    console.log('[App] Profile NOT complete, showing setup. user:', {
      profileComplete: user.profileComplete,
      profile_complete: user.profile_complete,
      hasSoulProfile: !!user.soulProfile
    });
    return (
      <div className="page-content soul-page-master" style={{ minHeight: '100vh', background: '#0a0a14' }}>
        <SoulProfileSetup 
          user={user} 
          onComplete={(profile) => {
            const updatedUser = { 
              ...user, 
              soulProfile: profile, 
              profileComplete: 1, 
              profile_complete: 1 
            };
            if (profile.displayName) updatedUser.name = profile.displayName;
            if (profile.imagePreview) updatedUser.image = profile.imagePreview;
            handleUserUpdate(updatedUser);
          }} 
        />
      </div>
    );
  }

  const renderContent = () => {
    return (
      <div className="tab-contents">
        <div style={{ display: activeTab === 'soul' ? 'block' : 'none' }}>
          <SoulGame 
            user={user} 
            onUpdateUser={handleUserUpdate} 
            onOpenSettings={() => setActiveTab('profile')}
            onMatch={handleMatch}
          />
        </div>
        <div style={{ display: activeTab === 'chat' ? 'block' : 'none' }}>
          <SoulChatContainer
            user={user}
            onGoToSoul={() => setActiveTab('soul')}
            externalPartner={directChatUser}
            onClearExternal={() => setDirectChatUser(null)}
          />
        </div>
        <div style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
          <UserProfile
            user={user}
            activeTab={activeTab}
            onLogout={handleLogout}
            onUpdateUser={handleUserUpdate}
            refreshTrigger={refreshTrigger}
            onOpenCreateModal={() => setShowCreateModal(true)}
            onSelectUser={setSelectedUserId}
            onMessageClick={handleMessageClick}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flare-container">
      {renderContent()}

      {showCreateModal && (
        <CreatePostModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onPostSuccess={handlePostSuccess}
        />
      )}

      {/* Someone Else's Profile Modal */}
      <AnimatePresence>
        {selectedUserId && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="full-screen-modal"
            style={{ zIndex: 110, position: 'fixed', inset: 0, background: '#0a0a14', overflowY: 'auto' }}
          >
            <div className="modal-header-simple" style={{ position: 'absolute', top: 20, left: 20, zIndex: 120 }}>
              <button
                onClick={() => setSelectedUserId(null)}
                style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', padding: 10, borderRadius: '50%', display: 'flex' }}
              >
                <X size={24} />
              </button>
            </div>
            <UserProfile
              user={{ id: selectedUserId, email: '', name: 'Loading...' }} // UserProfile should handle fetching by ID if user prop is minimal
              isViewOnly={true}
              onUpdateUser={() => { }}
              onSelectUser={setSelectedUserId}
              onMessageClick={handleMessageClick}
            />
          </motion.div>
        )}
      </AnimatePresence>



      <nav className="bottom-nav glass-panel">
        <div className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          <MessageCircle size={24} />
          <span>{t('nav.chat')}</span>
        </div>
        <div className={`nav-item ${activeTab === 'soul' ? 'active' : ''}`} onClick={() => setActiveTab('soul')}>
          <div className="soul-nav-icon">
            <Sparkles size={24} />
          </div>
          <span>{t('nav.soul')}</span>
        </div>
        <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <UserIcon size={24} />
          <span>{t('nav.me')}</span>
        </div>
      </nav>

    </div>
  )
}

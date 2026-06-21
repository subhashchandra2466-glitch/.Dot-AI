import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Settings, 
  User as UserIcon, 
  ShieldCheck, 
  Lock, 
  ChevronDown,
  ChevronUp,
  Check, 
  CheckCircle, 
  AlertCircle, 
  Camera, 
  HelpCircle,
  Eye,
  EyeOff,
  Smartphone,
  Sun,
  Moon
} from 'lucide-react';
import { User } from '../types';

interface SettingsScreenProps {
  currentUser: User;
  onUpdateUser: (newUser: User) => void;
  onGoBack: () => void;
  theme: 'light' | 'system' | 'dark';
  onChangeTheme: (theme: 'light' | 'system' | 'dark') => void;
}

export default function SettingsScreen({ 
  currentUser, 
  onUpdateUser, 
  onGoBack, 
  theme, 
  onChangeTheme 
}: SettingsScreenProps) {
  
  // Database Pool Sync
  const [usersPool, setUsersPool] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('dot_users_pool') || '[]');
  });

  // Find the exact matching pool record of the current logged-in user
  const accountRecord = usersPool.find(u => u.username === currentUser.username) || {};

  // Success Notification banner
  const [globalSuccess, setGlobalSuccess] = useState('');

  // Accordion field toggles (Instagram-style disclosures: false by default)
  const [isDisplayNameOpen, setIsDisplayNameOpen] = useState(false);
  const [isUsernameOpen, setIsUsernameOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  // Profile data states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [updateAvatar, setUpdateAvatar] = useState(currentUser.avatarUrl || '');
  const [updateDisplayName, setUpdateDisplayName] = useState(currentUser.displayName || '');
  const [updateUsername, setUpdateUsername] = useState(currentUser.username || '');

  const [displayNameError, setDisplayNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameState, setUsernameState] = useState<'empty' | 'available' | 'taken'>('empty');

  // Trigger avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUpdateAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Real-time Display Name checking: letters & spaces only
  useEffect(() => {
    if (!updateDisplayName) {
      setDisplayNameError('');
      return;
    }
    const lettersOnly = /^[a-zA-Z\s]+$/.test(updateDisplayName);
    if (!lettersOnly) {
      setDisplayNameError('Letters only. Numbers or symbols are not allowed.');
    } else {
      setDisplayNameError('');
    }
  }, [updateDisplayName]);

  // Real-time Username checking: 4-20 chars, letters/numbers only, no spaces
  useEffect(() => {
    const cleanUser = updateUsername.trim().toLowerCase();
    if (!cleanUser) {
      setUsernameError('');
      setUsernameState('empty');
      return;
    }

    if (updateUsername.includes(' ')) {
      setUsernameError('No spaces allowed in username.');
      setUsernameState('taken');
      return;
    }

    if (updateUsername.length < 4 || updateUsername.length > 20) {
      setUsernameError('Username must be 4 to 20 characters long.');
      setUsernameState('taken');
      return;
    }

    const validChars = /^[a-z0-9_.]+$/.test(updateUsername);
    if (!validChars) {
      setUsernameError('Only small letters, numbers, underscores (_), and full stops (.) are allowed.');
      setUsernameState('taken');
      return;
    }

    // Accept own current username
    if (cleanUser === currentUser.username.toLowerCase()) {
      setUsernameError('');
      setUsernameState('available');
      return;
    }

    const taken = usersPool.some(u => u.username === cleanUser);
    if (taken) {
      setUsernameError('This username is taken');
      setUsernameState('taken');
    } else {
      setUsernameError('');
      setUsernameState('available');
    }
  }, [updateUsername, usersPool, currentUser]);

  const isProfileFormValid = () => {
    if (!updateDisplayName.trim() || displayNameError) return false;
    return true;
  };

  const isUsernameFormValid = () => {
    if (!updateUsername.trim() || usernameError || usernameState !== 'available') return false;
    return true;
  };

  const handleSaveDisplayName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProfileFormValid()) return;

    const oldUsernameKey = currentUser.username;
    
    const updatedPool = usersPool.map(u => {
      if (u.username === oldUsernameKey) {
        return {
          ...u,
          displayName: updateDisplayName.trim(),
          avatarUrl: updateAvatar
        };
      }
      return u;
    });

    localStorage.setItem('dot_users_pool', JSON.stringify(updatedPool));
    setUsersPool(updatedPool);

    const newUserObj: User = {
      username: currentUser.username,
      displayName: updateDisplayName.trim(),
      avatarUrl: updateAvatar
    };
    onUpdateUser(newUserObj);

    setGlobalSuccess('Display name updated successfully!');
    setIsDisplayNameOpen(false); // Collapse immediately upon success
    setTimeout(() => setGlobalSuccess(''), 2000);
  };

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUsernameFormValid()) return;

    const oldUsernameKey = currentUser.username;
    const newUsernameKey = updateUsername.trim().toLowerCase();

    const updatedPool = usersPool.map(u => {
      if (u.username === oldUsernameKey) {
        return {
          ...u,
          username: newUsernameKey,
          avatarUrl: updateAvatar
        };
      }
      return u;
    });

    localStorage.setItem('dot_users_pool', JSON.stringify(updatedPool));
    setUsersPool(updatedPool);

    // Migrate conversations
    if (oldUsernameKey !== newUsernameKey) {
      const oldStorageKey = `dot_ai_conversations_${oldUsernameKey}`;
      const newStorageKey = `dot_ai_conversations_${newUsernameKey}`;
      const savedChats = localStorage.getItem(oldStorageKey);
      if (savedChats) {
        localStorage.setItem(newStorageKey, savedChats);
        localStorage.removeItem(oldStorageKey);
      }
    }

    const newUserObj: User = {
      username: newUsernameKey,
      displayName: currentUser.displayName,
      avatarUrl: updateAvatar
    };
    onUpdateUser(newUserObj);

    setGlobalSuccess('Username updated successfully!');
    setIsUsernameOpen(false); // Collapse immediately
    setTimeout(() => setGlobalSuccess(''), 2000);
  };

  // PASSWORD CHANGING
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [oldPasswordError, setOldPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);

  // Validate new password rules
  useEffect(() => {
    if (!newPassword) {
      setNewPasswordError('');
      return;
    }
    if (newPassword.length < 8) {
      setNewPasswordError('Password must be at least 8 characters.');
      return;
    }
    setNewPasswordError('');
  }, [newPassword]);

  // Handle checking old password
  useEffect(() => {
    if (!oldPassword) {
      setOldPasswordError('');
      setIsOldPasswordVerified(false);
      return;
    }

    const actualCurrentPass = accountRecord.password || '';
    if (oldPassword === actualCurrentPass) {
      setOldPasswordError('');
      setIsOldPasswordVerified(true);
    } else {
      setOldPasswordError('Incorrect password');
      setIsOldPasswordVerified(false);
    }
  }, [oldPassword, accountRecord]);

  const isPasswordFormValid = () => {
    if (!isOldPasswordVerified) return false;
    if (!newPassword || newPasswordError) return false;
    if (newPassword !== confirmPassword) return false;
    return true;
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordFormValid()) return;

    const updatedPool = usersPool.map(u => {
      if (u.username === currentUser.username) {
        return {
          ...u,
          password: newPassword
        };
      }
      return u;
    });

    localStorage.setItem('dot_users_pool', JSON.stringify(updatedPool));
    setUsersPool(updatedPool);

    setGlobalSuccess('Password updated successfully!');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsOldPasswordVerified(false);
    setIsPasswordOpen(false); // Collapse immediately
    setTimeout(() => setGlobalSuccess(''), 2000);
  };

  // SECURITY CHALLENGE QUESTIONS
  const [verificationAnswer, setVerificationAnswer] = useState('');
  const [newSecurityQuestion, setNewSecurityQuestion] = useState('');
  const [newSecurityAnswer, setNewSecurityAnswer] = useState('');

  const [verificationAnswerError, setVerificationAnswerError] = useState('');
  const [newAnswerError, setNewAnswerError] = useState('');
  const [isSecurityVerified, setIsSecurityVerified] = useState(false);

  // Check the old security answer input
  useEffect(() => {
    if (!verificationAnswer) {
      setVerificationAnswerError('');
      setIsSecurityVerified(false);
      return;
    }

    const actualAnswer = (accountRecord.securityAnswer || '').trim().toLowerCase();
    if (verificationAnswer.trim().toLowerCase() === actualAnswer) {
      setVerificationAnswerError('');
      setIsSecurityVerified(true);
    } else {
      setVerificationAnswerError('Incorrect answer');
      setIsSecurityVerified(false);
    }
  }, [verificationAnswer, accountRecord]);

  // Check new security answer length
  useEffect(() => {
    if (!newSecurityAnswer) {
      setNewAnswerError('');
      return;
    }
    if (newSecurityAnswer.trim().length < 3) {
      setNewAnswerError('Answer must be at least 3 characters.');
    } else {
      setNewAnswerError('');
    }
  }, [newSecurityAnswer]);

  const isSecurityFormValid = () => {
    if (!isSecurityVerified) return false;
    if (!newSecurityQuestion.trim()) return false;
    if (!newSecurityAnswer.trim() || newAnswerError) return false;
    return true;
  };

  const handleUpdateSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSecurityFormValid()) return;

    const updatedPool = usersPool.map(u => {
      if (u.username === currentUser.username) {
        return {
          ...u,
          securityQuestion: newSecurityQuestion.trim(),
          securityAnswer: newSecurityAnswer.trim().toLowerCase()
        };
      }
      return u;
    });

    localStorage.setItem('dot_users_pool', JSON.stringify(updatedPool));
    setUsersPool(updatedPool);

    setGlobalSuccess('Security updated successfully!');
    setVerificationAnswer('');
    setNewSecurityQuestion('');
    setNewSecurityAnswer('');
    setIsSecurityVerified(false);
    setIsSecurityOpen(false); // Collapse immediately
    setTimeout(() => setGlobalSuccess(''), 2000);
  };

  // Save general avatar profile picture immediately to localStorage database
  const handleDirectAvatarSave = (avatarData: string) => {
    const updatedPool = usersPool.map(u => {
      if (u.username === currentUser.username) {
        return {
          ...u,
          avatarUrl: avatarData
        };
      }
      return u;
    });
    localStorage.setItem('dot_users_pool', JSON.stringify(updatedPool));
    setUsersPool(updatedPool);

    const newUserObj: User = {
      ...currentUser,
      avatarUrl: avatarData
    };
    onUpdateUser(newUserObj);
    setGlobalSuccess('Profile picture updated!');
    setTimeout(() => setGlobalSuccess(''), 1500);
  };

  return (
    <div className="flex-grow flex flex-col bg-stone-50 dark:bg-black text-slate-800 dark:text-neutral-150 overflow-y-auto max-w-2xl mx-auto w-full transition-colors duration-200">
      
      {/* HEADER SECTION - Instagram style */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md px-4 py-4 border-b border-stone-200/50 dark:border-neutral-900/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onGoBack}
            className="p-1.5 hover:bg-stone-100 dark:hover:bg-neutral-900 rounded-full transition text-slate-700 dark:text-slate-300"
            id="settings_back_btn"
            title="Go back to chat"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2px]" />
          </button>
          <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
            Settings and activity
          </span>
        </div>
        
        <span className="text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white px-3 py-1 rounded-full shadow-xs">
          Dot AI
        </span>
      </div>

      <div className="px-4 py-6 space-y-7">

        {/* PROFILE PICTURE CARD - INSTAGRAM CENTERED AVATAR DISPLAY */}
        <div className="flex flex-col items-center justify-center py-4 bg-white dark:bg-neutral-950 rounded-2xl border border-stone-200/40 dark:border-neutral-900/30 p-5 shadow-xs">
          <div className="relative mb-3 group">
            <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-black bg-stone-100 dark:bg-zinc-900 flex items-center justify-center">
                {updateAvatar ? (
                  <img src={updateAvatar} alt="Profile avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-slate-200 font-extrabold text-2xl uppercase flex items-center justify-center select-none">
                    {updateDisplayName.charAt(0) || 'D'}
                  </div>
                )}
              </div>
            </div>

            <label 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1.5 bg-sky-500 hover:bg-sky-600 text-white border border-white dark:border-black rounded-full cursor-pointer transition shadow-md hover:scale-105 active:scale-95"
              title="Edit Profile picture"
            >
              <Camera className="w-3.5 h-3.5" />
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const result = reader.result as string;
                  setUpdateAvatar(result);
                  handleDirectAvatarSave(result);
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>

          <h2 className="text-sm font-black text-slate-900 dark:text-neutral-100 flex items-center gap-1">
            {currentUser.displayName}
          </h2>
          <p className="text-xs text-stone-400 dark:text-neutral-500 font-mono">
            @{currentUser.username}
          </p>
        </div>

        {/* Global Save Success Banner */}
        {globalSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-pulse shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>{globalSuccess}</span>
          </div>
        )}

        {/* THEME & APPEARANCE SYSTEM (Lightspeed switch row) */}
        <div className="bg-white dark:bg-neutral-950 rounded-2xl border border-stone-200/40 dark:border-neutral-900/30 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-500 shrink-0" />
            <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider">
              Theme / Appearance
            </h3>
          </div>

          {/* Three choices in one row: Light, System, Dark */}
          <div className="grid grid-cols-3 gap-2 border border-stone-100 dark:border-neutral-900 p-1 rounded-xl bg-stone-50/60 dark:bg-black/45">
            
            {/* Choice 1: Light */}
            <button
              type="button"
              onClick={() => onChangeTheme('light')}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg transition-all ${
                theme === 'light' 
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 border border-stone-200 dark:border-neutral-800 shadow-xs font-black' 
                  : 'text-stone-400 hover:text-stone-800 dark:hover:text-neutral-200 font-bold'
              }`}
              id="theme_option_light"
            >
              <div className="relative w-4 h-4 rounded-full border border-stone-300 dark:border-neutral-700 flex items-center justify-center mb-1 pointer-events-none">
                {theme === 'light' && <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />}
              </div>
              <span className="text-[10px] uppercase tracking-wide">Light</span>
            </button>

            {/* Choice 2: System */}
            <button
              type="button"
              onClick={() => onChangeTheme('system')}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg transition-all ${
                theme === 'system' 
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 border border-stone-200 dark:border-neutral-800 shadow-xs font-black' 
                  : 'text-stone-400 hover:text-stone-800 dark:hover:text-neutral-200 font-bold'
              }`}
              id="theme_option_system"
            >
              <div className="relative w-4 h-4 rounded-full border border-stone-300 dark:border-neutral-700 flex items-center justify-center mb-1 pointer-events-none">
                {theme === 'system' && <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />}
              </div>
              <span className="text-[10px] uppercase tracking-wide">System</span>
            </button>

            {/* Choice 3: Dark */}
            <button
              type="button"
              onClick={() => onChangeTheme('dark')}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg transition-all ${
                theme === 'dark' 
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 border border-stone-200 dark:border-neutral-800 shadow-xs font-black' 
                  : 'text-stone-400 hover:text-stone-800 dark:hover:text-neutral-200 font-bold'
              }`}
              id="theme_option_dark"
            >
              <div className="relative w-4 h-4 rounded-full border border-stone-300 dark:border-neutral-700 flex items-center justify-center mb-1 pointer-events-none">
                {theme === 'dark' && <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />}
              </div>
              <span className="text-[10px] uppercase tracking-wide">Dark</span>
            </button>

          </div>
          
          <p className="text-[10px] text-stone-400 dark:text-neutral-500 leading-relaxed text-left">
            * Selected appearance option applies instantly and modifies colors to perfectly match system settings.
          </p>
        </div>

        {/* ACCOUNT SETTINGS - INTERACTIVE DISCLOSURE LIST (Instagram Style) */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 px-1">
            <UserIcon className="w-4 h-4 text-purple-500 shrink-0" />
            <h3 className="text-xs font-black uppercase text-stone-400 tracking-wider">
              Account Preferences
            </h3>
          </div>

          <div className="border border-stone-200/50 dark:border-neutral-900/40 rounded-2xl bg-white dark:bg-neutral-950 overflow-hidden divide-y divide-stone-100 dark:divide-neutral-900">
            
            {/* 1. CHANGE DISPLAY NAME DISCLOSURE BUTTON */}
            <div className="flex flex-col text-left">
              <button
                type="button"
                onClick={() => {
                  setIsDisplayNameOpen(!isDisplayNameOpen);
                  setIsUsernameOpen(false);
                  setIsPasswordOpen(false);
                  setIsSecurityOpen(false);
                }}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-stone-50/70 dark:hover:bg-neutral-900/30 transition text-left"
                id="disclosure_display_name_btn"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-850 dark:text-white">
                    Change Display Name
                  </p>
                  <p className="text-[10px] text-stone-400 dark:text-neutral-500 truncate">
                    Currently: {currentUser.displayName}
                  </p>
                </div>
                {isDisplayNameOpen ? (
                  <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                )}
              </button>

              {/* RENDER DYNAMIC FIELD: ENTER DISPLAY NAME */}
              {isDisplayNameOpen && (
                <div className="px-5 pb-5 pt-1.5 bg-stone-50/40 dark:bg-neutral-900/10 space-y-3 animate-fade-in">
                  <form onSubmit={handleSaveDisplayName} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-neutral-400">
                        Enter Name
                      </label>
                      <input
                        type="text"
                        required
                        value={updateDisplayName}
                        onChange={(e) => setUpdateDisplayName(e.target.value)}
                        className="w-full text-xs font-semibold bg-white dark:bg-black border border-stone-200 dark:border-neutral-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 focus:outline-none dark:text-white"
                        placeholder="Type display name..."
                        id="settings-displayName-input"
                      />
                      {displayNameError && (
                        <p className="text-[10px] text-red-500 font-bold whitespace-normal" id="settings-displayName-error">
                          • {displayNameError}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDisplayNameOpen(false)}
                        className="py-1.5 px-3 border border-stone-200 dark:border-neutral-805 text-stone-500 text-[11px] font-bold rounded-lg hover:bg-stone-50 dark:hover:bg-neutral-900"
                        id="cancel_display_name_btn"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!isProfileFormValid()}
                        className={`py-1.5 px-4 font-bold text-[11px] rounded-lg shadow-xs transition ${
                          isProfileFormValid() 
                            ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer' 
                            : 'bg-stone-200 dark:bg-neutral-800 text-stone-400 cursor-not-allowed'
                        }`}
                        id="settings-save-profile-btn"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* 2. CHANGE USERNAME DISCLOSURE BUTTON */}
            <div className="flex flex-col text-left">
              <button
                type="button"
                onClick={() => {
                  setIsUsernameOpen(!isUsernameOpen);
                  setIsDisplayNameOpen(false);
                  setIsPasswordOpen(false);
                  setIsSecurityOpen(false);
                }}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-stone-50/70 dark:hover:bg-neutral-900/30 transition text-left"
                id="disclosure_username_btn"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-850 dark:text-white">
                    Change Username
                  </p>
                  <p className="text-[10px] text-stone-400 dark:text-neutral-500 truncate">
                    Currently: @{currentUser.username}
                  </p>
                </div>
                {isUsernameOpen ? (
                  <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                )}
              </button>

              {/* RENDER DYNAMIC FIELD: ENTER USERNAME */}
              {isUsernameOpen && (
                <div className="px-5 pb-5 pt-1.5 bg-stone-50/40 dark:bg-neutral-900/10 space-y-3 animate-fade-in">
                  <form onSubmit={handleSaveUsername} className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-neutral-400">
                          Username
                        </label>
                        <span className="text-[9px] text-stone-400 font-medium">4-20 chars • No spaces</span>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={updateUsername}
                          onChange={(e) => setUpdateUsername(e.target.value.replace(/\s+/g, ''))} // strip space immediately
                          className="w-full text-xs font-semibold bg-white dark:bg-black border border-stone-200 dark:border-neutral-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 focus:outline-none dark:text-white pr-9"
                          placeholder="Type username..."
                          id="settings-username-input"
                        />
                        {usernameState === 'available' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-xs" title="Available">
                            ✓
                          </div>
                        )}
                        {usernameState === 'taken' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 font-bold text-xs animate-pulse" title="Taken">
                            ✗
                          </div>
                        )}
                      </div>

                      {usernameState === 'available' && updateUsername.trim().toLowerCase() !== currentUser.username.toLowerCase() && (
                        <p className="text-[10px] text-green-600 dark:text-green-400 font-bold" id="settings-username-available">
                          ✓ This username is available set
                        </p>
                      )}
                      {usernameState === 'taken' && (
                        <p className="text-[10px] text-red-500 font-bold whitespace-normal animate-shake" id="settings-username-error">
                          • {usernameError || 'This username is taken'}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsUsernameOpen(false)}
                        className="py-1.5 px-3 border border-stone-200 dark:border-neutral-805 text-stone-500 text-[11px] font-bold rounded-lg hover:bg-stone-50 dark:hover:bg-neutral-900"
                        id="cancel_username_btn"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!isUsernameFormValid()}
                        className={`py-1.5 px-4 font-bold text-[11px] rounded-lg shadow-xs transition ${
                          isUsernameFormValid() 
                            ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer' 
                            : 'bg-stone-200 dark:bg-neutral-800 text-stone-400 cursor-not-allowed'
                        }`}
                        id="settings-save-username-btn"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* 3. CHANGE PASSWORD DISCLOSURE BUTTON */}
            <div className="flex flex-col text-left">
              <button
                type="button"
                onClick={() => {
                  setIsPasswordOpen(!isPasswordOpen);
                  setIsDisplayNameOpen(false);
                  setIsUsernameOpen(false);
                  setIsSecurityOpen(false);
                }}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-stone-50/70 dark:hover:bg-neutral-900/30 transition text-left"
                id="disclosure_password_btn"
              >
                <div>
                  <p className="text-xs font-bold text-slate-850 dark:text-white">
                    Update Password
                  </p>
                  <p className="text-[10px] text-stone-400 dark:text-neutral-500">
                    Secure credentials with a case-sensitive passkey
                  </p>
                </div>
                {isPasswordOpen ? (
                  <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                )}
              </button>

              {/* RENDER DYNAMIC FIELD: ASK FOR OLD PASSWORD FIRST */}
              {isPasswordOpen && (
                <div className="px-5 pb-5 pt-1.5 bg-stone-50/40 dark:bg-neutral-900/10 space-y-4 animate-fade-in">
                  <form onSubmit={handleUpdatePassword} className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-neutral-400">
                        Old Password
                      </label>
                      <div className="relative">
                        <input
                          type={showOldPassword ? 'text' : 'password'}
                          required
                          placeholder="Verify current password"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="w-full text-xs font-semibold bg-white dark:bg-black border border-stone-200 dark:border-neutral-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-4 pr-11 py-2.5 focus:outline-none dark:text-white"
                          id="settings-oldPassword-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition p-1 cursor-pointer flex items-center justify-center animate-fade-in"
                        >
                          {showOldPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {oldPasswordError && (
                        <p className="text-[10px] text-red-500 font-semibold mt-1" id="settings-oldPassword-error">
                          • {oldPasswordError}
                        </p>
                      )}
                    </div>

                    {/* ONLY DISPLAY NEW PASSWORD RE-ENTRY FIELDS UPON ACCURATE OLD PASSWORD MATCH */}
                    {isOldPasswordVerified ? (
                      <div className="space-y-4 border-t border-dashed border-stone-200 dark:border-neutral-800 pt-3.5 animate-fade-in-down">
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-4 h-4" /> Credentials Verified
                        </span>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                            Create New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              required
                              placeholder="Min 8 characters (at least 1 letter & 1 number)"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full text-xs font-semibold bg-white dark:bg-black border border-stone-200 dark:border-neutral-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-4 pr-11 py-2.5 focus:outline-none dark:text-white"
                              id="settings-newPassword-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition p-1 cursor-pointer flex items-center justify-center"
                            >
                              {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          {newPasswordError && (
                            <p className="text-[10px] text-red-500 font-medium" id="settings-newPassword-error">
                              • {newPasswordError}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              required
                              placeholder="Retype new password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className={`w-full text-xs font-semibold bg-white dark:bg-black border rounded-xl pl-4 pr-11 py-2.5 focus:outline-none transition-all dark:text-white ${
                                newPassword && confirmPassword
                                  ? newPassword === confirmPassword
                                    ? 'border-emerald-500 focus:border-emerald-600 focus:ring-1'
                                    : 'border-red-500 focus:border-red-650 focus:ring-1'
                                  : 'border-stone-200 dark:border-neutral-800 focus:border-purple-500'
                              }`}
                              id="settings-confirmPassword-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition p-1 cursor-pointer flex items-center justify-center"
                            >
                              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          {newPassword && confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-[10px] text-red-500 font-bold" id="settings-confirmPassword-mismatch">
                              • Passwords do not match
                            </p>
                          )}
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={!isPasswordFormValid()}
                            className={`py-2 px-5 font-bold text-xs rounded-lg transition-all ${
                              isPasswordFormValid()
                                ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer active:scale-95'
                                : 'bg-stone-200 dark:bg-neutral-800 text-stone-400 cursor-not-allowed'
                            }`}
                            id="settings-save-password-btn"
                          >
                            Save Password
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-stone-400 dark:text-neutral-500">
                        * Input correct old password to reveal new password entries.
                      </p>
                    )}
                  </form>
                </div>
              )}
            </div>

            {/* 4. UPDATE SECURITY INFORMATION DISCLOSURE BUTTON */}
            <div className="flex flex-col text-left">
              <button
                type="button"
                onClick={() => {
                  setIsSecurityOpen(!isSecurityOpen);
                  setIsDisplayNameOpen(false);
                  setIsUsernameOpen(false);
                  setIsPasswordOpen(false);
                }}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-stone-50/70 dark:hover:bg-neutral-900/30 transition text-left"
                id="disclosure_security_btn"
              >
                <div>
                  <p className="text-xs font-bold text-slate-850 dark:text-white">
                    Update Security Question
                  </p>
                  <p className="text-[10px] text-stone-400 dark:text-neutral-500">
                    Modify the recovery challenge backup query
                  </p>
                </div>
                {isSecurityOpen ? (
                  <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                )}
              </button>

              {/* RENDER DYNAMIC FIELD: OLD SECURITY ANSWER FIRST */}
              {isSecurityOpen && (
                <div className="px-5 pb-5 pt-1.5 bg-stone-50/40 dark:bg-neutral-900/10 space-y-4 animate-fade-in text-left">
                  
                  {/* Current Question Read-Only */}
                  <div className="p-3 bg-stone-100/60 dark:bg-black/40 rounded-xl border border-stone-200/50 dark:border-neutral-950/60 text-left">
                    <span className="text-[8px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-widest font-mono">
                      Your Backup Security Question
                    </span>
                    <p className="text-xs font-bold text-slate-850 dark:text-neutral-100 mt-1">
                      "{accountRecord.securityQuestion || 'What is your favorite color?'}"
                    </p>
                  </div>

                  <form onSubmit={handleUpdateSecurity} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-neutral-400">
                        Verify Saved Security Answer
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter old answer (case-insensitive)"
                        value={verificationAnswer}
                        onChange={(e) => setVerificationAnswer(e.target.value)}
                        className="w-full text-xs font-semibold bg-white dark:bg-black border border-stone-200 dark:border-neutral-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 focus:outline-none dark:text-white"
                        id="settings-verifyAnswer-input"
                      />
                      {verificationAnswerError && (
                        <p className="text-[10px] text-red-500 font-bold mt-1" id="settings-verifyAnswer-error">
                          • {verificationAnswerError}
                        </p>
                      )}
                    </div>

                    {/* ONLY DISPLAY MODIFICATION ENTRY UPON ACCURATE OLD ANSWER MATCH */}
                    {isSecurityVerified ? (
                      <div className="space-y-4 border-t border-dashed border-stone-200 dark:border-neutral-800 pt-3.5 animate-fade-in-down">
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-4 h-4" /> Answers Verified
                        </span>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                            Create New Security Question
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. In what city were you born?"
                            value={newSecurityQuestion}
                            onChange={(e) => setNewSecurityQuestion(e.target.value)}
                            className="w-full text-xs font-semibold bg-white dark:bg-black border border-stone-200 dark:border-neutral-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 focus:outline-none dark:text-white"
                            id="settings-newQuestion-input"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                              Create New Security Answer
                            </label>
                            <span className="text-[9px] text-stone-400">Min 3 chars</span>
                          </div>
                          
                          <input
                            type="text"
                            required
                            placeholder="e.g. newDelhi"
                            value={newSecurityAnswer}
                            onChange={(e) => setNewSecurityAnswer(e.target.value)}
                            className="w-full text-xs font-semibold bg-white dark:bg-black border border-stone-200 dark:border-neutral-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 focus:outline-none dark:text-white"
                            id="settings-newAnswer-input"
                          />
                          {newAnswerError && (
                            <p className="text-[10px] text-red-500 font-bold">
                              • {newAnswerError}
                            </p>
                          )}
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={!isSecurityFormValid()}
                            className={`py-2 px-5 font-bold text-xs rounded-lg transition-all ${
                              isSecurityFormValid()
                                ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer active:scale-95'
                                : 'bg-stone-200 dark:bg-neutral-800 text-stone-400 cursor-not-allowed'
                            }`}
                            id="settings-save-security-btn"
                          >
                            Save Challenge
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-stone-400 dark:text-neutral-500">
                        * Input correct answer to configure a different security backup question.
                      </p>
                    )}
                  </form>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

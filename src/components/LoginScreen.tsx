import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  UserPlus, 
  HelpCircle, 
  Lock, 
  CheckCircle, 
  KeyRound, 
  Camera, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onGoBack: () => void;
}

export default function LoginScreen({ onLoginSuccess, onGoBack }: LoginScreenProps) {
  // Navigation states: 'login' | 'recovery' | 'create_account' | 'google_picker'
  const [viewState, setViewState] = useState<'login' | 'recovery' | 'create_account' | 'google_picker'>('login');

  // Pools database
  const [usersPool, setUsersPool] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('dot_users_pool') || '[]');
  });

  // Prepopulate standard demo credentials on startup
  // Removing demo user creation as requested by user.
  useEffect(() => {
    // Demo user removed
  }, []);

  // Sync state
  const syncPool = (updated: any[]) => {
    setUsersPool(updated);
    localStorage.setItem('dot_users_pool', JSON.stringify(updated));
  };


  // =========================================================================
  // 1. LOGIN STATE
  // =========================================================================
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanUser = loginUsername.trim().toLowerCase();
    const cleanPass = loginPassword; // Do not trim password as spaces might be character choices

    if (!cleanUser || !cleanPass) {
      setLoginError('Incorrect username or password');
      return;
    }

    const match = usersPool.find(u => u.username.toLowerCase() === cleanUser && u.password === cleanPass);

    if (match) {
      onLoginSuccess({
        username: match.username,
        displayName: match.displayName,
        avatarUrl: match.avatarUrl
      });
    } else {
      setLoginError('Incorrect username or password');
    }
  };

  const handleFirebaseGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoginError('');
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Populate creation fields with Google user data
        setCreateDisplayName(user.displayName || '');
        setCreateUsername(user.email?.split('@')[0].replace(/[^a-z0-9_.]/g, '') || '');
        setCreateAvatar(user.photoURL || '');
        setCreatePassword('');
        setCreateConfirmPassword('');
        setCreateCustomQuestion('');
        setCreateCustomAnswer('');
        
        // Switch to account creation view to set password/security question
        setViewState('create_account');
    } catch (error) {
        console.error('Error logging in with Google:', error);
        setLoginError('Google login failed');
    }
  };


  // =========================================================================
  // 2. PASSWORD RECOVERY STATE (Forgotten Password?)
  // =========================================================================
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3>(1);
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryTargetUser, setRecoveryTargetUser] = useState<any | null>(null);
  
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [showRecoveryNewPassword, setShowRecoveryNewPassword] = useState(false);
  const [showRecoveryConfirmPassword, setShowRecoveryConfirmPassword] = useState(false);

  // Individual field validation states & errors for Recovery
  const [recoveryUserError, setRecoveryUserError] = useState('');
  const [recoveryAnswerError, setRecoveryAnswerError] = useState('');
  const [recoveryPassError, setRecoveryPassError] = useState('');
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState('');

  const handleRecoveryUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryUserError('');
    const cleanUser = recoveryUsername.trim().toLowerCase();
    
    if (!cleanUser) {
      setRecoveryUserError('Please provide a username.');
      return;
    }

    const match = usersPool.find(u => u.username.toLowerCase() === cleanUser);
    if (!match) {
      setRecoveryUserError('Username not found');
    } else {
      setRecoveryTargetUser(match);
      setRecoveryStep(2);
    }
  };

  const handleRecoveryAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryAnswerError('');

    const trimmedAnswer = recoveryAnswer.trim().toLowerCase();
    const actualAnswer = recoveryTargetUser?.securityAnswer?.trim()?.toLowerCase() || '';

    if (trimmedAnswer !== actualAnswer) {
      setRecoveryAnswerError('Incorrect information');
    } else {
      setRecoveryStep(3);
    }
  };

  const handleRecoveryResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryPassError('');

    // Validation
    const passVal = recoveryNewPassword;
    const confirmVal = recoveryConfirmPassword;

    if (passVal.length < 8) {
      setRecoveryPassError('Password must be at least 8 characters.');
      return;
    }

    if (passVal !== confirmVal) {
      // Mismatch leaves red outline on Confirm Password field
      setRecoveryPassError('Passwords do not match');
      return;
    }

    // Success! Update password in DB
    const updatedPool = usersPool.map(u => {
      if (u.username === recoveryTargetUser.username) {
        return { ...u, password: passVal };
      }
      return u;
    });

    syncPool(updatedPool);
    setRecoverySuccessMsg('Password changed');

    setTimeout(() => {
      setRecoverySuccessMsg('');
      setViewState('login');
      setRecoveryStep(1);
      setLoginUsername(recoveryTargetUser.username);
      setLoginPassword('');
      // Reset variables
      setRecoveryUsername('');
      setRecoveryTargetUser(null);
      setRecoveryAnswer('');
      setRecoveryNewPassword('');
      setRecoveryConfirmPassword('');
      setRecoveryPassError('');
    }, 1000);
  };


  // =========================================================================
  // 3. ACCOUNT CREATION FLOW (Triggered after Continue with Google)
  // =========================================================================
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Custom uploaded image or light human mockup silhouette
  const [createAvatar, setCreateAvatar] = useState<string>(''); // empty initiates standard mockup silhouettes
  
  // Fields state
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirmPassword, setCreateConfirmPassword] = useState('');
  const [createCustomQuestion, setCreateCustomQuestion] = useState('');
  const [createCustomAnswer, setCreateCustomAnswer] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);

  // Dynamic Google identity registration states
  const [isAddingGoogleAccount, setIsAddingGoogleAccount] = useState(false);
  const [newGoogleEmail, setNewGoogleEmail] = useState('');
  const [newGoogleName, setNewGoogleName] = useState('');
  const [newGoogleError, setNewGoogleError] = useState('');

  const [googleAccountsList, setGoogleAccountsList] = useState<Array<{ name: string; email: string; avatarUrl: string }>>(() => {
    const listJson = localStorage.getItem('localGoogleAccounts');
    if (listJson) {
      try {
        const parsed = JSON.parse(listJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) { }
    }
    const defaultList = [{
      name: 'Subhash Chandra',
      email: 'subhashchandra2466@gmail.com',
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Subhash%20Chandra'
    }];
    localStorage.setItem('localGoogleAccounts', JSON.stringify(defaultList));
    return defaultList;
  });

  // Field validation and real-time live reporting text variables
  const [displayNameError, setDisplayNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameState, setUsernameState] = useState<'empty' | 'available' | 'taken'>('empty');
  
  const [passwordError, setPasswordError] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [answerError, setAnswerError] = useState('');

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Trigger base64 picture conversion
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Must select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCreateAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Real-time checks whenever fields adjust
  // Display name: 'letters only. Show error if numbers/symbols entered.'
  useEffect(() => {
    if (!createDisplayName) {
      setDisplayNameError('');
      return;
    }
    // Allow spaces but only letters
    const lettersOnly = /^[a-zA-Z\s]+$/.test(createDisplayName);
    if (!lettersOnly) {
      setDisplayNameError('Letters only. Numbers or symbols are not allowed.');
    } else {
      setDisplayNameError('');
    }
  }, [createDisplayName]);

  // Username live checking: "4-20 characters, letters and numbers only, no spaces"
  // Plus real-time pool availability checking
  useEffect(() => {
    const cleanUser = createUsername.trim().toLowerCase();
    if (!createUsername) {
      setUsernameError('');
      setUsernameState('empty');
      return;
    }

    if (createUsername.includes(' ')) {
      setUsernameError('No spaces allowed in username.');
      setUsernameState('taken');
      return;
    }

    if (createUsername.length < 4 || createUsername.length > 20) {
      setUsernameError('Username must be 4 to 20 characters long.');
      setUsernameState('taken');
      return;
    }

    const validChars = /^[a-z0-9_.]+$/.test(createUsername);
    if (!validChars) {
      setUsernameError('Only small letters, numbers, underscores (_), and full stops (.) are allowed.');
      setUsernameState('taken');
      return;
    }

    // Check pool availability
    const taken = usersPool.some(u => u.username === cleanUser);
    if (taken) {
      setUsernameError('This username is taken');
      setUsernameState('taken');
    } else {
      setUsernameError('');
      setUsernameState('available');
    }
  }, [createUsername, usersPool]);

  // Password Live Validation check
  // Any characters of any language allowed
  useEffect(() => {
    if (!createPassword) {
      setPasswordError('');
      return;
    }

    if (createPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    setPasswordError('');
  }, [createPassword]);

  // Question validation: Mandatory Custom field
  useEffect(() => {
    if (!createCustomQuestion) {
      setQuestionError('');
      return;
    }
    if (createCustomQuestion.trim().length === 0) {
      setQuestionError('This field is mandatory');
    } else {
      setQuestionError('');
    }
  }, [createCustomQuestion]);

  // Answer live check: Minimum 3 characters
  useEffect(() => {
    if (!createCustomAnswer) {
      setAnswerError('');
      return;
    }
    if (createCustomAnswer.trim().length < 3) {
      setAnswerError('Security Answer must be at least 3 characters.');
    } else {
      setAnswerError('');
    }
  }, [createCustomAnswer]);

  // Calculate if the entire form is valid to enable/disable button
  const isCreateFormValid = () => {
    if (!createDisplayName || displayNameError) return false;
    if (!createUsername || usernameError || usernameState !== 'available') return false;
    if (!createPassword || passwordError) return false;
    if (createPassword !== createConfirmPassword) return false;
    if (!createCustomQuestion.trim()) return false;
    if (!createCustomAnswer.trim() || answerError) return false;
    return true;
  };

  const handleCreateButtonClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreateFormValid()) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmRegistration = () => {
    // Generate new profile object
    const finalAvatar = createAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(createDisplayName)}`;
    const newProfile = {
      username: createUsername.trim().toLowerCase(),
      displayName: createDisplayName.trim(),
      password: createPassword,
      securityQuestion: createCustomQuestion.trim(),
      securityAnswer: createCustomAnswer.trim().toLowerCase(),
      avatarUrl: finalAvatar
    };

    const nextPool = [...usersPool, newProfile];
    syncPool(nextPool);
    setShowConfirmDialog(false);

    // Return successfully
    onLoginSuccess({
      username: newProfile.username,
      displayName: newProfile.displayName,
      avatarUrl: newProfile.avatarUrl
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-y-auto w-full transition-colors duration-300">
      
      {/* Dynamic Main Authenticate Box Container (Material Design Aesthetic Card layout) */}
      <div className="w-full max-w-md p-6 sm:p-8 bg-white dark:bg-slate-905 rounded-3xl shadow-xl border border-slate-200/70 dark:border-slate-800/80 transition-all duration-300 relative my-6">
        
        {/* VIEW 1: SIGN IN PAGE */}
        {viewState === 'login' && (
          <div className="space-y-6">
            
            {/* Top Toolbar Header with single simple cancel choice */}
            <div className="flex items-center justify-between pb-2">
              <button
                onClick={onGoBack}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 transition"
                id="back_to_chat_button"
              >
                <ArrowLeft className="w-4 h-4" />
                Go to Chat
              </button>
              <h1 className="text-xs font-black tracking-widest text-purple-600 bg-purple-100 dark:bg-purple-900/40 px-2.5 py-0.5 rounded-full select-none uppercase">
                Dot AI Login
              </h1>
            </div>

            {/* Core Brand Banner */}
            <div className="text-center space-y-2 pb-2">
              <div className="text-4xl font-extrabold tracking-tighter bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 bg-clip-text text-transparent italic select-none">
                dot.ai
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-4">
                Use the login button to access all dot AI features
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Field 1: Username */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Username</label>
                <input
                  type="text"
                  required
                  placeholder="Phone number, username, or email"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-3 focus:outline-none transition-all dark:text-white"
                  id="login_username_field"
                />
              </div>

              {/* Field 2: Password */}
              <div className="space-y-1 text-left relative">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Password</label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-4 pr-11 py-3 focus:outline-none transition-all dark:text-white"
                    id="login_password_field"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition p-1 cursor-pointer flex items-center justify-center"
                    id="toggle_login_password"
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Incorrect credentials warning - printed right below password field in red */}
                {loginError && (
                  <p className="text-[11px] text-red-550 dark:text-red-400 font-bold flex items-center gap-1.5 mt-1.5 animate-pulse" id="login_error_text">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {loginError}
                  </p>
                )}
              </div>

              {/* Action 1: Login button */}
              <button
                type="submit"
                className="w-full py-3 mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/15 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                id="login_submit_btn"
              >
                Log In
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

            </form>

            {/* PASSWORD RECOVERY LINK (Placed strictly below the Login submit block) */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setViewState('recovery');
                  setRecoveryStep(1);
                  setRecoveryUsername('');
                  setRecoveryUserError('');
                  setRecoveryAnswerError('');
                  setRecoveryPassError('');
                }}
                className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition"
                id="forgotten_password_trigger"
              >
                Forgot Password?
              </button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800/85"></div>
              <span className="flex-shrink mx-4 text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-wider select-none">Or</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800/85"></div>
            </div>

            {/* Action 2: Continue with Google Button (Crucially positioned below all elements) */}
            <button
              type="button"
              onClick={handleFirebaseGoogleLogin}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-850/85 border border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
              id="continue_with_google_btn"
            >
              <svg className="w-4 h-4 select-none" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3A11.945 11.945 0 0 0 12 .909c-4.882 0-9.08 2.92-11.026 7.143z"
                />
                <path
                  fill="#4285F4"
                  d="M23.09 12.273c0-.818-.073-1.609-.209-2.373H12v4.51H18.22a5.312 5.312 0 0 1-2.302 3.483l3.527 2.735c2.062-1.9 3.253-4.7 3.253-8.355z"
                />
                <path
                  fill="#FBBC05"
                  d="M.973 8.355a11.959 11.959 0 0 0 0 7.29l3.528-2.735A7.072 7.072 0 0 1 4.5 12c0-1.341.373-2.6 1.027-3.645z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.091c3.24 0 5.958-1.076 7.942-2.915l-3.527-2.735c-.978.654-2.227 1.043-4.415 1.043-3.11 0-5.746-2.1-6.687-4.922L.942 16.326C2.88 20.548 7.08 23.09 12 23.09z"
                />
              </svg>
              Continue with Google
            </button>
            
          </div>
        )}
        
        {/* VIEW 2: PASSWORD RECOVERY FLOW */}
        {viewState === 'recovery' && (
          <div className="space-y-6">
            
            {/* Header info bar */}
            <div className="flex items-center justify-between pb-1">
              <button
                onClick={() => {
                  setViewState('login');
                  setRecoveryUserError('');
                  setRecoveryAnswerError('');
                  setRecoveryPassError('');
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-550 hover:text-purple-650 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
              <span className="text-[9px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full select-none">
                Recover Mode
              </span>
            </div>

            {recoverySuccessMsg ? (
              /* Success confirmation with a green icon is shown */
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
                <CheckCircle className="w-16 h-16 text-green-500" />
                <h3 className="text-lg font-black text-green-600 dark:text-green-400 uppercase tracking-wide">
                  {recoverySuccessMsg}
                </h3>
                <p className="text-xs text-slate-400">Updating credential database in real time...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-left space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-purple-600" />
                    Reset Password
                  </h2>
                  <p className="text-xs text-slate-500">
                    {recoveryStep === 1 && 'Step 1: Identify your account profile username block.'}
                    {recoveryStep === 2 && 'Step 2: Authenticate with security self-setup response.'}
                    {recoveryStep === 3 && 'Step 3: Define a secure password with letters and numbers.'}
                  </p>
                </div>

                {/* STEP 1: Ask for Username */}
                {recoveryStep === 1 && (
                  <form onSubmit={handleRecoveryUsernameSubmit} className="space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-slate-650 dark:text-slate-400">Username</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. alex"
                        value={recoveryUsername}
                        onChange={(e) => setRecoveryUsername(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-3 focus:outline-none dark:text-white"
                        id="recovery_username_input"
                      />
                      {recoveryUserError && (
                        <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-pulse" id="recovery_user_error">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {recoveryUserError}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                    >
                      Next
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}

                {/* STEP 2: Show question and check answer */}
                {recoveryStep === 2 && (
                  <form onSubmit={handleRecoveryAnswerSubmit} className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-left">
                      <span className="text-[9px] text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-widest font-mono">
                        Security Question
                      </span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                        "{recoveryTargetUser?.securityQuestion || 'Standard verification question?'}"
                      </p>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-slate-650 dark:text-slate-400">Security Answer</label>
                      <input
                        type="text"
                        required
                        placeholder="Enter answer here (case-insensitive)"
                        value={recoveryAnswer}
                        onChange={(e) => setRecoveryAnswer(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-3 focus:outline-none dark:text-white"
                        autoFocus
                      />
                      {recoveryAnswerError && (
                        <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-pulse" id="recovery_answer_error">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {recoveryAnswerError}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                    >
                      Next
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}

                {/* STEP 3: New Passwords specification */}
                {recoveryStep === 3 && (
                  <form onSubmit={handleRecoveryResetPassword} className="space-y-4">
                    
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-slate-650 dark:text-slate-400">Create New Password</label>
                      <div className="relative">
                        <input
                          type={showRecoveryNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Enter new password (min. 8 characters)"
                          value={recoveryNewPassword}
                          onChange={(e) => setRecoveryNewPassword(e.target.value)}
                          className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-4 pr-11 py-3 focus:outline-none dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRecoveryNewPassword(!showRecoveryNewPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 transition p-1 cursor-pointer flex items-center justify-center"
                        >
                          {showRecoveryNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-slate-650 dark:text-slate-400">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showRecoveryConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="Confirm password"
                          value={recoveryConfirmPassword}
                          onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                          className={`w-full text-xs font-semibold bg-slate-100/50 dark:bg-slate-950 border rounded-xl pl-4 pr-11 py-3 focus:outline-none transition-all dark:text-white ${
                            recoveryNewPassword && recoveryConfirmPassword && recoveryNewPassword !== recoveryConfirmPassword
                              ? 'border-red-500 focus:border-red-650 focus:ring-1 focus:ring-red-500' 
                              : 'border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRecoveryConfirmPassword(!showRecoveryConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 transition p-1 cursor-pointer flex items-center justify-center"
                        >
                          {showRecoveryConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {recoveryPassError && (
                        <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-pulse" id="recovery_pass_error">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {recoveryPassError}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-purple-650 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition"
                    >
                      Change Password
                    </button>

                    
                  </form>
                )}
                </div>
              )}
            </div>
          )}

        {/* VIEW: GOOGLE ACCOUNT PICKER */}
        {viewState === 'google_picker' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-1">
              <button
                onClick={() => setViewState('login')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-650 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
              <span className="text-[9px] font-extrabold uppercase bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full select-none tracking-widest font-mono">
                Google Auth
              </span>
            </div>

            <div className="text-center space-y-1.5 pb-2">
              {/* Google multi-colored G logo */}
              <div className="flex justify-center mb-1">
                <svg className="w-8 h-8 select-none" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {isAddingGoogleAccount ? 'Sign in with Google' : 'Choose an account'}
              </h2>
              <p className="text-xs text-slate-500">
                to continue to <span className="font-semibold text-purple-600 dark:text-purple-400">Dot AI</span>
              </p>
            </div>

            {isAddingGoogleAccount ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setNewGoogleError('');
                  const cleanEmail = newGoogleEmail.trim().toLowerCase();
                  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.endsWith('.com')) {
                    setNewGoogleError('Enter a valid Google email address (ends with .com)');
                    return;
                  }
                  if (!newGoogleName.trim()) {
                    setNewGoogleError('Enter your full name');
                    return;
                  }

                  // Add to dynamic pool if not exist
                  const exists = googleAccountsList.some(acc => acc.email.toLowerCase() === cleanEmail);
                  const suggestedUser = cleanEmail.split('@')[0].replace(/[^a-z0-9_.]/g, '');
                  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newGoogleName.trim())}`;
                  
                  if (!exists) {
                    const newAcc = {
                      name: newGoogleName.trim(),
                      email: cleanEmail,
                      avatarUrl
                    };
                    const updated = [...googleAccountsList, newAcc];
                    setGoogleAccountsList(updated);
                    localStorage.setItem('localGoogleAccounts', JSON.stringify(updated));
                  }

                  setCreateDisplayName(newGoogleName.trim());
                  setCreateUsername(suggestedUser);
                  setCreateAvatar(avatarUrl);
                  setCreatePassword('');
                  setCreateConfirmPassword('');
                  setCreateCustomQuestion('');
                  setCreateCustomAnswer('');
                  setDisplayNameError('');
                  setUsernameError('');
                  setPasswordError('');
                  setQuestionError('');
                  setAnswerError('');
                  setIsAddingGoogleAccount(false);
                  setViewState('create_account');
                }}
                className="space-y-4"
              >
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Google Email</label>
                  <input
                    type="email"
                    required
                    placeholder="example@gmail.com"
                    value={newGoogleEmail}
                    onChange={(e) => setNewGoogleEmail(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-3 focus:outline-none dark:text-white"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Alex Chen"
                    value={newGoogleName}
                    onChange={(e) => setNewGoogleName(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-3 focus:outline-none dark:text-white"
                  />
                </div>

                {newGoogleError && (
                  <p className="text-[11px] text-red-500 font-bold">• {newGoogleError}</p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingGoogleAccount(false);
                      setNewGoogleError('');
                    }}
                    className="flex-1 py-3 border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-450 font-bold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-950 transition active:scale-95 cursor-pointer text-center"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer text-center"
                  >
                    Next
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2.5">
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll-container pr-1">
                  {googleAccountsList.map((acc) => {
                    const initials = acc.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    const suggestedUser = acc.email.split('@')[0].replace(/[^a-z0-9_.]/g, '');

                    return (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => {
                          setCreateDisplayName(acc.name);
                          setCreateUsername(suggestedUser);
                          setCreateAvatar(acc.avatarUrl);
                          setCreatePassword('');
                          setCreateConfirmPassword('');
                          setCreateCustomQuestion('');
                          setCreateCustomAnswer('');
                          setDisplayNameError('');
                          setUsernameError('');
                          setPasswordError('');
                          setQuestionError('');
                          setAnswerError('');
                          setViewState('create_account');
                        }}
                        className="w-full p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.99] text-left animate-fade-in"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-black flex items-center justify-center text-sm shadow-sm select-none uppercase">
                          {initials || 'G'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-slate-850 dark:text-white truncate">
                            {acc.name}
                          </p>
                          <p className="text-[10px] text-slate-450 dark:text-slate-550 truncate font-mono">
                            {acc.email}
                          </p>
                        </div>
                        <span className="text-[9px] font-bold bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          Active
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Option 2: Add or Sign In with another real Google Identity */}
                <button
                  type="button"
                  onClick={() => {
                    setNewGoogleEmail('');
                    setNewGoogleName('');
                    setNewGoogleError('');
                    setIsAddingGoogleAccount(true);
                  }}
                  className="w-full p-3 border border-dashed border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/40 rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.99] font-bold text-xs text-purple-600 dark:text-purple-400 cursor-pointer"
                  id="add_other_google_account"
                >
                  <span>+ Use another Google account</span>
                </button>

              </div>
            )}

            <div className="pt-2 text-center">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                To continue, Google will share your device email address, localized name, and basic telemetry preference with Dot AI.
              </p>
            </div>
          </div>
        )}

        {/* VIEW 3: ACCOUNT CREATION FLOW (Aesthetic layout resembling Material guidelines) */}
        {viewState === 'create_account' && (
          <div className="space-y-6">
            
            {/* Header info bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setViewState('login');
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-650 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Google login auth
              </button>
              <span className="text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full select-none tracking-widest">
                Active Setup
              </span>
            </div>

            {/* Title: Create Your Account */}
            <div className="text-left space-y-1">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white" id="create_account_title">
                Create Your Account
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Step up your profile details. All fields below are monitored and mandatory.
              </p>
            </div>

            <form onSubmit={handleCreateButtonClick} className="space-y-4">
              
              {/* Profile section with silhouette layout, custom upload circle, pencil icon */}
              <div className="flex flex-col items-center justify-center gap-2 mb-4">
                <div className="relative group select-none">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-555 dark:border-purple-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center shadow-md">
                    {createAvatar ? (
                      <img 
                        src={createAvatar} 
                        alt="Preview profile icon" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      /* Human silhouette icon inside circle by default */
                      <svg className="w-12 h-12 text-slate-400/80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Pencil icon overlay to pick / upload custom image Base64 format */}
                  <label 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full border border-white cursor-pointer hover:scale-105 transition duration-150 flex items-center justify-center shadow"
                    title="Upload profile picture"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                </div>
                <span className="text-[10px] text-slate-450 dark:text-slate-550 font-bold">
                  {createAvatar ? 'Custom picture uploaded!' : 'Tap pencil to attach custom photo'}
                </span>
              </div>

              {/* Field 1: Display Name */}
              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Display Name</span>
                  <span className="text-[9px] font-medium text-slate-400">Letters Only</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Subhash Chandra"
                  value={createDisplayName}
                  onChange={(e) => setCreateDisplayName(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 focus:outline-none transition-all dark:text-white"
                  id="display_name_input"
                />
                
                {displayNameError && (
                  <p className="text-[10px] text-red-500 font-bold space-x-1 animate-pulse" id="display_name_error">
                    • {displayNameError}
                  </p>
                )}
              </div>

              {/* Field 2: Username (With availability check indicators) */}
              <div className="space-y-1 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    Username
                    
                    {/* Live availability point bullet checking indicators */}
                    {usernameState === 'empty' ? null : usernameState === 'available' ? (
                      <span className="w-2 h-2 rounded-full bg-green-500 select-none" title="This username is available" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-red-500 select-none animate-ping" title="Username is taken" />
                    )}
                  </span>
                  <span className="text-[9px] font-medium text-slate-400">4-20 chars • Unique</span>
                </div>

                <input
                  type="text"
                  required
                  placeholder="e.g. subhash24"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value.replace(/\s+/g, ''))} // instant block space key
                  className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 focus:outline-none transition-all dark:text-white"
                  id="create_username_input"
                />

                {/* Specific report messaging based on availability */}
                {usernameState === 'available' && !usernameError && (
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-bold animate-pulse" id="username_available_label">
                    ✓ This username is available
                  </p>
                )}

                {usernameState === 'taken' && (
                  <p className="text-[10px] text-red-500 font-bold leading-relaxed" id="username_taken_label">
                    • {usernameError || 'This username is taken'}
                  </p>
                )}
              </div>

              {/* Field 3: Create New Password */}
              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Create New Password</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password (min. 8 characters)"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-4 pr-11 py-2.5 focus:outline-none transition-all dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition p-1 cursor-pointer flex items-center justify-center"
                  >
                    {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                
                {passwordError && (
                  <p className="text-[10px] text-red-500 font-bold" id="password_requirement_error">
                    • {passwordError}
                  </p>
                )}
              </div>

              {/* Field 4: Confirm Password (outline turns green if matches, red if mismatch) */}
              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showCreateConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Retype password"
                    value={createConfirmPassword}
                    onChange={(e) => setCreateConfirmPassword(e.target.value)}
                    className={`w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 border rounded-xl pl-4 pr-11 py-2.5 focus:outline-none transition-all dark:text-white ${
                      createPassword && createConfirmPassword 
                        ? createPassword === createConfirmPassword 
                          ? 'border-green-500 focus:border-green-600 focus:ring-1 focus:ring-green-500' 
                          : 'border-red-500 focus:border-red-650 focus:ring-1 focus:ring-red-500'
                        : 'border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                    }`}
                    id="confirm_password_input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreateConfirmPassword(!showCreateConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition p-1 cursor-pointer flex items-center justify-center"
                  >
                    {showCreateConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {createPassword && createConfirmPassword && createPassword !== createConfirmPassword && (
                  <p className="text-[10px] text-red-500 font-bold" id="confirm_password_mismatch_error">
                    • Passwords do not match
                  </p>
                )}
              </div>

              {/* Field 5: Custom Security Question (Mandatory field) */}
              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Custom Security Question</span>
                  <span className="text-[9px] text-red-500 uppercase font-mono tracking-widest">Mandatory</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. What is my first school?"
                  value={createCustomQuestion}
                  onChange={(e) => setCreateCustomQuestion(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 focus:outline-none transition-all dark:text-white"
                />
                
                {questionError && (
                  <p className="text-[10px] text-red-500 font-bold">
                    • {questionError}
                  </p>
                )}
              </div>

              {/* Field 6: Security Answer (Mandatory field, min 3 characters) */}
              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Security Answer</span>
                  <span className="text-[9px] text-slate-450 dark:text-slate-550">Min 3 characters</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Answer value"
                  value={createCustomAnswer}
                  onChange={(e) => setCreateCustomAnswer(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 focus:outline-none transition-all dark:text-white"
                />
                
                {answerError && (
                  <p className="text-[10px] text-red-500 font-bold" id="security_answer_error_label">
                    • {answerError}
                  </p>
                )}
              </div>

              {/* Submit button: Disabled until all fields are valid */}
              <button
                type="submit"
                disabled={!isCreateFormValid()}
                className={`w-full py-3 text-white font-extrabold text-xs rounded-xl shadow-lg transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
                  isCreateFormValid() 
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/10' 
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed active:scale-100'
                }`}
                id="create_account_submit_btn"
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </button>

            </form>
          </div>
        )}

      </div>

      {/* CONFIRMATION SAFETY ALERT DIALOG MODAL LAYOUT */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-left">
          
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl shadow-2xl space-y-4 animate-scale-up">
            
            {/* Warning outline icon & Title: "Remember all your data" */}
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-450">
              <span className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-xl">
                <HelpCircle className="w-6 h-6" />
              </span>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Remember all your data
              </h3>
            </div>

            {/* Message: "Keep your password and security answer safe. We cannot recover it for you." */}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              Keep your password and security answer safe. We cannot recover it for you.
            </p>

            {/* Actions: "I remember" (green button) and "Cancel" (neutral outline button) */}
            <div className="flex items-center gap-2.5 pt-2">
              
              <button
                type="button"
                onClick={handleConfirmRegistration}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow cursor-pointer text-center select-none"
                id="i_remember_btn"
              >
                I remember
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 font-extrabold text-xs rounded-xl cursor-pointer text-center select-none"
                id="cancel_dialog_btn"
              >
                Cancel
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

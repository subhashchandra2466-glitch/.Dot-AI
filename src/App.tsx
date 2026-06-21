import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, AIChatSession, AIChatMessage } from './types';
import Sidebar from './components/Sidebar';
import ChatScreen from './components/ChatScreen';
import LoginScreen from './components/LoginScreen';
import SettingsScreen from './components/SettingsScreen';
import HiddenSpace from './components/HiddenSpace';
import DotAiLogo from './components/DotAiLogo';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Satisfy: "Log out everyone who has logged into this app so far."
    localStorage.removeItem('dot_ai_user');
    return null;
  });

  const [currentRoute, setCurrentRoute] = useState<'chat' | 'login' | 'settings'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onHiddenSpace, setOnHiddenSpace] = useState(false);
  const [showHiddenSpacePasswordPrompt, setShowHiddenSpacePasswordPrompt] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const [theme, setTheme] = useState<'light' | 'system' | 'dark'>(() => {
    return (localStorage.getItem('dot_ai_theme') as any) || 'system';
  });

  // Active Chats collection, partition by current logged in user or guest
  const [aiChats, setAiChats] = useState<AIChatSession[]>([]);
  const [activeAIChatId, setActiveAIChatId] = useState<string | null>(null);

  // Initialize Global Ripple Effect and Subtle Haptic Feedback on clickable target widgets
  useEffect(() => {
    const handleRippleAndHaptic = (e: MouseEvent | TouchEvent) => {
      const target = (e.target as HTMLElement).closest('button, [role="button"], .ripple-target, a');
      if (!target) return;

      // Subtle Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(6); // extremely soft organic vibration pulse
        } catch (_) {}
      }

      if (target.hasAttribute('disabled') || (target as any).disabled) return;

      const rect = target.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;
      if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const ripple = document.createElement('span');
      // bg-current automatically matches the text color with 12% opacity (per prompt)
      ripple.className = 'absolute pointer-events-none rounded-full bg-current opacity-12 transform -translate-x-1/2 -translate-y-1/2 scale-0 transition-transform duration-500 ease-out';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.width = `${Math.max(rect.width, rect.height) * 2.5}px`;
      ripple.style.height = `${Math.max(rect.width, rect.height) * 2.5}px`;
      ripple.style.zIndex = '0';

      const origPosition = window.getComputedStyle(target).position;
      if (origPosition === 'static') {
        (target as HTMLElement).style.position = 'relative';
      }
      const origOverflow = window.getComputedStyle(target).overflow;
      if (origOverflow !== 'hidden') {
        (target as HTMLElement).style.overflow = 'hidden';
      }

      target.appendChild(ripple);

      // Force layout layout reflow and trigger scale expanding animation
      requestAnimationFrame(() => {
        ripple.classList.remove('scale-0');
        ripple.classList.add('scale-100');
      });

      // Fade out and clean up
      setTimeout(() => {
        ripple.style.transition = 'opacity 250ms ease-out';
        ripple.style.opacity = '0';
        setTimeout(() => {
          ripple.remove();
        }, 250);
      }, 355);
    };

    document.addEventListener('mousedown', handleRippleAndHaptic, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleRippleAndHaptic);
    };
  }, []);

  // Unified, ultra-responsive Theme mode preference engine
  useEffect(() => {
    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (theme === 'dark' || (theme === 'system' && systemPrefersDark)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('dot_ai_theme', theme);
  }, [theme]);

  // Listen to system theme changes dynamically if system option is set
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (theme !== 'system') return;
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  // Fetch the private conversations of the current session user or guest
  useEffect(() => {
    const ownerKey = currentUser ? currentUser.username : 'guest';
    const storageKey = `dot_ai_conversations_${ownerKey}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      const parsed = JSON.parse(saved) as AIChatSession[];
      setAiChats(parsed);
      if (parsed.length > 0) {
        setActiveAIChatId(parsed[0].id);
      } else {
        setActiveAIChatId(null);
      }
    } else {
      // Seed with a cozy welcome conversation
      const welcomeChat: AIChatSession = {
        id: 'chat_welcome_' + Date.now(),
        title: 'Welcome to Dot AI! 👋',
        number: 1, // First conversation is permanently sequence index #1.
        messages: [
          {
            id: 'msg_welcome_' + Date.now(),
            role: 'model',
            text: `Hi! I'm Dot, your cognitive companion AI helper. 🌟\n\nI can do smart reasoning, answer complex prompts, or analyze visual inputs. Feel free to attach pictures by clicking the photo button on the left of your bottom toolbar!\n\nIf you're signed in, you can record, search, and manage multiple parallel threads.`,
            timestamp: new Date().toISOString()
          }
        ]
      };
      const initialList = [welcomeChat];
      setAiChats(initialList);
      setActiveAIChatId(welcomeChat.id);
      localStorage.setItem(storageKey, JSON.stringify(initialList));
    }
  }, [currentUser]);

  // Synchronize conversation logs with localStorage with corresponding ownerKey
  const saveChats = (updatedChats: AIChatSession[]) => {
    setAiChats(updatedChats);
    const ownerKey = currentUser ? currentUser.username : 'guest';
    const storageKey = `dot_ai_conversations_${ownerKey}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedChats));
  };

  // Helper inside coordinator to handle dynamic messages updating for typing/streaming
  const handleUpdateSessionMessages = (
    sessionId: string,
    messagesOrUpdater: AIChatMessage[] | ((currentMsgs: AIChatMessage[]) => AIChatMessage[])
  ) => {
    setAiChats((prevChats) => {
      const nextChats = prevChats.map((chat) => {
        if (chat.id === sessionId) {
          const nextMsgs = typeof messagesOrUpdater === 'function' 
            ? messagesOrUpdater(chat.messages) 
            : messagesOrUpdater;
          return { ...chat, messages: nextMsgs };
        }
        return chat;
      });
      const ownerKey = currentUser ? currentUser.username : 'guest';
      const storageKey = `dot_ai_conversations_${ownerKey}`;
      localStorage.setItem(storageKey, JSON.stringify(nextChats));
      return nextChats;
    });
  };

  // Create a brand new AI thread
  const handleNewChat = () => {
    // Collect sequence number that is absolutely permanent and incremental
    // To ensure "numbers never change", we locate the maximum conversation sequence number created so far
    let nextNum = 1;
    if (aiChats.length > 0) {
      const maxNum = Math.max(...aiChats.map(c => c.number));
      nextNum = maxNum + 1;
    }

    const newChatId = 'chat_new_' + Date.now();
    const newChat: AIChatSession = {
      id: newChatId,
      title: `Conversation #${nextNum}`,
      number: nextNum,
      messages: []
    };

    const nextChats = [newChat, ...aiChats];
    saveChats(nextChats);
    setActiveAIChatId(newChatId);
    setSidebarOpen(false); // Close sidebar on mobile
  };

  // Trigger Rename channel action
  const handleRenameChat = (id: string, newTitle: string) => {
    const nextList = aiChats.map((chat) => {
      if (chat.id === id) {
        return { ...chat, title: newTitle };
      }
      return chat;
    });
    saveChats(nextList);
  };

  // Delete channel action
  const handleDeleteChat = (id: string) => {
    const nextList = aiChats.filter((chat) => chat.id !== id);
    saveChats(nextList);
    if (activeAIChatId === id) {
      if (nextList.length > 0) {
        setActiveAIChatId(nextList[0].id);
      } else {
        setActiveAIChatId(null);
      }
    }
  };

  const handleLoginSuccess = (user: User) => {
    // Migrate guest conversations so they are retained in user history upon login
    const guestStorageKey = 'dot_ai_conversations_guest';
    const guestSaved = localStorage.getItem(guestStorageKey);
    const userStorageKey = `dot_ai_conversations_${user.username}`;
    const userSaved = localStorage.getItem(userStorageKey);

    if (guestSaved) {
      try {
        const guestChats = JSON.parse(guestSaved) as AIChatSession[];
        // Filter guest items with user contributions
        const activeGuestChats = guestChats.filter((c) => c.messages.some((m) => m.role === 'user'));
        
        if (activeGuestChats.length > 0) {
          let userChats: AIChatSession[] = [];
          if (userSaved) {
            userChats = JSON.parse(userSaved) as AIChatSession[];
          }
          
          // Merge and avoid double copies
          const uniqueGuestChats = activeGuestChats.filter(
            (g) => !userChats.some((u) => u.id === g.id)
          );
          
          const combined = [...uniqueGuestChats, ...userChats];
          // Recalculate numbering securely to prevent any overlap
          combined.reverse().forEach((c, idx) => {
            c.number = idx + 1;
          });
          combined.reverse();

          localStorage.setItem(userStorageKey, JSON.stringify(combined));
        }
      } catch (e) {
        console.warn('Could not migrate guest chats safely', e);
      }
    }

    setCurrentUser(user);
    localStorage.setItem('dot_ai_user', JSON.stringify(user));
    setCurrentRoute('chat');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('dot_ai_user');
    setCurrentRoute('chat');
    setOnHiddenSpace(false);
  };

  // Find the exact active chat session
  const activeSessionOfUser = aiChats.find(c => c.id === activeAIChatId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center text-white"
          >
            <div className="max-w-xs flex flex-col items-center space-y-5">
              <motion.div
                initial={{ scale: 0.82, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                className="w-28 h-36"
              >
                <DotAiLogo size="100%" />
              </motion.div>
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.45 }}
                className="text-center"
              >
                <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 via-purple-400 to-fuchsia-500 bg-clip-text text-transparent">
                  Dot AI
                </h1>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-mono">
                  Autonomous Companion
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* SIDEBAR CONTAINER */}
      {(currentRoute === 'chat' || currentRoute === 'settings') && (
        <Sidebar
          currentUser={currentUser}
          aiChats={aiChats}
          activeAIChatId={activeAIChatId}
          onSelectChat={(id) => {
            setActiveAIChatId(id);
            setCurrentRoute('chat');
            setSidebarOpen(false); // Close on responsive screen sizes
          }}
          onNewChat={() => {
            handleNewChat();
            setCurrentRoute('chat');
          }}
          onOpenLogin={() => setCurrentRoute('login')}
          onLogout={handleLogout}
          onRenameChat={handleRenameChat}
          onDeleteChat={handleDeleteChat}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenSettings={() => {
            setCurrentRoute('settings');
            setSidebarOpen(false);
          }}
        />
      )}

      {/* WORKSPACE MAIN SCREEN CANVAS */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <AnimatePresence mode="wait">
          {onHiddenSpace && currentUser ? (
            <motion.div
              key="hidden_space"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ willChange: 'transform, opacity' }}
              className="absolute inset-0 flex flex-col h-full w-full overflow-hidden"
            >
              <HiddenSpace
                currentUser={currentUser}
                onClose={() => setOnHiddenSpace(false)}
              />
            </motion.div>
          ) : currentRoute === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ willChange: 'transform, opacity' }}
              className="absolute inset-0 flex flex-col h-full w-full overflow-hidden"
            >
              <ChatScreen
                currentUser={currentUser}
                activeSession={activeSessionOfUser}
                onUpdateSessionMessages={handleUpdateSessionMessages}
                onSendMessage={async (msg, img) => {
                  // Return action text promise (handled natively in ChatScreen stream)
                  return '';
                }}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                onOpenHiddenSpace={() => setShowHiddenSpacePasswordPrompt(true)}
              />
            </motion.div>
          ) : currentRoute === 'settings' && currentUser ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ willChange: 'transform, opacity' }}
              className="absolute inset-0 flex flex-col h-full w-full overflow-hidden"
            >
              <SettingsScreen
                currentUser={currentUser}
                onUpdateUser={(newUser) => {
                  setCurrentUser(newUser);
                  localStorage.setItem('dot_ai_user', JSON.stringify(newUser));
                }}
                onGoBack={() => setCurrentRoute('chat')}
                theme={theme}
                onChangeTheme={setTheme}
              />
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ willChange: 'transform, opacity' }}
              className="absolute inset-0 flex flex-col h-full w-full overflow-hidden"
            >
              <LoginScreen
                onLoginSuccess={handleLoginSuccess}
                onGoBack={() => setCurrentRoute('chat')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

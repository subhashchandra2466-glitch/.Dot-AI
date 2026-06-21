import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Bell, 
  Send, 
  Paperclip, 
  X, 
  MoreVertical, 
  ArrowLeft, 
  Check, 
  Plus, 
  UserPlus, 
  UserCheck, 
  MessageSquare,
  ShieldAlert,
  Sparkles,
  User,
  CornerUpLeft,
  Trash2,
  Lock,
  Heart,
  Palette
} from 'lucide-react';
import MessageContentRenderer from './MessageContentRenderer';

interface HiddenSpaceProps {
  currentUser: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  onClose: () => void;
}

interface SocialRequest {
  id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
}

interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  imageUrl?: string;
  timestamp: string;
  replyTo?: {
    id: string;
    text: string;
    from: string;
  } | null;
  read: boolean;
  delivered: boolean;
  blockedByRecipientAtSendTime?: boolean;
}

interface BlockRecord {
  blocker: string;
  blocked: string;
}

// Preset color themes for Hidden Chat
const CHAT_THEMES = [
  { id: 'purple', name: 'Cosmic Lavender', primary: 'bg-indigo-600', text: 'text-indigo-400', border: 'border-indigo-500/20', hover: 'hover:bg-indigo-550', bubble: 'bg-indigo-600' },
  { id: 'rose', name: 'Neon Rose', primary: 'bg-pink-600', text: 'text-pink-400', border: 'border-pink-500/20', hover: 'hover:bg-pink-550', bubble: 'bg-pink-600' },
  { id: 'slate', name: 'Midnight Slate', primary: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-800/50', hover: 'hover:bg-zinc-700', bubble: 'bg-neutral-800' },
  { id: 'emerald', name: 'Emerald Forest', primary: 'bg-emerald-600', text: 'text-emerald-400', border: 'border-emerald-500/20', hover: 'hover:bg-emerald-550', bubble: 'bg-emerald-600' },
];

export default function HiddenSpace({ currentUser, onClose }: HiddenSpaceProps) {
  const me = currentUser.username.trim().toLowerCase();

  // Root local database triggers
  const [usersPool, setUsersPool] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('dot_users_pool') || '[]');
  });

  // State of requests, messages, and blocks
  const [requests, setRequests] = useState<SocialRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'social' | 'requested' | 'chat' | 'settings'>('social');

  // Chat conversation state
  const [activeChatPeer, setActiveChatPeer] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  
  // Settings/Profile specific
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [username, setUsername] = useState(currentUser.username);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Search bar
  const [searchQuery, setSearchQuery] = useState('');

  // Replying context
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Triple-tap exit detector is configured directly on standard menu click
  const [exitClicks, setExitClicks] = useState(0);
  const [exitToast, setExitToast] = useState('');

  // Dropdown menus
  const [bellOpen, setBellOpen] = useState(false);
  const [peerMenuOpen, setPeerMenuOpen] = useState(false);
  const [confirmBlockUser, setConfirmBlockUser] = useState<string | null>(null);

  // Chat customization theme
  const [chatTheme, setChatTheme] = useState(() => {
    return localStorage.getItem('dot_hidden_theme') || 'purple';
  });

  const activeThemeObj = CHAT_THEMES.find(t => t.id === chatTheme) || CHAT_THEMES[0];

  // Ref triggers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load and subscribe to social database
  useEffect(() => {
    const loadSocialDb = () => {
      try {
        const raw = localStorage.getItem('dot_social_data');
        if (raw) {
          const parsed = JSON.parse(raw);
          setRequests(parsed.requests || []);
          setMessages(parsed.messages || []);
          setBlocks(parsed.blocks || []);
        } else {
          // Initialize empty collection
          const initial = { requests: [], messages: [], blocks: [] };
          localStorage.setItem('dot_social_data', JSON.stringify(initial));
        }
      } catch (err) {
        console.error('Failed to parse social data', err);
      }
    };
    loadSocialDb();

    // Set interval to sync (emulates push messaging when logging out & switching accounts locally!)
    const interval = setInterval(loadSocialDb, 1500);
    return () => clearInterval(interval);
  }, []);

  // Save changes to local storage database
  const saveSocialDb = (nextRequests: SocialRequest[], nextMessages: Message[], nextBlocks: BlockRecord[]) => {
    const payload = {
      requests: nextRequests,
      messages: nextMessages,
      blocks: nextBlocks
    };
    localStorage.setItem('dot_social_data', JSON.stringify(payload));
    setRequests(nextRequests);
    setMessages(nextMessages);
    setBlocks(nextBlocks);
  };

  // Mark messages from peer to me as read whenever chat is open
  useEffect(() => {
    if (!activeChatPeer) return;
    const peerKey = activeChatPeer.toLowerCase();

    const hasUnread = messages.some(m => m.from === peerKey && m.to === me && !m.read);
    if (hasUnread) {
      const updatedMessages = messages.map(m => {
        if (m.from === peerKey && m.to === me) {
          return { ...m, read: true };
        }
        return m;
      });
      saveSocialDb(requests, updatedMessages, blocks);
    }
  }, [activeChatPeer, messages]);

  // Scroll to bottom of chat screen automatically
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatPeer, messages]);

  // Triple-tap monitor logic
  const handleMenuTripleTap = () => {
    setExitClicks(prev => {
      const next = prev + 1;
      if (next === 1) {
        setExitToast('Tap 2 more times to exit hidden security screen');
        setTimeout(() => setExitToast(''), 1500);
      } else if (next === 2) {
        setExitToast('Tap 1 more time to exit');
        setTimeout(() => setExitToast(''), 1500);
      } else if (next >= 3) {
        setExitToast('');
        onClose();
        return 0;
      }
      return next;
    });
  };

  // Reset clicks after delay
  useEffect(() => {
    if (exitClicks > 0) {
      const timer = setTimeout(() => {
        setExitClicks(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [exitClicks]);

  // SENDING AN OUTGOING FRIEND REQUEST
  const triggerSendRequest = (targetUser: string) => {
    const peer = targetUser.trim().toLowerCase();
    
    // Check if request already exists
    const exists = requests.find(r => 
      (r.from === me && r.to === peer) || (r.from === peer && r.to === me)
    );

    if (exists) return;

    const newReq: SocialRequest = {
      id: 'req_' + Date.now(),
      from: me,
      to: peer,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    saveSocialDb([...requests, newReq], messages, blocks);
  };

  // CANCELING FRIEND REQUEST
  const triggerCancelRequest = (targetUser: string) => {
    const peer = targetUser.trim().toLowerCase();
    const updated = requests.filter(r => r.from === me && r.to === peer && r.status === 'pending');
    const remaining = requests.filter(r => !(r.from === me && r.to === peer && r.status === 'pending'));
    saveSocialDb(remaining, messages, blocks);
  };

  // ACCEPTING REQUEST
  const triggerAcceptRequest = (requestId: string) => {
    const updated = requests.map(r => {
      if (r.id === requestId) {
        return { ...r, status: 'accepted' as const };
      }
      return r;
    });
    saveSocialDb(updated, messages, blocks);
    setBellOpen(false);
  };

  // REJECTING REQUEST
  const triggerRejectRequest = (requestId: string) => {
    const updated = requests.filter(r => r.id !== requestId);
    saveSocialDb(updated, messages, blocks);
    setBellOpen(false);
  };

  // SENDING MESSAGE ATTACHED DATA
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = () => {
    if (!activeChatPeer) return;
    const peer = activeChatPeer.toLowerCase();
    const text = inputText.trim();

    if (!text && !attachedImage) return;

    // Check if Bob has blocked me (the sender)
    // "Blocked users can send but you won't receive. Messages sent during block never appear after unblock."
    const isBlockedByPeer = blocks.some(b => b.blocker === peer && b.blocked === me);

    const newMsg: Message = {
      id: 'msg_' + Date.now(),
      from: me,
      to: peer,
      text: text,
      imageUrl: attachedImage || undefined,
      timestamp: new Date().toISOString(),
      read: false,
      delivered: true,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        from: replyingTo.from
      } : null,
      blockedByRecipientAtSendTime: isBlockedByPeer ? true : undefined
    };

    saveSocialDb(requests, [...messages, newMsg], blocks);
    setInputText('');
    setAttachedImage(null);
    setReplyingTo(null);
  };

  // BLOCK USER ACTION
  const handleBlockUser = (targetUser: string) => {
    const peer = targetUser.toLowerCase();
    const alreadyBlocked = blocks.some(b => b.blocker === me && b.blocked === peer);
    if (alreadyBlocked) return;

    const updatedBlocks = [...blocks, { blocker: me, blocked: peer }];
    saveSocialDb(requests, messages, updatedBlocks);
    setConfirmBlockUser(null);
    setPeerMenuOpen(false);
  };

  // UNBLOCK USER ACTION
  const handleUnblockUser = (targetUser: string) => {
    const peer = targetUser.toLowerCase();
    const updatedBlocks = blocks.filter(b => !(b.blocker === me && b.blocked === peer));
    saveSocialDb(requests, messages, updatedBlocks);
    setConfirmBlockUser(null);
    setPeerMenuOpen(false);
  };

  // DELETE CHAT HISTORY FOR MYSELF
  const handleDeleteMyChatHistory = (targetUser: string) => {
    const peer = targetUser.toLowerCase();
    const confirmation = window.confirm(`Clear chat history with @${peer}? This cannot be undone.`);
    if (!confirmation) return;

    // Remove all messages between me and them
    const filtered = messages.filter(m => 
      !( (m.from === me && m.to === peer) || (m.from === peer && m.to === me) )
    );
    saveSocialDb(requests, filtered, blocks);
    setActiveChatPeer(null);
    setPeerMenuOpen(false);
  };

  // Swipe gesture simulation states
  const [activeSwipeMsgId, setActiveSwipeMsgId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);

  const handleTouchStart = (msgId: string, clientX: number) => {
    setActiveSwipeMsgId(msgId);
    setTouchStartX(clientX);
    setSwipeX(0);
  };

  const handleTouchMove = (clientX: number) => {
    if (!activeSwipeMsgId) return;
    const diff = clientX - touchStartX;
    // Only allow swipe to the right, maximum 90px
    if (diff > 0) {
      setSwipeX(Math.min(90, diff));
    }
  };

  const handleTouchEnd = (msg: Message) => {
    if (swipeX > 55) {
      setReplyingTo(msg);
    }
    setActiveSwipeMsgId(null);
    setSwipeX(0);
  };

  // Get active friend user list
  const activeFriendUsernames = requests
    .filter(r => r.status === 'accepted')
    .map(r => r.from === me ? r.to : r.from);

  const activeFriends = usersPool.filter(u => 
    activeFriendUsernames.includes(u.username.toLowerCase())
  );

  // Incoming pending requests
  const pendingIncomingRequests = requests.filter(r => 
    r.to === me && r.status === 'pending'
  );

  // Triple-tap exit monitor
  const [tapCount, setTapCount] = useState(0);

  const handleScreenTripleTap = () => {
    setTapCount(prev => {
      const next = prev + 1;
      if (next >= 3) {
        onClose();
        return 0;
      }
      return next;
    });
  };

  useEffect(() => {
    if (tapCount > 0) {
      const timer = setTimeout(() => {
        setTapCount(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tapCount]);

  return (
    <div 
      className="flex-1 flex flex-col h-full bg-slate-900 border-l border-slate-800 text-white relative font-sans select-none overflow-hidden animate-fade-in-down"
      onClick={handleScreenTripleTap}
    >
      
      {/* 1. TOP STATUS / NAVIGATION HEADER (Trendy Instagram dark gradient theme) */}
      <div className="bg-slate-950/90 backdrop-blur-md px-4 py-3 border-b border-slate-800/80 flex items-center justify-between z-30">
        
        {/* Left Side: Triple Tap Close Core */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleMenuTripleTap}
            className="p-2 text-slate-350 hover:text-white rounded-xl hover:bg-slate-850 active:scale-95 transition flex items-center gap-1 cursor-pointer"
            title="Triple tap menu to close"
            id="triple_tap_menu_btn"
          >
            <Menu className="w-5 h-5 stroke-[2.2px] text-purple-400" />
            <span className="hidden sm:inline text-xs font-black tracking-wide text-slate-400">
              Hidden Space
            </span>
          </button>
        </div>

        {/* Brand center banner */}
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 bg-clip-text text-transparent italic font-black text-lg select-none">
          <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
          dot.social
        </div>

        {/* Right side: Notification Bell & Home exit */}
        <div className="relative flex items-center gap-1.5">
          {/* Bell button with Notification count */}
          <button
            onClick={() => setBellOpen(!bellOpen)}
            className="p-2 text-slate-350 hover:text-white rounded-xl hover:bg-slate-850 transition relative cursor-pointer"
            id="bell_notification_trigger"
          >
            <Bell className="w-5 h-5 text-pink-400" />
            {pendingIncomingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse border-2 border-slate-950">
                {pendingIncomingRequests.length}
              </span>
            )}
          </button>
          
          <button
            onClick={onClose}
            className="text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 font-extrabold px-3 py-2 rounded-xl transition"
          >
            Exit
          </button>

          {/* BELL NOTIFICATION DRAWER / PANEL */}
          {bellOpen && (
            <div className="absolute right-0 top-12 w-72 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-left space-y-3.5 animate-zoom-in">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <span className="text-xs font-black tracking-tighter uppercase text-slate-400">
                  Follow requests ({pendingIncomingRequests.length})
                </span>
                <button onClick={() => setBellOpen(false)} className="text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {pendingIncomingRequests.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500 font-medium">
                  No pending friendship requests
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {pendingIncomingRequests.map(req => {
                    const requester = usersPool.find(u => u.username === req.from) || { displayName: req.from };
                    return (
                      <div key={req.id} className="flex flex-col gap-2 p-2.5 bg-slate-900 border border-slate-850 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 shrink-0">
                            {requester.avatarUrl ? (
                              <img src={requester.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-extrabold text-sm uppercase text-purple-400">
                                {req.from.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white truncate">{requester.displayName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">@{req.from}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            onClick={() => triggerRejectRequest(req.id)}
                            className="py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-black cursor-pointer uppercase transition"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => triggerAcceptRequest(req.id)}
                            className="py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg text-[10px] font-black cursor-pointer uppercase transition"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TRIPLE-TAP NOTIFICATION TOAST BAR */}
      {exitToast && (
        <div className="bg-indigo-650/95 text-white py-2 text-xs font-bold text-center border-b border-indigo-500 animate-pulse transition">
          {exitToast}
        </div>
      )}

      {/* 2. CHOOSE NAVIGATION TABS: Social | Requested | Chat | Settings */}
      <div className="bg-slate-950 pb-0.5 border-b border-slate-900 grid grid-cols-4 select-none">
        
        {/* TAB 1: Social */}
        <button
          onClick={() => { setActiveTab('social'); }}
          className={`py-3.5 text-xs font-black tracking-tight text-center relative border-b-2 transition ${
            activeTab === 'social' 
              ? 'border-pink-500 text-pink-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Social
        </button>

        {/* TAB 2: Requested */}
        <button
          onClick={() => { setActiveTab('requested'); }}
          className={`py-3.5 text-xs font-black tracking-tight text-center relative border-b-2 transition ${
            activeTab === 'requested' 
              ? 'border-pink-500 text-pink-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Requested
        </button>

        {/* TAB 3: Chat */}
        <button
          onClick={() => { setActiveTab('chat'); }}
          className={`py-3.5 text-xs font-black tracking-tight text-center relative border-b-2 transition ${
            activeTab === 'chat' 
              ? 'border-pink-500 text-pink-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          id="tab_trigger_chat"
        >
          <span className="inline-flex items-center gap-1 justify-center">
            Chat
            {messages.some(m => m.to === me && !m.read) && (
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping inline-block" />
            )}
          </span>
        </button>

        {/* TAB 4: Settings */}
        <button
          onClick={() => { setActiveTab('settings'); }}
          className={`py-3.5 text-xs font-black tracking-tight text-center relative border-b-2 transition ${
            activeTab === 'settings' 
              ? 'border-pink-500 text-pink-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Settings
        </button>

      </div>

      {/* 3. CORE SUB-SCREEN ROUTER */}
      <div className="flex-1 flex flex-col overflow-y-auto w-full relative">

        {/* ================= SOCIAL TAB ================= */}
        {activeTab === 'social' && (
          <div className="p-4 space-y-4 animate-fade-in-down text-left">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest pl-1 mb-3">
                Discover registered accounts
              </p>
            </div>

            <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-slate-950 overflow-hidden">
              {usersPool.filter(u => u.username.toLowerCase() !== me).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-bold">
                  You are currently the only registered account. Switch credentials or register a new colleague to start communicating!
                </div>
              ) : (
                usersPool
                  .filter(u => u.username.toLowerCase() !== me)
                  .map(otherUser => {
                    const peerKey = otherUser.username.trim().toLowerCase();
                    
                    // Relationship checking state
                    const outgoingPending = requests.find(r => r.from === me && r.to === peerKey && r.status === 'pending');
                    const incomingPending = requests.find(r => r.from === peerKey && r.to === me && r.status === 'pending');
                    const accepted = requests.find(r => 
                      ((r.from === me && r.to === peerKey) || (r.from === peerKey && r.to === me)) && r.status === 'accepted'
                    );

                    return (
                      <div key={otherUser.username} className="p-3.5 flex items-center justify-between hover:bg-slate-900/40 transition">
                        {/* Left Side: Avatar Details */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full border border-slate-800 bg-slate-900 overflow-hidden shrink-0">
                            {otherUser.avatarUrl ? (
                              <img src={otherUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-black text-sm uppercase text-slate-400">
                                {otherUser.displayName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black truncate">{otherUser.displayName}</h4>
                            <p className="text-[10px] text-slate-400 font-mono truncate">@{otherUser.username}</p>
                          </div>
                        </div>

                        {/* Right side: Status toggle cycles: Request -> Requested -> Chat */}
                        <div>
                          {accepted ? (
                            <button
                              onClick={() => {
                                setActiveChatPeer(otherUser.username);
                                setActiveTab('chat');
                              }}
                              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-[10px] font-black rounded-lg uppercase flex items-center gap-1 transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
                              Chat
                            </button>
                          ) : outgoingPending ? (
                            <button
                              onClick={() => triggerCancelRequest(otherUser.username)}
                              className="px-3 py-1.5 border border-slate-700/80 hover:border-red-500/50 hover:bg-red-500/10 text-slate-450 hover:text-red-400 text-[10px] font-black rounded-lg uppercase transition cursor-pointer"
                            >
                              Requested
                            </button>
                          ) : incomingPending ? (
                            <button
                              onClick={() => triggerAcceptRequest(incomingPending.id)}
                              className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black rounded-lg uppercase transition animate-pulse cursor-pointer"
                            >
                              Accept
                            </button>
                          ) : (
                            <button
                              onClick={() => triggerSendRequest(otherUser.username)}
                              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 path to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[10px] font-black rounded-lg uppercase transition flex items-center gap-1 cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Request
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Instruction Footer Card */}
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-2 mt-4">
              <span className="text-[9px] font-black tracking-widest text-pink-400 uppercase font-mono">
                System configuration tip
              </span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Log into another registered account on a separate tab or log out from current to test the complete incoming Social follower request notification bells.
              </p>
            </div>
          </div>
        )}

        {/* ================= REQUESTED TAB ================= */}
        {activeTab === 'requested' && (
          <div className="p-4 space-y-4 animate-fade-in-down text-left">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest pl-1 mb-3">
                Outgoing pending requests
              </p>
            </div>

            <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-slate-950 overflow-hidden">
              {requests.filter(r => r.from === me && r.status === 'pending').length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-bold">
                  No outgoing requested invitations.
                </div>
              ) : (
                requests
                  .filter(r => r.from === me && r.status === 'pending')
                  .map(req => {
                    const peerUser = usersPool.find(u => u.username.toLowerCase() === req.to.toLowerCase()) || { displayName: req.to, username: req.to };
                    
                    return (
                      <div key={req.id} className="p-3.5 flex items-center justify-between hover:bg-slate-900/40 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 overflow-hidden shrink-0">
                            {peerUser.avatarUrl ? (
                              <img src={peerUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold uppercase text-slate-400">
                                {peerUser.displayName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-black">{peerUser.displayName}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">@{peerUser.username}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => triggerCancelRequest(peerUser.username)}
                          className="px-3 py-1.5 border border-slate-850 hover:bg-red-500/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 text-[10px] uppercase font-black rounded-lg transition"
                        >
                          Cancel Request
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* ================= CHAT TAB (WhatsApp / Instagram-style) ================= */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden select-text text-left">
            
            {/* Search Bar */}
            <div className="px-4 py-2 bg-slate-950">
              <input 
                type="text" 
                placeholder="Search by name/username..." 
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* IF NO ACTIVE PEER SELECTED: SHOW INBOX DIRECTORY */}
            {!activeChatPeer ? (
              <div className="p-4 space-y-4 animate-fade-in-down flex-1">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest pl-1 mb-3">
                    Active Conversations ({activeFriends.filter(f => f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || f.username.toLowerCase().includes(searchQuery.toLowerCase())).length})
                  </p>
                </div>

                {activeFriends.filter(f => f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || f.username.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center py-12 gap-3">
                    <div className="p-3 bg-slate-900 rounded-full border border-slate-850">
                      <Lock className="w-6 h-6 text-pink-400 animate-pulse" />
                    </div>
                    <p className="text-xs text-slate-400 font-bold">Your hidden network is empty.</p>
                    <p className="text-[10px] text-slate-500 max-w-xs text-center leading-relaxed">
                      Send a request to standard registered users in the Social tab or accept incoming requests in the Bell.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl bg-slate-950 overflow-hidden shadow-xl">
                    {activeFriends.filter(f => f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || f.username.toLowerCase().includes(searchQuery.toLowerCase())).map(friend => {
                      const peerKey = friend.username.toLowerCase();
                      
                      // Filter messages between Me & Friend (EXCLUDING messages sent to me while blocked!)
                      const myMsgsWithFriend = messages.filter(m => {
                        const isBetween = (m.from === me && m.to === peerKey) || (m.from === peerKey && m.to === me);
                        if (!isBetween) return false;
                        if (m.to === me && m.blockedByRecipientAtSendTime) return false;
                        return true;
                      });

                      const lastMsg = myMsgsWithFriend[myMsgsWithFriend.length - 1];
                      const unreadCount = myMsgsWithFriend.filter(m => m.from === peerKey && m.to === me && !m.read).length;

                      return (
                        <div
                          key={friend.username}
                          onClick={() => setActiveChatPeer(friend.username)}
                          className="p-3.5 flex items-center justify-between hover:bg-slate-900/40 transition cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="relative shrink-0">
                              <div className="w-11 h-11 rounded-full border border-slate-800 overflow-hidden bg-slate-900">
                                {friend.avatarUrl ? (
                                  <img src={friend.avatarUrl} alt="DP" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-black text-sm uppercase text-slate-400">
                                    {friend.displayName.charAt(0)}
                                  </div>
                                )}
                              </div>
                              {/* Green Active Dot indicator */}
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-950 rounded-full" />
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-white">{friend.displayName}</h4>
                              <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                                {lastMsg ? (
                                  lastMsg.imageUrl ? '📷 Picture attached' : lastMsg.text
                                ) : (
                                  `Start chat with @${friend.username}`
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {lastMsg && (
                              <p className="text-[8px] text-slate-500 font-bold font-mono">
                                {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            {unreadCount > 0 && (
                              <span className="bg-pink-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full select-none">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              
              // ================= ACTIVE WHATSAPP CHAT SCREEN WINDOW =================
              <div className="flex-grow flex flex-col h-full bg-slate-950/80 max-w-3xl mx-auto w-full border-x border-slate-900 relative overflow-hidden animate-fade-in">
                
                {/* Peer Conversation Titlebar */}
                <div className="px-3.5 py-2.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between select-none z-10">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveChatPeer(null)}
                      className="p-1.5 hover:bg-slate-850 rounded-xl transition cursor-pointer"
                      title="Back to inbox"
                    >
                      <ArrowLeft className="w-4.5 h-4.5 text-slate-400" />
                    </button>

                    <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative shrink-0">
                      {(() => {
                        const peerU = usersPool.find(u => u.username.toLowerCase() === activeChatPeer.toLowerCase()) || {};
                        return peerU.avatarUrl ? (
                          <img src={peerU.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-xs text-slate-400 uppercase">
                            {activeChatPeer.charAt(0)}
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <h3 className="text-xs font-black text-white">
                        {(() => {
                          const peerU = usersPool.find(u => u.username.toLowerCase() === activeChatPeer.toLowerCase()) || {};
                          return peerU.displayName || activeChatPeer;
                        })()}
                      </h3>
                      <p className="text-[9px] text-slate-400 flex items-center gap-1 font-medium font-mono">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        active connected
                      </p>
                    </div>
                  </div>

                  {/* Dropdown 3 dots menu inside open chat */}
                  <div className="relative">
                    <button
                      onClick={() => setPeerMenuOpen(!peerMenuOpen)}
                      className="p-1.5 hover:bg-slate-850 rounded-xl transition cursor-pointer"
                      id="peer_dots_menu_trigger"
                    >
                      <MoreVertical className="w-4.5 h-4.5 text-slate-400" />
                    </button>

                    {peerMenuOpen && (
                      <div className="absolute right-0 top-9 w-44 bg-slate-950 border border-slate-850 rounded-xl shadow-2xl p-1 z-30 text-left">
                        
                        {/* Block / Unblock option */}
                        {blocks.some(b => b.blocker === me && b.blocked === activeChatPeer.toLowerCase()) ? (
                          <button
                            onClick={() => handleUnblockUser(activeChatPeer)}
                            className="w-full px-3 py-2 text-left text-xs font-bold text-green-400 hover:bg-slate-900 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                          >
                            Unblock User
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setConfirmBlockUser(activeChatPeer);
                              setPeerMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-bold text-red-400 hover:bg-slate-900 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                            id="block_target_user_btn"
                          >
                            Block User
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteMyChatHistory(activeChatPeer)}
                          className="w-full px-3 py-2 text-left text-xs font-bold text-slate-350 hover:bg-slate-900 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                        >
                          Clear Chat
                        </button>
                        
                      </div>
                    )}
                  </div>
                </div>

                {/* MODAL WINDOW FOR BLOCK CONFIRMATION */}
                {confirmBlockUser && (
                  <div className="absolute inset-0 bg-slate-950/90 z-40 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl max-w-xs space-y-4 shadow-2xl text-center">
                      <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center animate-bounce">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">Block @{confirmBlockUser}?</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-2">
                          Are you sure you want to block @{confirmBlockUser}? You will not receive any of their incoming messages. They can send, but you won't hear them. Messages sent during block never appear after unblock.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => setConfirmBlockUser(null)}
                          className="py-1.5 bg-slate-800 text-slate-300 text-[10px] font-black uppercase rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleBlockUser(confirmBlockUser)}
                          className="py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase rounded-lg cursor-pointer"
                          id="confirm_block_action_btn"
                        >
                          Confirm Block
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. CHAT MESSAGES PANEL */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 relative select-text" id="hidden_messages_pane">
                  
                  {/* SYSTEM BLOCK NOTICE IF ALREADY BLOCKED */}
                  {blocks.some(b => b.blocker === me && b.blocked === activeChatPeer.toLowerCase()) && (
                    <div className="mx-auto w-fit p-3 bg-red-950/20 border border-red-900/40 text-red-400 text-[10px] font-black uppercase rounded-xl flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      You have blocked this colleague
                    </div>
                  )}

                  {(() => {
                    const peerKey = activeChatPeer.toLowerCase();
                    const filteredMessages = messages.filter(m => {
                      const isBetweenSelected = (m.from === me && m.to === peerKey) || (m.from === peerKey && m.to === me);
                      if (!isBetweenSelected) return false;
                      
                      // Filter out messages to me that were sent when I blocked them
                      if (m.to === me && m.blockedByRecipientAtSendTime) {
                        return false;
                      }
                      return true;
                    });

                    if (filteredMessages.length === 0) {
                      return (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-1.5 py-12">
                          <Lock className="w-5 h-5 text-slate-600" />
                          <p className="text-[10px] text-slate-500 font-mono uppercase">
                            No messages here. End-to-end local encrypted
                          </p>
                          <p className="text-[9px] text-slate-650 max-w-xs mt-1">
                            Swipe correct message right to trigger instant replies.
                          </p>
                        </div>
                      );
                    }

                    return filteredMessages.map((msg) => {
                      const isMe = msg.from === me;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full items-center relative group`}
                        >
                          {/* REPLY HOVER LINK INDICATOR ON LEFT FOR SENDER OR RIGHT FOR RECIPIENT */}
                          <div 
                            onClick={() => setReplyingTo(msg)}
                            className="hidden group-hover:flex items-center justify-center p-1 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-full text-slate-400 hover:text-white cursor-pointer select-none absolute -left-7 top-1/2 -translate-y-1/2 transition z-20"
                            title="Reply to message"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5" />
                          </div>

                          {/* Message container (support mouse swipe-to-reply via click-to-reply action) */}
                          <div
                            onTouchStart={(e) => handleTouchStart(msg.id, e.touches[0].clientX)}
                            onTouchMove={(e) => handleTouchMove(e.touches[0].clientX)}
                            onTouchEnd={() => handleTouchEnd(msg)}
                            onMouseDown={(e) => handleTouchStart(msg.id, e.clientX)}
                            onMouseMove={(e) => activeSwipeMsgId === msg.id && handleTouchMove(e.clientX)}
                            onMouseUp={() => activeSwipeMsgId === msg.id && handleTouchEnd(msg)}
                            style={{
                              transform: activeSwipeMsgId === msg.id ? `translateX(${swipeX}px)` : 'none',
                              transition: activeSwipeMsgId === msg.id ? 'none' : 'transform 0.15s ease'
                            }}
                            className={`max-w-[78%] rounded-2xl p-3 shadow-xs relative flex flex-col ${
                              isMe 
                                ? `${activeThemeObj.bubble} text-white rounded-tr-none text-right` 
                                : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none text-left'
                            } cursor-grab active:cursor-grabbing`}
                          >
                            {/* IF HAS REPLY METADATA: RENDERING THE QUOTE CARD ACCORDINGLY */}
                            {msg.replyTo && (
                              <div className="mb-2 p-1.5 pl-2 border-l-2 border-purple-400 bg-black/30 rounded-lg text-left text-[10px] text-slate-350 truncate">
                                <span className="font-extrabold block text-pink-400 font-sans">
                                  @{msg.replyTo.from === me ? 'You' : msg.replyTo.from}
                                </span>
                                {msg.replyTo.text}
                              </div>
                            )}

                            {/* Attached image if any */}
                            {msg.imageUrl && (
                              <div className="rounded-xl overflow-hidden mb-1.5 border border-black/10 max-h-56">
                                <img src={msg.imageUrl} alt="Attached asset" className="w-full h-full object-cover" />
                              </div>
                            )}

                            {/* Message text */}
                            {msg.text && (
                              <div className="text-xs leading-relaxed font-semibold pr-1.5 word-break text-left">
                                <MessageContentRenderer text={msg.text} />
                              </div>
                            )}

                            {/* Micro panel with readreceipt ticks */}
                            <div className="flex items-center justify-end gap-1 mt-1 shrink-0 select-none">
                              {isMe && (
                                <div className="flex items-center shrink-0">
                                  {msg.read ? (
                                    /* 2 Blue checks if read */
                                    <div className="flex -space-x-1.5 text-sky-400">
                                      <Check className="w-3 h-3 stroke-[3px]" />
                                      <Check className="w-3 h-3 stroke-[3px]" />
                                    </div>
                                  ) : (
                                    /* 2 Grey checks if delivered unread */
                                    <div className="flex -space-x-1.5 text-slate-500">
                                      <Check className="w-3 h-3 stroke-[3px]" />
                                      <Check className="w-3 h-3 stroke-[3px]" />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}

                  <div ref={chatBottomRef} />
                </div>

                {/* 4. ATTACHED REPLY TO QUOTE BANNER PREVIEW (Stretched above the fields) */}
                {replyingTo && (
                  <div className="px-4 py-2 bg-slate-950 border-t border-slate-900 flex items-center justify-between text-left select-none animate-fade-in-down z-10">
                    <div className="pl-2 border-l-2 border-pink-500 text-[10px] text-slate-400 truncate">
                      <p className="font-extrabold text-pink-400">Replying to @{replyingTo.from === me ? 'You' : replyingTo.from}</p>
                      <p className="truncate text-slate-300 mt-0.5">{replyingTo.text || '📷 Photo'}</p>
                    </div>

                    <button
                      onClick={() => setReplyingTo(null)}
                      className="p-1 hover:bg-slate-850 rounded-full text-slate-500 hover:text-white transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 5. ATTACHED DIRECT IMAGE UPLOAD PREVIEW */}
                {attachedImage && (
                  <div className="px-4 py-2 bg-slate-950 border-t border-slate-900 flex items-center justify-between z-10 select-none">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-800">
                        <img src={attachedImage} alt="Preview attach" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">Image prepped to attach</span>
                    </div>

                    <button
                      onClick={() => setAttachedImage(null)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 6. WHATSAPP CHAT INPUT ACTIONS BOTTOMBAR CONTAINER */}
                <div className="p-3 bg-slate-950 border-t border-slate-900 flex items-center gap-2 select-none z-10" id="chat_composer_bar">
                  
                  {/* Photo picker button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition shrink-0 cursor-pointer"
                    title="Attach image photo"
                    id="attach_media_btn"
                  >
                    <Paperclip className="w-4.5 h-4.5" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />

                  {/* Standard text area */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none text-white text-xs px-4 py-3 rounded-xl min-w-0"
                    placeholder="Type encrypted message..."
                    id="composer_message_text_input"
                  />

                  {/* Send Action */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() && !attachedImage}
                    className={`p-3 rounded-xl transition font-black shrink-0 flex items-center justify-center cursor-pointer ${
                      inputText.trim() || attachedImage 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' 
                        : 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed'
                    }`}
                    id="composer_submit_btn"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ================= SETTINGS TAB ================= */}
        {activeTab === 'settings' && (
          <div className="p-4 space-y-4 animate-fade-in-down text-left">
            
            {/* PROFILE & SECURITY SETTINGS */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                <div className="flex items-center gap-2">
                  <User className="w-4.5 h-4.5 text-pink-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Hidden Space Profile
                  </h3>
                </div>
              </div>
              <div className="space-y-4">
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name" className="w-full bg-slate-900 p-2 text-xs rounded-lg border border-slate-800 text-white" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full bg-slate-900 p-2 text-xs rounded-lg border border-slate-800 text-white" />
                <button className="w-full bg-pink-600 text-white p-2 text-xs font-bold rounded-lg cursor-pointer">Save Profile</button>
                
                <div className="border-t border-slate-900 pt-4 space-y-4">
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Hidden Space Password" className="w-full bg-slate-900 p-2 text-xs rounded-lg border border-slate-800 text-white" />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="w-full bg-slate-900 p-2 text-xs rounded-lg border border-slate-800 text-white" />
                  <button className="w-full bg-indigo-600 text-white p-2 text-xs font-bold rounded-lg cursor-pointer">Update Password</button>
                </div>
              </div>
            </div>

            {/* Visual configuration cards */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                <Palette className="w-4.5 h-4.5 text-pink-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Visual bubble customization
                </h3>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] text-slate-400">
                  Select a trendy ambient shade palette for your chat message bubbles in this private space:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {CHAT_THEMES.map(themeOption => (
                    <button
                      key={themeOption.id}
                      onClick={() => {
                        setChatTheme(themeOption.id);
                        localStorage.setItem('dot_hidden_theme', themeOption.id);
                      }}
                      className={`p-3.5 rounded-xl border text-left transition relative flex flex-col gap-1.5 cursor-pointer ${
                        chatTheme === themeOption.id 
                          ? 'border-pink-500 bg-slate-900 text-white' 
                          : 'border-slate-850 bg-slate-950 text-slate-350 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">{themeOption.name}</span>
                        <span className={`w-3 h-3 rounded-full ${themeOption.bubble}`} />
                      </div>
                      
                      {chatTheme === themeOption.id && (
                        <span className="absolute bottom-1 right-2 w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SECURITY INFORMATION BANNER */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                <Lock className="w-4.5 h-4.5 text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  System Security Architecture
                </h3>
              </div>

              <div className="space-y-2.5 text-[10.5px] leading-relaxed text-slate-405 text-slate-400">
                <p>
                  • **Universal stealth activation**: The space is accessed by typing your correct password in standard Dot AI chatbot conversation windows.
                </p>
                <p>
                  • **Destructible entry logs**: Input passkeys used for opening are instantly expunged from the active user's AI session history to prevent screen-peeking vector leaks.
                </p>
                <p>
                  • **Standard safety backups**: In the event that you feel compromised, swipe left or triple tap the top-left menu icon to safely lock credentials.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl border-dashed mt-2">
                <p className="text-[9.5px] text-pink-400 text-center font-bold tracking-tight">
                  🔒 Encrypted on current browser container instance
                </p>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}

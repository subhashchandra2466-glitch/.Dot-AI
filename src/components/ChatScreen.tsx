import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  X, 
  Menu, 
  Sparkles, 
  AlertTriangle 
} from 'lucide-react';
import { AIChatSession, AIChatMessage, User } from '../types';
import MessageContentRenderer from './MessageContentRenderer';
import PremiumImage from './PremiumImage';

interface ChatScreenProps {
  currentUser: User | null;
  activeSession: AIChatSession | null;
  onSendMessage: (text: string, imageBase64?: string) => Promise<string>;
  onToggleSidebar: () => void;
  onUpdateSessionMessages: (
    sessionId: string, 
    messagesOrUpdater: AIChatMessage[] | ((currentMsgs: AIChatMessage[]) => AIChatMessage[])
  ) => void;
  onOpenHiddenSpace?: () => void;
}

export default function ChatScreen({
  currentUser,
  activeSession,
  onSendMessage,
  onToggleSidebar,
  onUpdateSessionMessages,
  onOpenHiddenSpace
}: ChatScreenProps) {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wordQueueRef = useRef<string[]>([]);
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypewriterRunningRef = useRef<boolean>(false);

  // Auto-scroll on new messages or typing updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isTyping]);

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('We only accept image files.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Launch word-by-word streaming typewriter loop
  const startTypewriterLoop = (sessionId: string, targetMessageId: string) => {
    if (isTypewriterRunningRef.current) return;
    isTypewriterRunningRef.current = true;

    const pump = () => {
      if (wordQueueRef.current.length > 0) {
        const nextWord = wordQueueRef.current.shift();
        
        onUpdateSessionMessages(sessionId, (currentMsgs) => {
          return currentMsgs.map((m) => {
            if (m.id === targetMessageId) {
              const separator = m.text ? ' ' : '';
              return { ...m, text: m.text + separator + nextWord };
            }
            return m;
          });
        });

        typewriterTimeoutRef.current = setTimeout(pump, 15);
      } else {
        isTypewriterRunningRef.current = false;
      }
    };

    typewriterTimeoutRef.current = setTimeout(pump, 15);
  };

  const handleSend = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText && !selectedImage) return;

    // Check if entered text matches the exact current user password in dot_users_pool
    if (currentUser?.username) {
      try {
        const poolStr = localStorage.getItem('dot_users_pool') || '[]';
        const usersPool = JSON.parse(poolStr);
        const userRecord = usersPool.find(
          (u: any) => u.username.toLowerCase() === currentUser.username.toLowerCase()
        );
        const correctPassword = userRecord?.password;

        if (correctPassword && trimmedText === correctPassword) {
          setErrorStatus(null);
          setInputText('');
          setSelectedImage(null);
          if (onOpenHiddenSpace) {
            onOpenHiddenSpace();
          }
          return; // Strictly exits to satisfy: "Delete password message and do not save to history."
        }
      } catch (err) {
        console.warn('Could not verify password for hidden space trigger', err);
      }
    }

    setErrorStatus(null);
    setInputText('');
    const imageToSubmit = selectedImage;
    setSelectedImage(null);

    if (!activeSession) return;

    // 1. Create and render the User Message
    const userMessage: AIChatMessage = {
      id: 'user_msg_' + Date.now(),
      role: 'user',
      text: trimmedText,
      imageUrl: imageToSubmit || undefined,
      timestamp: new Date().toISOString()
    };

    const updatedUserMsgs = [...activeSession.messages, userMessage];
    onUpdateSessionMessages(activeSession.id, updatedUserMsgs);

    // 2. Set absolute typing indicator state to true
    setIsTyping(true);

    const botMessageId = 'bot_msg_stream_' + Date.now();
    const botPlaceholderMsg: AIChatMessage = {
      id: botMessageId,
      role: 'model',
      text: '',
      timestamp: new Date().toISOString()
    };

    wordQueueRef.current = []; // Reset queue

    try {
      // 3. Fire API request (via proxy backend streaming)
      const chatHistory = activeSession.messages.slice(-10).map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedText || 'Describe this uploaded image in rich detail.',
          image: imageToSubmit ? { data: imageToSubmit, mimeType: 'image/png' } : undefined,
          history: chatHistory,
          systemInstruction: "You are a helpful, smart, warm, and highly visual personal companion assistant. Keep answers natural, empathetic, and witty. Avoid tech jargon. DO NOT introduce yourself or state your name in your responses."
        })
      });

      if (!response.ok) {
        throw new Error('API server returned error');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Unreadable server response stream');

      // Add empty bot message so typewriter can start outputting
      onUpdateSessionMessages(activeSession.id, [...updatedUserMsgs, botPlaceholderMsg]);

      setIsTyping(false); // Typing state turns false immediately once streaming starts

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || !cleanLine.startsWith('data: ')) continue;
          
          const rawData = cleanLine.slice(6);
          if (rawData === '[DONE]') break;

          try {
            const parsed = JSON.parse(rawData);
            if (parsed.text) {
              // Convert the incoming chunk text into words and push onto queue
              const words = parsed.text.split(' ').filter((w: string) => w !== '');
              wordQueueRef.current.push(...words);
              
              // Start the typing loop if not yet active
              startTypewriterLoop(activeSession.id, botMessageId);
            }
          } catch (e) {
            // Ignore partial parse failures
          }
        }
      }

    } catch (err: any) {
      console.warn('Real AI Connection failed or not setup. Simulating custom reply with 50ms typewriter...', err);
      
      // Clear typing indicator and add empty message
      setIsTyping(false);
      onUpdateSessionMessages(activeSession.id, [...updatedUserMsgs, botPlaceholderMsg]);

      // Generate a wonderful smart offline mock reply based on text/image
      let mockReply = '';
      if (imageToSubmit) {
        mockReply = `I've analyzed the photo you provided! It contains fascinating detail and geometric composition. Since we're in guest Mode or the Gemini API endpoint is configuring, let me help you sketch questions about it! ${trimmedText ? `Regarding your request "${trimmedText}", let's delve deep into its features.` : "Would you like me to identify its primary objects or suggest a creative background theme?"}`;
      } else {
        const qNormalized = trimmedText.toLowerCase();
        if (qNormalized.includes('hello') || qNormalized.includes('hi')) {
          mockReply = "Hello! I am ready to answer any queries, help you think through design systems, or look at gorgeous images you upload! How is your day going?";
        } else if (qNormalized.includes('who are you') || qNormalized.includes('your name')) {
          mockReply = "I am a friendly, ultra-intelligent companion chat assistant. I can stream responses word-by-word, analyze design aesthetics, and help you build responsive applications!";
        } else {
          mockReply = `That is a magnificent question! Here is how to approach it:\n\n1. Define the parameters clearly.\n2. Leverage iterative research to draft constraints.\n3. Integrate responsive visual feedback.\n\nLet me know how I can help you expand on this concept or if you have any follow-up questions!`;
        }
      }

      // Convert mock reply words and run typewriter
      const mockWords = mockReply.split(' ');
      wordQueueRef.current.push(...mockWords);
      startTypewriterLoop(activeSession.id, botMessageId);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Top Header bar */}
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-left bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 md:hidden transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
              {activeSession ? activeSession.title : 'New AI Conversation'}
            </h2>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-semibold shadow-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/55 animate-pulse"></span>
              Online
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="text-right text-[10px] hidden sm:block">
              <span className="font-bold text-slate-650 dark:text-slate-300">Logged in as </span>
              <span className="text-purple-600 dark:text-purple-400 font-extrabold">@{currentUser.username}</span>
            </div>
          ) : (
            <div className="text-right text-[10px] hidden sm:block">
              <span className="font-medium text-slate-500">Guest Session</span>
            </div>
          )}
        </div>
      </header>

      {/* Messages Workspace */}
      <div className="flex-grow overflow-y-auto custom-scroll-container p-4 space-y-4" style={{ willChange: 'scroll-position' }}>
        {!activeSession || activeSession.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center max-w-sm mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">How can I assist you today?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Upload image assets or write prompts to start. Dot AI is extremely fast, responsive, and friendly.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {activeSession.messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`
                    max-w-[85%] sm:max-w-xl rounded-2xl p-4 text-left border shadow-xs transition-all duration-300
                    ${isUser 
                      ? 'bg-purple-600 border-purple-500 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-tl-none'
                    }
                  `}>
                    {/* Render attachment if exists */}
                    {msg.imageUrl && (
                      <div className="mb-3 max-w-full overflow-hidden rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                        <PremiumImage 
                          src={msg.imageUrl} 
                          alt="User visual asset" 
                        />
                      </div>
                    )}
                    
                    {msg.text ? (
                      <MessageContentRenderer text={msg.text} />
                    ) : (
                      <div className="space-y-2.5 w-48 sm:w-64 py-1.5 animate-skeleton">
                        <div className="h-3 bg-purple-500/20 dark:bg-purple-400/20 rounded-md w-3/4"></div>
                        <div className="h-3 bg-purple-500/15 dark:bg-purple-400/15 rounded-md w-full"></div>
                        <div className="h-3 bg-purple-500/10 dark:bg-purple-400/10 rounded-md w-5/6"></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DOT IS TYPING INDICATOR */}
        {isTyping && (
          <div className="max-w-3xl mx-auto flex justify-start pl-2">
            <div 
              id="typing-indicator"
              className="flex items-center gap-3 p-3 bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none text-slate-500 dark:text-slate-400 font-bold text-xs shadow-sm shadow-purple-500/5"
            >
              {/* Spinning loading circle container */}
              <div className="relative w-5 h-5 flex items-center justify-center shrink-0" id="typing-spinner-container">
                {/* Rotating loading outer circle */}
                <div 
                  id="typing-spinner"
                  className="absolute inset-0 rounded-full border-2 border-purple-600 border-t-transparent animate-spin"
                />
                {/* Bullet point inside that zooms in and out */}
                <div 
                  id="typing-bullet-inner"
                  className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-zoom-in-out"
                />
              </div>
              
              {/* Dot is typing text label */}
              <span id="typing-text" className="select-none text-purple-600 dark:text-purple-400 font-bold tracking-tight">
                Dot is typing...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input controls Toolbar Bar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 transition-all duration-300">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          
          {/* Selected image preview attachment overlay if chosen */}
          {selectedImage && (
            <div className="p-2 self-start bg-slate-100 dark:bg-slate-800 border border-purple-500/30 rounded-xl flex items-center gap-3 animate-fade-in shadow">
              <img 
                src={selectedImage} 
                alt="Upload trigger preview" 
                className="w-10 h-10 object-cover rounded-lg border border-black/5" 
              />
              <div className="text-[10px] text-left">
                <p className="font-extrabold text-purple-600 dark:text-purple-400">Photo Attached</p>
                <p className="text-slate-500 font-semibold">Will submit with your next prompt</p>
              </div>
              <button 
                onClick={removeSelectedImage}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-red-500 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom input bar with exactly 3 elements */}
          <div className="flex items-center gap-2.5">
            {/* ELEMENT 1 (Left): Photo Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-xl text-purple-600 dark:text-purple-400 transition cursor-pointer active:scale-95 flex-shrink-0"
              title="Attach Photo / Image Upload"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange}
            />

            {/* ELEMENT 2 (Center): Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                }
              }}
              placeholder="Ask anything or capture screenshot visual context..."
              className="flex-grow bg-slate-100 hover:bg-slate-150/80 dark:bg-slate-950 dark:hover:bg-slate-920 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none transition-all"
            />

            {/* ELEMENT 3 (Right): Send Button */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim() && !selectedImage}
              className="p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl transition cursor-pointer active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

import React, { useState } from 'react';
import { 
  Plus, 
  LogIn, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  X, 
  MessageSquare, 
  Check, 
  LogOut, 
  Settings,
  User as UserIcon 
} from 'lucide-react';
import { AIChatSession, User } from '../types';
import DotAiLogo from './DotAiLogo';

interface SidebarProps {
  currentUser: User | null;
  aiChats: AIChatSession[];
  activeAIChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export default function Sidebar({
  currentUser,
  aiChats,
  activeAIChatId,
  onSelectChat,
  onNewChat,
  onOpenLogin,
  onLogout,
  onRenameChat,
  onDeleteChat,
  isOpen,
  onClose,
  onOpenSettings
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Handle Search filtering
  const filteredChats = aiChats.filter((chat) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    // Search by #1, #2 etc permanently
    const hashMatch = q.startsWith('#');
    if (hashMatch) {
      const numStr = q.slice(1);
      if (numStr && !isNaN(Number(numStr))) {
        return chat.number === Number(numStr);
      }
    }

    // Search by title or messages
    return (
      chat.title.toLowerCase().includes(q) ||
      chat.messages.some((msg) => msg.text.toLowerCase().includes(q))
    );
  });

  const handleStartRename = (chat: AIChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
    setActiveMenuId(null);
  };

  const handleSaveRename = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (confirm('Are you sure you want to delete this conversation? This operation cannot be undone.')) {
      onDeleteChat(id);
    }
  };

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-45 w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full transform transition-transform duration-300 ease-in-out
        md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:z-10
      `}>
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-purple-500/20">
              ●
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-tight">Dot AI Dashboard</h1>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="md:hidden p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* LOGGED OUT VIEW */}
        {!currentUser ? (
          <div className="flex-1 flex flex-col justify-between p-4">
            <div className="space-y-4">
              <button
                onClick={onNewChat}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-705 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-700/80 transition active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-purple-400" />
                New Conversation
              </button>

              <div id="logged-out-intro" className="p-5 bg-gradient-to-b from-purple-950/20 to-indigo-950/20 border border-purple-900/30 rounded-2xl space-y-2 text-left">
                <h3 className="font-bold text-xs text-purple-400 uppercase tracking-wider">Cognitive Sandbox</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Analyze images and converse word-by-word with Dot AI right out of the box.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-800">
              <p className="text-xs font-medium text-slate-400 text-center leading-snug">
                Login to access all Dot AI features
              </p>
              
              <button
                onClick={onOpenLogin}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/10 transition active:scale-[0.98]"
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
            </div>
          </div>
        ) : (
          /* LOGGED IN VIEW */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={onNewChat}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 shadow-purple-500/10 transition duration-150 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-white" />
                New Chat
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-3 pb-2 relative">
              <Search className="w-3.5 h-3.5 absolute left-6.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search history (e.g. #1, key terms)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 rounded-xl py-1.5 pl-9 pr-4 text-xs transition placeholder-slate-550 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Chat list history with permanent numbering */}
            <div className="flex-grow overflow-y-auto custom-scroll-container px-2 space-y-1 py-1">
              <div className="text-[10px] uppercase font-bold text-slate-500 px-2.5 py-1 text-left tracking-wider">
                Conversations History
              </div>

              {filteredChats.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-medium italic">
                  {searchQuery ? 'No matching logs found' : 'No recorded conversations'}
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const isAct = chat.id === activeAIChatId;
                  const isEditing = editingId === chat.id;

                  return (
                    <div
                      key={chat.id}
                      onClick={() => !isEditing && onSelectChat(chat.id)}
                      className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                        isAct 
                          ? 'bg-purple-950/40 text-purple-300 font-bold border-l-2 border-purple-500' 
                          : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1 text-left">
                        {/* Permanent Sequence Number */}
                        <span className="text-[10px] font-mono font-bold bg-slate-950/80 text-purple-400/80 px-2 py-0.5 rounded-md">
                          #{chat.number}
                        </span>

                        {isEditing ? (
                          <form 
                            onSubmit={(e) => handleSaveRename(chat.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 flex items-center gap-1"
                          >
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full bg-slate-950 text-white rounded px-2 py-0.5 text-xs focus:outline-none border border-purple-500"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="p-1 hover:bg-slate-800 text-green-400 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <span className="truncate text-xs font-medium">
                            {chat.title}
                          </span>
                        )}
                      </div>

                      {/* 3 dots menu list & triggers */}
                      {!isEditing && (
                        <div className="relative flex items-center ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === chat.id ? null : chat.id);
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition duration-150"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuId === chat.id && (
                            <>
                              {/* Trigger backdrop to close custom modal pop */}
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                }}
                                className="fixed inset-0 z-10"
                              />
                              <div className="absolute right-0 top-6 bg-slate-950 border border-slate-800 rounded-lg shadow-xl py-1 z-20 w-28 text-left">
                                <button
                                  onClick={(e) => handleStartRename(chat, e)}
                                  className="w-full px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1.5 font-medium transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Rename
                                </button>
                                <button
                                  onClick={(e) => handleDeleteClick(chat.id, e)}
                                  className="w-full px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-950/20 hover:text-red-300 flex items-center gap-1.5 font-medium transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Logged in User Profile Info & Logout */}
            <div className="p-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/30">
              <div className="flex items-center gap-2 overflow-hidden text-left flex-1 min-w-0">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    className="w-8 h-8 rounded-full object-cover border border-purple-500/50 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-900/40 flex items-center justify-center border border-purple-500/50 text-purple-300 font-bold text-xs uppercase shrink-0">
                    {currentUser.displayName.charAt(0)}
                  </div>
                )}
                <div className="overflow-hidden">
                  <h4 className="font-bold text-xs text-white truncate leading-tight">
                    {currentUser.displayName}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    @{currentUser.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={onOpenSettings}
                  title="Settings"
                  className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded-lg transition"
                  id="settings_gear_btn"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to log out from Dot AI?')) {
                      onLogout();
                    }
                  }}
                  title="Log Out"
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

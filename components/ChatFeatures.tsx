
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Phone, Video, MoreVertical, Send, 
  Paperclip, Mic, ImageIcon, DollarSign, 
  ShoppingBag, Check, CheckCheck, Loader2, Sparkles, X, Share2,
  Search, UserPlus, Users, ChevronRight, MapPin, FileText, Plus, Play, Pause,
  Reply, Clock, Heart, Timer, Trash2, Download, ExternalLink, CheckCircle,
  MessageCircle, Zap, Star, ChevronDown, Filter, Settings, Palette,
  Music, File as FileIcon, Navigation, Volume2, StopCircle, Ghost, Flame,
  Pin, PinOff, Smile, ChevronUp,
  Bold, Italic, Strikethrough, Code, Type
} from 'lucide-react';
import { User, Message, ChatSession, SummaryResult } from '../types';
import { sendMessageToGemini, generateChatSummary, getQuickSuggestions } from '../services/geminiService';
import { storageService } from '../services/storage';
import { useGlobalDispatch } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';

interface ChatListProps {
  chats: ChatSession[];
  contacts: User[];
  onSelectChat: (id: string) => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const getDateLabel = (timestamp: number) => {
  if (!timestamp) return 'Recent';
  const date = new Date(timestamp);
  const now = new Date();
  
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// Enhanced: Replaced HighlightedText with RichText to support markdown-style formatting
const RichText: React.FC<{ text: string; query: string; isCurrentMatch?: boolean }> = ({ text, query, isCurrentMatch }) => {
  const parseMarkdown = (input: string) => {
    // Fixed: Replaced (string | JSX.Element)[] with (string | React.ReactNode)[] to resolve "Cannot find namespace JSX" error.
    let parts: (string | React.ReactNode)[] = [input];

    // 1. Code block ```text```
    parts = parts.flatMap(p => typeof p !== 'string' ? [p] : p.split(/(```[\s\S]*?```)/g).map(s => {
      const match = s.match(/^```([\s\S]*?)```$/);
      return match ? <pre key={Math.random()} className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[0.85em] my-2 overflow-x-auto border border-white/10 shadow-inner w-full block">{match[1].trim()}</pre> : s;
    }));

    // 2. Bold **text**
    parts = parts.flatMap(p => typeof p !== 'string' ? [p] : p.split(/(\*\*.*?\*\*)/g).map(s => {
      const match = s.match(/^\*\*(.*?)\*\*$/);
      return match ? <strong key={Math.random()} className="font-extrabold">{match[1]}</strong> : s;
    }));

    // 3. Italics *text*
    parts = parts.flatMap(p => typeof p !== 'string' ? [p] : p.split(/(\*.*?\*)/g).map(s => {
      const match = s.match(/^\*(.*?)\*$/);
      return match ? <em key={Math.random()} className="italic opacity-90">{match[1]}</em> : s;
    }));

    // 4. Strikethrough ~~text~~
    parts = parts.flatMap(p => typeof p !== 'string' ? [p] : p.split(/(~~.*?~~)/g).map(s => {
      const match = s.match(/^~~(.*?)~~$/);
      return match ? <del key={Math.random()} className="line-through opacity-60">{match[1]}</del> : s;
    }));

    // 5. Code `text`
    parts = parts.flatMap(p => typeof p !== 'string' ? [p] : p.split(/(`.*?`)/g).map(s => {
      const match = s.match(/^`(.*?)`$/);
      return match ? <code key={Math.random()} className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-[0.9em] border border-black/5 dark:border-white/5">{match[1]}</code> : s;
    }));

    return parts;
  };

  const rendered = parseMarkdown(text);

  if (!query.trim()) return <>{rendered}</>;

  // Apply search highlighting to remaining string parts
  return (
    <>
      {rendered.map((part, idx) => {
        if (typeof part !== 'string') return part;
        const subParts = part.split(new RegExp(`(${query})`, 'gi'));
        return subParts.map((sp, i) => 
          sp.toLowerCase() === query.toLowerCase() 
            ? <mark key={`${idx}-${i}`} className={`${isCurrentMatch ? 'bg-orange-500 text-white' : 'bg-yellow-400/60 text-slate-900'} rounded-sm px-0.5 transition-colors duration-300`}>{sp}</mark> 
            : sp
        );
      })}
    </>
  );
};

const NeuralReadReceipt: React.FC<{ status?: Message['status'] }> = ({ status }) => {
  if (!status) return null;
  return (
    <div className="flex items-center">
      {status === 'sent' && <Check className="w-3 h-3 text-slate-400" />}
      {status === 'delivered' && <CheckCheck className="w-3 h-3 text-slate-400" />}
      {status === 'read' && (
        <div className="relative">
          <CheckCheck className="w-3 h-3 text-[#ff1744]" />
          <div className="absolute inset-0 bg-[#ff1744] blur-sm opacity-50 animate-pulse"></div>
        </div>
      )}
    </div>
  );
};

const MessageExpiryTimer: React.FC<{ expiresAt: number }> = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));

  useEffect(() => {
    const timer = setInterval(() => {
      const nextTime = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(nextTime);
      if (nextTime <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (timeLeft <= 0) return null;

  return (
    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20">
      <Timer className="w-2.5 h-2.5 text-[#ff1744] animate-pulse" />
      <span className="text-[8px] font-black text-white">{timeLeft}s</span>
    </div>
  );
};

const CustomAudioPlayer: React.FC<{ url: string; duration?: string; isMine: boolean }> = ({ url, duration, isMine }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  
  const bars = useMemo(() => Array.from({ length: 30 }, () => Math.random() * 80 + 20), []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (playing) audioRef.current.pause();
      else audioRef.current.play();
      setPlaying(!playing);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p);
    }
  };

  return (
    <div className={`flex items-center gap-4 p-4 rounded-[2rem] min-w-[260px] ${isMine ? 'bg-black/10' : 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-inner'}`}>
      <audio ref={audioRef} src={url} onTimeUpdate={handleTimeUpdate} onEnded={() => setPlaying(false)} className="hidden" />
      <button 
        onClick={togglePlay}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMine ? 'bg-white text-[#ff1744]' : 'bg-[#ff1744] text-white'} shadow-xl active:scale-90`}
      >
        {playing ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
      </button>
      
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-end gap-[2px] h-8 pt-1">
           {bars.map((height, i) => {
             const isActive = (i / bars.length) * 100 < progress;
             return (
               <div 
                 key={i} 
                 className={`w-1 rounded-full transition-all duration-300 ${isActive ? (isMine ? 'bg-white' : 'bg-[#ff1744]') : (isMine ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700')}`} 
                 style={{ height: `${height}%` }}
               ></div>
             );
           })}
        </div>
        <div className="flex justify-between items-center px-1">
           <span className={`text-[9px] font-black uppercase tracking-widest ${isMine ? 'text-white/60' : 'text-slate-400'}`}>{duration || 'Audio Message'}</span>
           <Volume2 className={`w-3 h-3 ${isMine ? 'text-white/40' : 'text-slate-300'}`} />
        </div>
      </div>
    </div>
  );
};

const NewChatModal: React.FC<{ isOpen: boolean; onClose: () => void; contacts: User[]; onSelect: (userId: string) => void }> = ({ isOpen, onClose, contacts, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const dispatch = useGlobalDispatch();
  if (!isOpen) return null;
  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const toggleContactSelection = (id: string) => {
    if (selectedContacts.includes(id)) setSelectedContacts(prev => prev.filter(c => c !== id));
    else setSelectedContacts(prev => [...prev, id]);
  };
  const handleCreateGroup = async () => {
    if (!groupName || selectedContacts.length === 0) return;
    setCreating(true);
    try {
      const newGroup = await api.chats.createGroup(groupName, selectedContacts);
      dispatch({ type: 'ADD_CHAT', payload: newGroup });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: `Group "${groupName}" created` } });
      resetAndClose();
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message || 'Failed to create group' } });
    } finally {
      setCreating(false);
    }
  };
  const resetAndClose = () => { setIsGroupMode(false); setGroupName(''); setSelectedContacts([]); setSearchTerm(''); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-sm h-[75vh] shadow-2xl p-0 flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            {isGroupMode && (
              <button onClick={() => setIsGroupMode(false)} className="mr-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{isGroupMode ? 'New Group' : 'New Chat'}</h3>
          </div>
          <button onClick={resetAndClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        {isGroupMode && (
          <div className="p-4 bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#ff1744]/10 flex items-center justify-center border-2 border-dashed border-[#ff1744]/30">
                   <Users className="w-6 h-6 text-[#ff1744]" />
                </div>
                <input type="text" placeholder="Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#ff1744]" />
             </div>
          </div>
        )}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search contacts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl py-3.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20 transition-all font-medium" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
          {!isGroupMode && !searchTerm && (
            <>
              <div onClick={() => onSelect('ping-ai')} className="flex items-center gap-4 p-3 bg-gradient-to-r from-red-50 to-transparent dark:from-[#ff1744]/10 dark:to-transparent rounded-2xl cursor-pointer transition-colors mb-2 border border-red-100 dark:border-red-900/20">
                 <div className="w-12 h-12 rounded-full bg-[#ff1744] flex items-center justify-center shadow-lg shadow-red-500/30"><Sparkles className="w-6 h-6 text-white" /></div>
                 <div className="flex-1">
                   <h4 className="font-bold text-slate-900 dark:text-white">PingAI Assistant</h4>
                   <p className="text-xs text-[#ff1744] font-medium">Your personal assistant</p>
                 </div>
              </div>
              <div onClick={() => setIsGroupMode(true)} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl cursor-pointer transition-colors mb-2">
                 <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Users className="w-6 h-6 text-slate-500" /></div>
                 <div className="flex-1"><h4 className="font-bold text-slate-900 dark:text-white">Create New Group</h4></div>
                 <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">All Contacts</div>
            </>
          )}
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400"><UserPlus className="w-10 h-10 mb-2 opacity-50" /><p className="text-sm">No contacts found</p></div>
          ) : (
            filteredContacts.map(contact => {
              const isSelected = selectedContacts.includes(contact.id);
              return (
                <div key={contact.id} onClick={() => { if (isGroupMode) toggleContactSelection(contact.id); else { onSelect(contact.id); resetAndClose(); } }} className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${isSelected && isGroupMode ? 'bg-[#ff1744]/10 border border-[#ff1744]/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent'}`}>
                  <div className="relative">
                    <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                    {contact.isOnline && !isGroupMode && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>}
                    {isGroupMode && isSelected && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#ff1744] rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white">{contact.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{contact.status || 'Available'}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {isGroupMode && (
           <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-3"><span className="text-sm font-bold text-slate-500">{selectedContacts.length} selected</span></div>
              <button onClick={handleCreateGroup} disabled={!groupName || selectedContacts.length === 0 || creating} className="w-full py-3.5 bg-[#ff1744] text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">{creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Create Group</button>
           </div>
        )}
      </div>
    </div>
  );
};

export const ChatList: React.FC<ChatListProps> = ({ chats, contacts, onSelectChat }) => {
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const dispatch = useGlobalDispatch();

  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      const matchesSearch = 
        chat.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (typeof chat.lastMessage === 'string' && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = filterMode === 'all' || (filterMode === 'unread' && chat.unread > 0);
      
      return matchesSearch && matchesFilter;
    });
  }, [chats, searchQuery, filterMode]);

  const handleContactSelect = async (userId: string) => {
    if (userId === 'ping-ai') { onSelectChat('ping-ai-session'); return; }
    const existingChat = chats.find(c => c.participant.id === userId && !c.isGroup);
    if (existingChat) onSelectChat(existingChat.id);
    else {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const newChat = await api.chats.createChat(userId);
        dispatch({ type: 'ADD_CHAT', payload: newChat });
      } catch (error: any) {
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Failed to start chat.' } });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, chat: ChatSession) => {
    e.stopPropagation();
    const nextPinned = !chat.isPinned;
    dispatch({ type: 'TOGGLE_PIN_CHAT', payload: { chatId: chat.id, isPinned: nextPinned } });
    try { await api.chats.togglePin(chat.id, nextPinned); } catch (err: any) {
      dispatch({ type: 'TOGGLE_PIN_CHAT', payload: { chatId: chat.id, isPinned: !nextPinned } });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Failed to pin chat.' } });
    }
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this chat history? This cannot be undone.")) {
      dispatch({ type: 'DELETE_CHAT', payload: chatId });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'info', message: 'Chat deleted' } });
    }
  };

  return (
    <div className="flex flex-col h-full pb-20 overflow-y-auto bg-gray-50 dark:bg-slate-950 transition-colors relative no-scrollbar">
      <NewChatModal isOpen={showNewChat} onClose={() => setShowNewChat(false)} contacts={contacts} onSelect={handleContactSelect} />
      
      <div className="px-4 pt-4 pb-2 space-y-4">
        <div className="relative group">
           <Search className={`absolute left-4 top-3.5 w-5 h-5 transition-colors ${searchQuery ? 'text-[#ff1744]' : 'text-slate-400 group-focus-within:text-[#ff1744]'}`} />
           <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..." 
              className="w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-10 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-4 focus:ring-[#ff1744]/10 transition-all shadow-sm" 
           />
           {searchQuery && (
             <button onClick={() => setSearchQuery('')} className="absolute right-4 top-3.5 text-slate-300 hover:text-slate-500 dark:hover:text-white transition-colors">
               <X className="w-5 h-5" />
             </button>
           )}
        </div>

        <div className="flex items-center justify-between px-1">
           <div className="flex gap-2">
              <button 
                onClick={() => setFilterMode('all')}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-transparent text-slate-400'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilterMode('unread')}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${filterMode === 'unread' ? 'bg-[#ff1744] text-white shadow-lg shadow-red-500/20' : 'bg-transparent text-slate-400'}`}
              >
                Unread
                {chats.some(c => c.unread > 0) && <div className="w-1.5 h-1.5 rounded-full bg-current"></div>}
              </button>
           </div>
           <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{filteredChats.length} Conversations</span>
        </div>
      </div>

      <div className="px-4 py-4">
        <h3 className="text-gray-400 dark:text-slate-500 text-[10px] font-black uppercase mb-3 tracking-[0.2em] px-1">Pinned Chats</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar -mx-2 px-2">
          {chats.filter(c => c.isPinned).map(chat => (
            <div key={chat.id} onClick={() => onSelectChat(chat.id)} className="flex flex-col items-center min-w-[64px] cursor-pointer group animate-in zoom-in duration-300">
              <div className="relative">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#ff1744] to-red-400">
                  <img src={chat.participant.avatar} alt={chat.participant.name} className="w-14 h-14 rounded-full border-2 border-white dark:border-slate-800 shadow-md object-cover" />
                </div>
                {chat.participant.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>}
                <div className="absolute -top-1 -right-1"><button onClick={(e) => handleTogglePin(e, chat)} className="p-1 bg-white dark:bg-slate-800 rounded-full shadow-md text-[#ff1744] border border-gray-100 dark:border-slate-700"><PinOff className="w-3 h-3" /></button></div>
              </div>
              <span className="text-[10px] mt-2 font-black text-slate-700 dark:text-slate-300 truncate w-16 text-center uppercase tracking-tighter">{chat.participant.name.split(' ')[0]}</span>
            </div>
          ))}
          {chats.filter(c => c.isPinned).length === 0 && <div className="py-2 opacity-30 text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-2">No pinned chats</div>}
        </div>
      </div>

      <div className="px-4 py-2 flex-1 bg-white dark:bg-slate-900 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.04)] min-h-[500px]">
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full mx-auto my-3 mb-6"></div>
        <div className="flex justify-between items-center mb-4 px-2">
           <h3 className="text-gray-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Recent Messages</h3>
           <Filter className="w-4 h-4 text-slate-300" />
        </div>
        <div className="space-y-1">
          {filteredChats.map(chat => (
            <div key={chat.id} onClick={() => onSelectChat(chat.id)} className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 p-3 rounded-3xl transition-all duration-300 active:scale-[0.98] group relative">
              <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <div className="relative shrink-0">
                  <img src={chat.participant.avatar} alt={chat.participant.name} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                  {chat.isPinned && <Pin className="absolute -top-1 -left-1 w-4 h-4 text-[#ff1744] fill-[#ff1744]" />}
                </div>
                <div className="overflow-hidden flex-1">
                  <h4 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-1 uppercase tracking-tight truncate">
                    {chat.participant.name}
                    {chat.isGroup && <Users className="w-3 h-3 text-[#ff1744]" />}
                  </h4>
                  <p className={`text-sm truncate w-full font-medium ${chat.unread > 0 ? 'text-slate-900 dark:text-white font-black' : 'text-gray-400 dark:text-slate-500'}`}>
                    {typeof chat.lastMessage === 'string' ? chat.lastMessage : 'Media message'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleTogglePin(e, chat)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-[#ff1744]">
                      {chat.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <button onClick={(e) => handleDeleteChat(e, chat.id)} className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{chat.lastTime}</span>
                </div>
                {chat.unread > 0 && (
                   <div className="px-2 h-5 bg-[#ff1744] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 animate-bounce">
                     {chat.unread}
                   </div>
                )}
              </div>
            </div>
          ))}
          {filteredChats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center animate-in fade-in">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-4">
                 {searchQuery ? <Search className="w-8 h-8 text-gray-300" /> : <MessageCircle className="w-8 h-8 text-gray-300" />}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {searchQuery ? `No results for "${searchQuery}"` : 'No active chats'}
              </p>
            </div>
          )}
        </div>
      </div>
      <button onClick={() => setShowNewChat(true)} className="fixed bottom-24 right-6 w-16 h-16 bg-[#ff1744] rounded-[2rem] shadow-2xl shadow-red-500/40 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all z-10"><Plus className="w-8 h-8" /></button>
    </div>
  );
};

const SendMoneyChatModal: React.FC<{ isOpen: boolean; onClose: () => void; onSend: (amount: number) => void }> = ({ isOpen, onClose, onSend }) => {
  const [amount, setAmount] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95 border border-white/10">
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2 text-center">Send Money</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-8">Enter amount to transfer</p>
        <div className="relative mb-8">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-[#ff1744]">$</span>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#ff1744] rounded-2xl py-6 pl-10 pr-4 text-3xl font-black text-slate-900 dark:text-white text-center outline-none transition-all"
            placeholder="0"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="py-4 bg-gray-100 dark:bg-slate-800 text-slate-500 font-bold rounded-2xl uppercase tracking-widest text-[10px]">Cancel</button>
          <button onClick={() => { onSend(Number(amount)); onClose(); }} className="py-4 bg-[#ff1744] text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 uppercase tracking-widest text-[10px]">Send</button>
        </div>
      </div>
    </div>
  );
};

interface ChatWindowProps {
  session: ChatSession;
  currentUser: User;
  onBack: () => void;
  onSendMessage: (sessionId: string, text: string, type?: Message['type'], metadata?: any, replyTo?: Message['replyTo'], expiresAt?: number) => void;
  onBotResponse: (sessionId: string, text: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ session, currentUser, onBack, onSendMessage, onBotResponse }) => {
  const dispatch = useGlobalDispatch();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryResult | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showMoneyModal, setShowMoneyModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const [buzzCooldown, setBuzzCooldown] = useState(0);
  const [isBuzzing, setIsBuzzing] = useState(false);

  const isBot = session.participant.id === 'ping-ai';

  const matches = useMemo(() => {
    if (!searchQuery.trim() || !isSearching) return [];
    return session.messages
      .map((m, index) => m.text?.toLowerCase().includes(searchQuery.toLowerCase()) ? index : -1)
      .filter(index => index !== -1);
  }, [session.messages, searchQuery, isSearching]);

  useEffect(() => {
    if (matches.length > 0) setCurrentMatchIndex(0);
  }, [matches.length]);

  const scrollToMatch = (index: number) => {
    const el = document.getElementById(`msg-${session.messages[matches[index]].id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if ('vibrate' in navigator) navigator.vibrate(10);
    }
  };

  const nextMatch = () => {
    const next = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(next);
    scrollToMatch(next);
  };

  const prevMatch = () => {
    const prev = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prev);
    scrollToMatch(prev);
  };

  const filteredMessages = useMemo(() => {
    let msgs = session.messages;
    if (showStarredOnly) msgs = msgs.filter(m => m.isStarred);
    return msgs;
  }, [session.messages, showStarredOnly]);

  const scrollToBottom = () => {
    if (!isSearching) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [session.messages.length, isSearching]);

  useEffect(() => {
    const lastMsg = session.messages[session.messages.length - 1];
    if (lastMsg && lastMsg.senderId !== currentUser.id && lastMsg.type === 'text') {
      getQuickSuggestions(lastMsg.text).then(setAiSuggestions);
    } else {
      setAiSuggestions([]);
    }
  }, [session.messages.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      const hasExpiring = session.messages.some(m => m.expiresAt && m.expiresAt > 0);
      if (hasExpiring) dispatch({ type: 'DELETE_EXPIRED_MESSAGES', payload: { sessionId: session.id } });
    }, 1000);
    return () => clearInterval(interval);
  }, [session.messages, session.id, dispatch]);

  useEffect(() => {
    if (buzzCooldown > 0) {
      const timer = setTimeout(() => setBuzzCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [buzzCooldown]);

  useEffect(() => {
    const handleTypingStatus = (data: any) => { if (data.chatId === session.id && data.userId !== currentUser.id) setIsTyping(data.isTyping); };
    const handleIncomingBuzz = (data: any) => { if (data.chatId === session.id && data.userId !== currentUser.id) { if ('vibrate' in navigator) navigator.vibrate([400, 100, 400]); setIsBuzzing(true); setTimeout(() => setIsBuzzing(false), 1500); } };
    socketService.on('typing_status', handleTypingStatus);
    socketService.on('incoming_buzz', handleIncomingBuzz);
    return () => { socketService.off('typing_status', handleTypingStatus); socketService.off('incoming_buzz', handleIncomingBuzz); };
  }, [session.id, currentUser.id]);

  const handleBuzz = () => { if (buzzCooldown > 0) return; if ('vibrate' in navigator) navigator.vibrate(100); setIsBuzzing(true); setTimeout(() => setIsBuzzing(false), 1500); socketService.broadcastBuzz(session.id, currentUser.id); setBuzzCooldown(30); onSendMessage(session.id, 'BUZZ!', 'system'); };
  const toggleDisappearingMode = () => { const nextState = !session.disappearingMode; dispatch({ type: 'TOGGLE_DISAPPEARING_MODE', payload: { sessionId: session.id, enabled: nextState } }); onSendMessage(session.id, `Disappearing messages ${nextState ? 'ON (10s)' : 'OFF'}`, 'system'); setShowMenu(false); };
  
  const applyFormatting = (tag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = inputText.substring(start, end);
    const before = inputText.substring(0, start);
    const after = inputText.substring(end);
    
    let newText = '';
    if (tag === '```') {
      newText = `${before}\n${tag}\n${selected || 'code here'}\n${tag}\n${after}`;
    } else {
      newText = `${before}${tag}${selected}${tag}${after}`;
    }
    
    setInputText(newText);
    setTimeout(() => {
      textareaRef.current?.focus();
      const cursorOffset = tag.length;
      textareaRef.current?.setSelectionRange(start + cursorOffset, start + cursorOffset + selected.length);
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { const text = e.target.value; setInputText(text); if (text.trim().length > 0) { socketService.broadcastTyping(session.id, currentUser.id, true); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = setTimeout(() => socketService.broadcastTyping(session.id, currentUser.id, false), 2000); } else socketService.broadcastTyping(session.id, currentUser.id, false); };
  
  const handleSend = async (overrideText?: string) => {
    const text = overrideText || inputText;
    if (!text.trim()) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketService.broadcastTyping(session.id, currentUser.id, false);
    setInputText(''); setReplyingTo(null); setAiSuggestions([]);
    const expiresAt = session.disappearingMode ? Date.now() + 10000 : undefined;
    const replyPayload = replyingTo ? { id: replyingTo.id, text: typeof replyingTo.text === 'string' ? replyingTo.text : 'Media', sender: replyingTo.senderId === currentUser.id ? 'You' : session.participant.name } : undefined;
    onSendMessage(session.id, text, 'text', undefined, replyPayload, expiresAt);
    if (isBot) { setIsTyping(true); const history = session.messages.map(m => ({ role: (m.senderId === currentUser.id ? 'user' : 'model') as 'user' | 'model', parts: [{ text: m.text }] })); const response = await sendMessageToGemini(history, text); setIsTyping(false); onBotResponse(session.id, response); }
  };

  const handleReaction = (msgId: string, emoji: string) => {
    dispatch({ type: 'ADD_REACTION', payload: { sessionId: session.id, messageId: msgId, emoji } });
    setActiveReactionId(null);
    if ('vibrate' in navigator) navigator.vibrate(20);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploading(true); setShowAttachments(false);
      try {
        const file = files[0]; const url = await storageService.uploadFile(file);
        let type: 'image' | 'video' | 'audio' | 'document' = 'document';
        if (file.type.startsWith('image/')) type = 'image'; else if (file.type.startsWith('video/')) type = 'video'; else if (file.type.startsWith('audio/')) type = 'audio';
        onSendMessage(session.id, type === 'document' || type === 'audio' ? file.name : '', type, { url, fileName: file.name, fileSize: formatFileSize(file.size), duration: type === 'audio' ? '0:00' : undefined }, undefined, session.disappearingMode ? Date.now() + 10000 : undefined);
      } catch (error) { dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Failed to upload file.' } }); } finally { setUploading(false); }
    }
  };

  const handleLocationSend = () => {
    setShowAttachments(false);
    if (!navigator.geolocation) { dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Location services not supported.' } }); return; }
    navigator.geolocation.getCurrentPosition((pos) => { const { latitude, longitude } = pos.coords; onSendMessage(session.id, `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, 'location', { lat: latitude, lng: longitude, mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}` }, undefined, session.disappearingMode ? Date.now() + 10000 : undefined); }, (err) => dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Could not access location.' } }));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder; audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.start(); setIsRecording(true); setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
      if ('vibrate' in navigator) navigator.vibrate(50);
    } catch (err) { dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Microphone access denied.' } }); }
  };

  const stopRecording = (send: boolean) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        clearInterval(recordingTimerRef.current);
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        if (send) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], "voice_note.webm", { type: 'audio/webm' });
          setUploading(true);
          try { const url = await storageService.uploadFile(audioFile); onSendMessage(session.id, "", 'audio', { url, duration: formatDuration(recordingDuration), fileName: 'Voice Message' }, undefined, session.disappearingMode ? Date.now() + 10000 : undefined); } catch(e) { console.error(e); } finally { setUploading(false); }
        }
      };
      mediaRecorderRef.current.stop(); setIsRecording(false);
    }
  };

  const handleGenerateSummary = async () => { setShowSummary(true); setSummaryLoading(true); const history = session.messages.map(m => ({ sender: m.senderId === currentUser.id ? 'Me' : session.participant.name, text: m.text })); const result = await generateChatSummary(history); setSummaryData(result); setSummaryLoading(false); };

  const initiateCall = (type: 'audio' | 'video') => {
    dispatch({ type: 'START_CALL', payload: { participant: session.participant, type } });
  };

  let lastDateLabel = '';

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-slate-950 transition-all ${isBuzzing ? 'animate-shake' : ''}`}>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); } 20%, 40%, 60%, 80% { transform: translateX(8px); } }
        .animate-shake { animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both; background-color: rgba(255, 23, 68, 0.15); }
        @keyframes buzz-pop { 0% { transform: scale(1); } 50% { transform: scale(1.6); } 100% { transform: scale(1); } }
        .buzz-active { animation: buzz-pop 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes zap-strike { 0% { transform: scale(0) rotate(-45deg); opacity: 0; filter: drop-shadow(0 0 0px #ff1744); } 15% { transform: scale(2.5) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 40px #ff1744); } 25% { transform: scale(2) rotate(-10deg); opacity: 1; } 40% { transform: scale(2.3) rotate(5deg); opacity: 0.9; } 100% { transform: scale(4) rotate(15deg); opacity: 0; filter: drop-shadow(0 0 60px #ff1744); } }
        .zap-effect { animation: zap-strike 1.4s cubic-bezier(.36,.07,.19,.97) forwards; pointer-events: none; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 100; }
        @keyframes recording-pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 23, 68, 0.4); } 70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(255, 23, 68, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 23, 68, 0); } }
        .animate-pulse-red { animation: recording-pulse 1.5s infinite; }
        @keyframes reaction-pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.3); } 100% { transform: scale(1); opacity: 1; } }
        .reaction-animate { animation: reaction-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes react-entry { 0% { transform: scale(0.3) translateY(20px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
        .reaction-bubble { animation: react-entry 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
      <SendMoneyChatModal isOpen={showMoneyModal} onClose={() => setShowMoneyModal(false)} onSend={(amt) => { const meta = { amount: amt, status: 'Completed' }; const expiresAt = session.disappearingMode ? Date.now() + 10000 : undefined; onSendMessage(session.id, `Sent $${amt}`, 'payment', meta, undefined, expiresAt); api.wallet.transfer(session.participant.name, amt); }} />
      {isBuzzing && <div className="zap-effect"><Zap className="w-32 h-32 text-[#ff1744] fill-[#ff1744]" /></div>}
      <div className="flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div className="flex items-center justify-between p-4">
          {isSearching ? (
             <div className="flex-1 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center bg-gray-100 dark:bg-slate-800 rounded-2xl px-4 py-2 border border-transparent focus-within:border-[#ff1744]/30 transition-all">
                    <Search className="w-4 h-4 text-slate-400 mr-2" />
                    <input 
                      type="text" 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      placeholder="Find keyword..." 
                      className="flex-1 bg-transparent font-bold text-slate-900 dark:text-white outline-none text-sm" 
                      autoFocus 
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-3 h-3 text-slate-500" />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => { setIsSearching(false); setSearchQuery(''); }} 
                    className="text-xs font-black uppercase text-[#ff1744] tracking-widest px-2"
                  >
                    Close
                  </button>
                </div>
                {matches.length > 0 && searchQuery && (
                  <div className="flex items-center justify-between px-2 pb-1">
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                       Match {currentMatchIndex + 1} of {matches.length}
                     </span>
                     <div className="flex gap-2">
                        <button onClick={prevMatch} className="p-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-[#ff1744] hover:text-white transition-all"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={nextMatch} className="p-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-[#ff1744] hover:text-white transition-all"><ChevronDown className="w-4 h-4" /></button>
                     </div>
                  </div>
                )}
             </div>
          ) : (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-[#ff1744] transition-colors"><ArrowLeft className="w-6 h-6" /></button>
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0"><img src={session.participant.avatar} className="w-10 h-10 rounded-2xl border border-gray-100 dark:border-slate-800 object-cover shadow-sm" alt={session.participant.name} /></div>
                  <div className="overflow-hidden"><h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{session.participant.name}</h3><span className="text-[10px] text-[#ff1744] font-black uppercase tracking-widest flex items-center gap-1">{isTyping ? 'Typing...' : (session.participant.isOnline ? 'Online' : 'Offline')}</span></div>
                </div>
              </div>
              <div className="flex gap-1 text-[#ff1744] shrink-0">
                <button onClick={() => initiateCall('audio')} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full transition-all"><Phone className="w-5 h-5" /></button>
                <button onClick={() => initiateCall('video')} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full transition-all"><Video className="w-5 h-5" /></button>
                <button onClick={() => setIsSearching(true)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full transition-all"><Search className="w-5 h-5" /></button>
                <button onClick={handleBuzz} disabled={buzzCooldown > 0} className={`p-2 rounded-full transition-all relative ${buzzCooldown > 0 ? 'cursor-not-allowed opacity-50 grayscale' : 'hover:bg-red-50 dark:hover:bg-red-900/10'}`}><Zap className={`w-5 h-5 transition-all ${buzzCooldown > 0 ? 'text-slate-400' : 'text-[#ff1744] fill-[#ff1744]'} ${isBuzzing ? 'buzz-active scale-125' : ''}`} />{buzzCooldown > 0 && (<span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-[#ff1744] bg-white/80 dark:bg-slate-900/80 rounded-full">{buzzCooldown}</span>)}</button>
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-gray-400 hover:text-slate-700 dark:hover:text-slate-300"><MoreVertical className="w-5 h-5" /></button>
                  {showMenu && (
                     <div className="absolute right-0 top-12 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-slate-800 w-64 overflow-hidden z-30 animate-in zoom-in-95 origin-top-right p-2">
                        <button onClick={() => { setShowStarredOnly(!showStarredOnly); setShowMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-200"><Star className={`w-4 h-4 ${showStarredOnly ? 'fill-amber-400 text-amber-400' : ''}`} /> {showStarredOnly ? 'Show All Messages' : 'View Starred'}</button>
                        <button onClick={toggleDisappearingMode} className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-3 text-[10px] font-black uppercase ${session.disappearingMode ? 'text-[#ff1744]' : 'text-slate-600 dark:text-slate-200'}`}><Ghost className={`w-4 h-4 ${session.disappearingMode ? 'animate-bounce' : ''}`} /> {session.disappearingMode ? 'Turn Off Expiry' : 'Disappearing Messages'}</button>
                        <button onClick={handleGenerateSummary} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-200"><Sparkles className="w-4 h-4 text-[#ff1744]" /> Get Chat Summary</button>
                        <div className="h-px bg-gray-100 dark:bg-slate-800 my-1 mx-2"></div>
                        <button className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-200"><Palette className="w-4 h-4" /> Chat Settings</button>
                     </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        {session.disappearingMode && (<div className="bg-[#ff1744]/10 py-1 px-4 flex items-center justify-center gap-2 border-t border-[#ff1744]/20 animate-in slide-in-from-top-4"><span className="animate-pulse">🔥</span><span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff1744]">Expiry active: 10s message timer</span></div>)}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-slate-950 no-scrollbar relative">
        {filteredMessages.length === 0 && matches.length === 0 && isSearching && searchQuery ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center animate-in fade-in duration-500">
             <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-slate-400" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No matches for "{searchQuery}"</p>
          </div>
        ) : filteredMessages.map((msg, index) => {
          const currentDateLabel = getDateLabel(msg.createdAt);
          const showDateHeader = currentDateLabel !== lastDateLabel; lastDateLabel = currentDateLabel;
          const isMine = msg.senderId === currentUser.id;
          const isSearched = matches.includes(index);
          const isCurrentMatch = isSearched && matches[currentMatchIndex] === index;

          if (msg.type === 'system') return (<div key={msg.id} className="flex justify-center w-full my-4 animate-in fade-in zoom-in-95"><div className="bg-[#ff1744]/10 dark:bg-[#ff1744]/5 border-2 border-[#ff1744]/20 px-5 py-2.5 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(255,23,68,0.1)] group"><div className="p-1.5 bg-[#ff1744] rounded-full group-hover:scale-125 transition-transform"><Zap className="w-4 h-4 text-white fill-white" /></div><span className="text-[11px] font-black uppercase text-[#ff1744] tracking-[0.2em]">{msg.text}</span></div></div>);

          return (
            <React.Fragment key={msg.id}>
              {showDateHeader && (<div className="flex justify-center my-4 sticky top-0 z-10"><span className="text-[10px] font-black text-slate-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-sm">{currentDateLabel}</span></div>)}
              <div id={`msg-${msg.id}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group relative items-end gap-2 transition-all duration-500`}>
                {!isMine && <img src={session.participant.avatar} className="w-8 h-8 rounded-xl object-cover mb-1 opacity-60 group-hover:opacity-100 transition-opacity" alt="" />}
                <div className={`relative group/message max-w-[85%] ${isCurrentMatch ? 'z-10' : ''}`}>
                  {activeReactionId === msg.id && (
                    <div className="absolute -top-14 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-full p-2 shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex gap-3 reaction-animate border border-gray-100 dark:border-slate-800 z-[100] justify-center scale-110">
                       {['❤️', '🔥', '😂', '😮', '😢', '👏'].map(emoji => (
                         <button 
                            key={emoji} 
                            onClick={() => handleReaction(msg.id, emoji)} 
                            className="text-2xl hover:scale-150 transition-transform active:scale-90 p-1"
                          >
                            {emoji}
                          </button>
                       ))}
                       <div className="w-px bg-slate-200 dark:bg-slate-700 h-6 my-auto mx-1"></div>
                       <button onClick={() => setActiveReactionId(null)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                       </button>
                    </div>
                  )}

                  <div 
                    className={`rounded-[1.75rem] shadow-sm relative transition-all p-4 ${isMine ? 'bg-[#ff1744] text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-gray-100 dark:border-slate-700'} ${activeReactionId === msg.id ? 'ring-4 ring-[#ff1744]/20 scale-[1.03]' : ''} ${isCurrentMatch ? 'ring-4 ring-orange-500 scale-[1.03] shadow-xl' : ''}`}
                    onContextMenu={(e) => { e.preventDefault(); setActiveReactionId(msg.id); }}
                    onClick={() => activeReactionId === msg.id && setActiveReactionId(null)}
                  >
                    {msg.expiresAt && (<div className={`absolute -top-3 ${isMine ? 'right-0' : 'left-0'} z-10`}><MessageExpiryTimer expiresAt={msg.expiresAt} /></div>)}
                    {msg.isStarred && <Star className={`absolute -top-1 ${isMine ? '-left-1' : '-right-1'} w-4 h-4 fill-amber-400 text-amber-400 animate-in zoom-in`} />}
                    {msg.replyTo && (<div className={`mb-3 p-2.5 rounded-xl text-xs border-l-4 ${isMine ? 'bg-black/10 border-white/30' : 'bg-gray-100 dark:bg-slate-700 border-[#ff1744]'}`}><p className="font-black opacity-60 uppercase tracking-tighter">{msg.replyTo.sender}</p><p className="truncate font-medium">{msg.replyTo.text}</p></div>)}
                    
                    <div className="relative">
                      {msg.type === 'text' && (
                        <p className="whitespace-pre-wrap leading-relaxed font-medium text-[15px]">
                          <RichText text={msg.text} query={searchQuery} isCurrentMatch={isCurrentMatch} />
                        </p>
                      )}
                      {msg.type === 'image' && (
                        <div className="space-y-2">
                          <img src={msg.metadata?.url} className="rounded-2xl w-full max-h-60 object-cover shadow-sm cursor-pointer hover:opacity-90 transition-opacity" alt="Image" onClick={() => window.open(msg.metadata?.url)} />
                          {msg.text && <p className="text-sm font-medium"><RichText text={msg.text} query={searchQuery} isCurrentMatch={isCurrentMatch} /></p>}
                        </div>
                      )}
                      {msg.type === 'audio' && <CustomAudioPlayer url={msg.metadata?.url} duration={msg.metadata?.duration} isMine={isMine} />}
                      {msg.type === 'document' && (
                        <a href={msg.metadata?.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/10 transition-colors">
                          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shrink-0"><FileText className="w-5 h-5" /></div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold truncate">{msg.metadata?.fileName || 'Document'}</p>
                            <p className="text-[10px] opacity-60 uppercase font-black">{msg.metadata?.fileSize || 'Unknown size'}</p>
                          </div>
                          <Download className="w-4 h-4 text-slate-400" />
                        </a>
                      )}
                      {msg.type === 'location' && (
                        <div className="space-y-3">
                          <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-2xl flex items-center justify-center overflow-hidden relative border border-white/20">
                            <MapPin className="w-8 h-8 text-[#ff1744] animate-bounce" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                          </div>
                          <a href={msg.metadata?.mapUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                            <div className="flex items-center gap-2"><Navigation className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Open in Maps</span></div>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                      {msg.type === 'payment' && (
                        <div className={`p-4 rounded-2xl flex items-center gap-4 ${isMine ? 'bg-white/10' : 'bg-emerald-50 dark:bg-emerald-900/10'}`}>
                          <div className="w-10 h-10 bg-[#ff1744] rounded-xl flex items-center justify-center text-white"><DollarSign className="w-6 h-6" /></div>
                          <div><p className="text-lg font-black">${msg.metadata?.amount}</p><p className="text-[9px] font-black uppercase opacity-60">Transfer Confirmed</p></div>
                        </div>
                      )}
                    </div>

                    <div className={`flex items-center justify-end gap-1.5 mt-2 ${isMine ? 'opacity-60' : 'opacity-40'}`}>
                      <span className="text-[9px] font-black uppercase tracking-tighter">{msg.timestamp}</span>
                      {isMine && <NeuralReadReceipt status={msg.status || 'read'} />}
                    </div>

                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`absolute -bottom-3 ${isMine ? 'left-0' : 'right-0'} flex flex-wrap gap-1.5 animate-in slide-in-from-top-1 z-20`}>
                         {msg.reactions.map(r => (
                           <div 
                              key={r.emoji} 
                              onClick={() => handleReaction(msg.id, r.emoji)}
                              className={`flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-full pl-1.5 pr-2 py-0.5 shadow-md border transition-all cursor-pointer hover:scale-110 active:scale-90 reaction-bubble ${isMine ? 'border-[#ff1744]/20' : 'border-gray-100 dark:border-slate-700'}`}
                            >
                              <span className="text-xs">{r.emoji}</span>
                              {r.count > 1 && <span className="text-[9px] font-black text-slate-500 dark:text-slate-400">{r.count}</span>}
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                  
                  <div className={`absolute top-0 ${isMine ? '-left-10' : '-right-10'} flex flex-col gap-2 opacity-0 group-hover/message:opacity-100 transition-all duration-300 translate-y-2 group-hover/message:translate-y-0`}>
                     <button onClick={() => setReplyingTo(msg)} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-gray-100 dark:border-slate-700 text-slate-400 hover:text-[#ff1744] hover:scale-110 transition-all"><Reply className="w-3.5 h-3.5" /></button>
                     <button onClick={() => setActiveReactionId(msg.id)} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-gray-100 dark:border-slate-700 text-slate-400 hover:text-amber-400 hover:scale-110 transition-all"><Smile className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {isTyping && (<div className="flex justify-start items-center gap-2 animate-in fade-in duration-300"><div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-full rounded-tl-none border border-gray-100 dark:border-slate-700 shadow-sm flex gap-1"><span className="w-1.5 h-1.5 bg-[#ff1744] rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-[#ff1744] rounded-full animate-bounce delay-100"></span><span className="w-1.5 h-1.5 bg-[#ff1744] rounded-full animate-bounce delay-200"></span></div><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{session.participant.name.split(' ')[0]} is typing...</span></div>)}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 p-3 pb-8 space-y-3 relative z-30 transition-all duration-300">
        {aiSuggestions.length > 0 && !inputText && !isRecording && !isSearching && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 animate-in slide-in-from-bottom-2 duration-500">
            {aiSuggestions.map((suggestion, i) => (
              <button key={i} onClick={() => handleSend(suggestion)} className="px-4 py-2 bg-[#ff1744]/5 hover:bg-[#ff1744]/10 dark:bg-slate-800 dark:hover:bg-slate-700 border border-[#ff1744]/20 dark:border-slate-700 rounded-full text-[10px] font-black uppercase text-[#ff1744] dark:text-red-400 whitespace-nowrap transition-all active:scale-95 shadow-sm">
                {suggestion}
              </button>
            ))}
          </div>
        )}
        
        {replyingTo && !isRecording && (
          <div className="flex items-center justify-between bg-[#ff1744]/5 dark:bg-slate-800 p-3 rounded-[1.5rem] border border-[#ff1744]/10 animate-in slide-in-from-bottom-2 duration-300">
            <div className="overflow-hidden flex items-center gap-3">
              <div className="w-1 h-8 bg-[#ff1744] rounded-full"></div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#ff1744] mb-0.5 tracking-tighter">Replying to: {replyingTo.senderId === currentUser.id ? 'You' : session.participant.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{replyingTo.text || "Media"}</p>
              </div>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:scale-110 active:scale-90 transition-all"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
        )}

        {/* Formatting Toolbar */}
        {!isRecording && !isSearching && (
          <div className="flex gap-1 px-1 animate-in fade-in duration-500 slide-in-from-bottom-1">
             {[
               { id: 'bold', tag: '**', icon: Bold, label: 'Bold' },
               { id: 'italic', tag: '*', icon: Italic, label: 'Italic' },
               { id: 'strike', tag: '~~', icon: Strikethrough, label: 'Strike' },
               { id: 'code', tag: '`', icon: Code, label: 'Code' },
               { id: 'block', tag: '```', icon: Type, label: 'Block' }
             ].map(btn => (
               <button 
                 key={btn.id}
                 onClick={() => applyFormatting(btn.tag)}
                 title={btn.label}
                 className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-[#ff1744] transition-all active:scale-90"
               >
                 <btn.icon className="w-4 h-4" />
               </button>
             ))}
          </div>
        )}

        <div className={`flex items-end gap-2 bg-gray-50 dark:bg-slate-950 p-2 rounded-[2rem] border transition-all duration-300 ${isSearching ? 'opacity-50 pointer-events-none' : 'border-gray-100 dark:border-slate-800 focus-within:ring-4 focus-within:ring-[#ff1744]/10 focus-within:border-[#ff1744]/30'}`}>
           {isRecording ? (
             <div className="flex-1 flex items-center justify-between px-4 py-2 animate-in slide-in-from-bottom-4 duration-300">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-[#ff1744] rounded-full flex items-center justify-center animate-pulse-red"><Mic className="w-5 h-5 text-white" /></div>
                 <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase text-[#ff1744] tracking-widest">Recording</span>
                   <span className="text-lg font-black text-slate-800 dark:text-white font-mono">{formatDuration(recordingDuration)}</span>
                 </div>
               </div>
               <div className="flex items-center gap-2">
                 <button onClick={() => stopRecording(false)} className="p-3 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 transition-all active:scale-90"><Trash2 className="w-5 h-5" /></button>
                 <button onClick={() => stopRecording(true)} className="p-3 bg-[#ff1744] text-white rounded-full shadow-xl shadow-red-500/30 hover:scale-105 active:scale-95 transition-all"><StopCircle className="w-6 h-6" /></button>
               </div>
             </div>
           ) : (
             <>
               <button 
                 onClick={() => setShowAttachments(!showAttachments)} 
                 className={`p-3 rounded-full transition-all duration-500 ${showAttachments ? 'bg-[#ff1744] text-white rotate-45 scale-110' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-[#ff1744] hover:scale-110'}`}
               >
                 <Plus className="w-6 h-6" />
               </button>
               <textarea 
                 ref={textareaRef}
                 value={inputText} 
                 onChange={handleInputChange} 
                 placeholder={isSearching ? "Jump to matches..." : "Type a message..."} 
                 className="flex-1 bg-transparent text-slate-800 dark:text-white p-2.5 outline-none resize-none max-h-40 font-bold text-sm" 
                 rows={1} 
                 onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
               />
               {inputText.trim() ? (
                 <button onClick={() => handleSend()} className="p-3 bg-[#ff1744] text-white rounded-full shadow-lg shadow-red-500/30 hover:scale-110 active:scale-95 transition-all animate-in zoom-in duration-300"><Send className="w-6 h-6" /></button>
               ) : (
                 <button onClick={startRecording} className="p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-full hover:text-[#ff1744] hover:scale-110 transition-all active:scale-90"><Mic className="w-6 h-6" /></button>
               )}
             </>
           )}
        </div>
      </div>
      {showAttachments && (
        <div className="absolute bottom-24 left-6 right-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-[3rem] p-6 shadow-2xl grid grid-cols-4 gap-6 animate-in zoom-in-95 duration-300 origin-bottom-left z-40">
          {[
            { id: 'img', icon: ImageIcon, label: 'Photos', color: 'text-purple-500', action: () => { if (fileInputRef.current) { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click(); } } }, 
            { id: 'vid', icon: Video, label: 'Video', color: 'text-pink-500', action: () => { if (fileInputRef.current) { fileInputRef.current.accept = 'video/*'; fileInputRef.current.click(); } } }, 
            { id: 'mus', icon: Music, label: 'Audio', color: 'text-blue-500', action: () => { if (fileInputRef.current) { fileInputRef.current.accept = 'audio/*'; fileInputRef.current.click(); } } }, 
            { id: 'doc', icon: FileIcon, label: 'Document', color: 'text-orange-500', action: () => { if (fileInputRef.current) { fileInputRef.current.accept = '*/*'; fileInputRef.current.click(); } } }, 
            { id: 'loc', icon: MapPin, label: 'Location', color: 'text-emerald-500', action: handleLocationSend }, 
            { id: 'pay', icon: DollarSign, label: 'Pay', color: 'text-amber-500', action: () => setShowMoneyModal(true) }
          ].map(item => (
            <div key={item.id} onClick={item.action} className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border border-gray-100 dark:border-slate-700">
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

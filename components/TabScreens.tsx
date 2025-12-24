
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Plus, Heart, MessageCircle, Share2,
  Users, ShoppingCart, ShoppingBag,
  Settings, Shield, Smartphone, HelpCircle, LogOut,
  Wallet, ArrowUpRight, ArrowDownLeft, QrCode,
  CreditCard, Send, Scan, Target,
  Zap, TrendingUp,
  Compass, User as UserIcon, ArrowRightLeft, X, Trash2,
  Lock, Fingerprint, Check,
  ChevronLeft, ChevronRight, Camera, Moon, Sun, ShieldCheck, Key,
  Layout, ListTodo, Calendar, Link, MoreHorizontal,
  UploadCloud, Tag, Star, Truck, MapPin, Globe, Loader2,
  Radio, Hash, Play, Pause, Flame, Landmark, Maximize2, Laptop, Monitor, Mail, ChevronDown,
  Bell, Eye, EyeOff, AlertTriangle, CircleDashed, CheckCircle2, XCircle, Copy, Terminal,
  History, Sparkles, Image as ImageIcon, Box, Layers, MapPin as MapPinIcon, Info as InfoIcon, Edit3, Save,
  Fingerprint as SecurityIcon, Shield as ShieldIcon, RefreshCcw, Languages, Accessibility,
  MessageSquareHeart, Bug, BookOpen, ShieldAlert, Wallet as WalletIcon, ShoppingCart as MarketIcon,
  Package, Info, MapPin as LocationIcon, CheckCircle, Minus, ShoppingCart as CartIcon, MoveRight,
  Trophy, Rocket, Coffee, Palette, Gamepad2, Cpu, Type as TypeIcon, HardDrive, MonitorSmartphone,
  Phone, Video, PhoneMissed, VideoOff, SendHorizonal, Smile
} from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { Space, WorkspaceWidget, Product, Story, Transaction, AppSettings, CartItem, User, CallLog } from '../types';
import { useGlobalState, useGlobalDispatch } from '../store';
import { api } from '../services/api';
import { storageService } from '../services/storage';
import { notificationService } from '../services/notificationService';
import { supabase } from '../services/supabase';
import { getCurrencyConversion, CurrencyConversion } from '../services/geminiService';

const SettingRow: React.FC<{
  icon: React.ElementType,
  title: string,
  subtitle?: string,
  value?: string | boolean,
  onClick?: () => void,
  isToggle?: boolean,
  color?: string,
  isDanger?: boolean
}> = ({ icon: Icon, title, subtitle, value, onClick, isToggle, color = "text-slate-400", isDanger }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between p-5 transition-all group border-b border-gray-50 dark:border-slate-800/50 last:border-0 ${isDanger ? 'hover:bg-red-50 dark:hover:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${isDanger ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-slate-100 dark:bg-slate-800 ' + color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-left">
        <h4 className={`font-black uppercase text-[10px] tracking-widest ${isDanger ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>{title}</h4>
        {subtitle && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="flex items-center gap-3">
      {isToggle ? (
        <div className={`w-12 h-6 rounded-full relative transition-all ${value ? 'bg-[#ff1744]' : 'bg-slate-200 dark:bg-slate-700'}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${value ? 'left-7' : 'left-1'}`}></div>
        </div>
      ) : (
        <>
          {value && <span className="text-[10px] font-black text-[#ff1744] uppercase tracking-widest">{value}</span>}
          <ChevronRight className={`w-4 h-4 ${isDanger ? 'text-red-300' : 'text-slate-300'}`} />
        </>
      )}
    </div>
  </button>
);

const SettingSubHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="flex items-center gap-4 mb-8 sticky top-0 bg-gray-50/80 dark:bg-slate-950/80 backdrop-blur-xl z-20 py-2">
    <button onClick={onBack} className="p-2.5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
      <ChevronLeft className="w-5 h-5" />
    </button>
    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">{title}</h2>
  </div>
);

interface UserStoryGroup {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: Story[];
}

const StoryViewerModal: React.FC<{
  groups: UserStoryGroup[];
  initialGroupId: string;
  onClose: () => void;
}> = ({ groups, initialGroupId, onClose }) => {
  const [groupIndex, setGroupIndex] = useState(() => {
    const idx = groups.findIndex(g => g.userId === initialGroupId);
    return idx === -1 ? 0 : idx;
  });
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reply, setReply] = useState('');
  const dispatch = useGlobalDispatch();
  const progressTimerRef = useRef<any>(null);
  const touchStartTimeRef = useRef<number>(0);

  const activeGroup = groups[groupIndex];
  const activeStory = activeGroup?.stories[storyIndex];

  useEffect(() => {
    if (activeStory && !isPaused) {
      setProgress(0);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);

      const duration = 5000; // 5 seconds per story
      const interval = 50;
      const step = (interval / duration) * 100;

      progressTimerRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            handleNext();
            return 100;
          }
          return p + step;
        });
      }, interval);
    } else {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }
    return () => clearInterval(progressTimerRef.current);
  }, [groupIndex, storyIndex, isPaused, groups.length]);

  const handleNext = () => {
    if (storyIndex < activeGroup.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
      setProgress(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const handleDeleteStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeStory && window.confirm("Delete this story?")) {
      dispatch({ type: 'DELETE_STORY', payload: activeStory.id });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Story deleted' } });

      if (activeGroup.stories.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    }
  };

  const handleTouchStart = () => {
    touchStartTimeRef.current = Date.now();
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.MouseEvent | React.TouchEvent) => {
    const duration = Date.now() - touchStartTimeRef.current;
    setIsPaused(false);

    if (duration < 200) {
      const { clientX } = 'touches' in e ? e.touches[0] || (e as any).changedTouches[0] : e as React.MouseEvent;
      const screenWidth = window.innerWidth;
      if (clientX < screenWidth / 3) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  const handleSendReply = () => {
    if (!reply.trim()) return;
    dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Reply sent to ' + activeStory.userName } });
    setReply('');
    setIsPaused(false);
  };

  if (!activeStory) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300 select-none">
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden"
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeStory.type === 'image' ? (
          <>
            <div className="absolute inset-0 blur-3xl opacity-30 scale-150">
              <img src={activeStory.content} className="w-full h-full object-cover" alt="" />
            </div>
            <img src={activeStory.content} className="relative z-10 max-w-full max-h-full object-contain shadow-2xl" alt="Story" />
          </>
        ) : (
          <div className={`w-full h-full flex items-center justify-center p-12 text-center transition-all duration-500 ${activeStory.background || 'bg-gradient-to-br from-[#ff1744] to-purple-600'}`}>
            <h2 className="text-4xl font-black text-white leading-tight uppercase tracking-tighter drop-shadow-lg">{activeStory.content}</h2>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 z-20 pointer-events-none"></div>

        <div className="absolute top-0 left-0 right-0 p-4 pt-6 z-30 flex flex-col gap-4">
          <div className="flex gap-1.5 px-2">
            {activeGroup.stories.map((_, idx) => (
              <div key={idx} className="h-1 bg-white/20 rounded-full flex-1 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width: idx < storyIndex ? '100%' : idx === storyIndex ? `${progress}%` : '0%'
                  }}
                ></div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-3">
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#ff1744] to-orange-400 shadow-lg">
                <img src={activeGroup.userAvatar} className="w-10 h-10 rounded-full border-2 border-black object-cover" alt={activeGroup.userName} />
              </div>
              <div className="flex flex-col">
                <h4 className="font-bold text-white text-sm tracking-tight leading-none mb-1">{activeGroup.userName}</h4>
                <p className="text-[9px] text-white/60 font-black uppercase tracking-widest">{activeStory.timestamp}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeGroup.userId === 'me' && (
                <button onClick={handleDeleteStory} className="p-2 text-white/80 hover:text-red-400 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button className="p-2 text-white/80 hover:text-white transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeStory.caption && activeStory.type === 'image' && (
        <div className="absolute bottom-24 left-0 right-0 px-8 flex justify-center text-center z-30 pointer-events-none">
          <p className="max-w-md text-white font-semibold text-lg drop-shadow-md">{activeStory.caption}</p>
        </div>
      )}

      <div className="p-4 pb-8 bg-black z-40">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3 bg-white/10 backdrop-blur-3xl px-4 py-2 rounded-full border border-white/10">
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              placeholder="Send a message..."
              className="flex-1 bg-transparent text-white py-2 outline-none font-bold text-sm placeholder-white/40"
            />
            <button onClick={handleSendReply} className="text-[#ff1744] hover:scale-110 active:scale-95 transition-all">
              <SendHorizonal className="w-5 h-5 fill-current" />
            </button>
          </div>
          <div className="flex gap-2">
            {['❤️', '🔥', '😂'].map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: `Reacted with ${emoji}` } });
                  handleNext();
                }}
                className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AddStoryModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const dispatch = useGlobalDispatch();
  const [mode, setMode] = useState<'image' | 'text'>('image');
  const [image, setImage] = useState('');
  const [textContent, setTextContent] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeBg, setActiveBg] = useState('bg-gradient-to-br from-[#ff1744] to-purple-600');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gradients = [
    'bg-gradient-to-br from-[#ff1744] to-purple-600',
    'bg-gradient-to-br from-indigo-500 to-emerald-500',
    'bg-gradient-to-br from-orange-400 to-rose-400',
    'bg-slate-900',
    'bg-gradient-to-br from-blue-600 to-indigo-700'
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      try {
        const url = await storageService.uploadFile(e.target.files[0]);
        setImage(url);
      } catch (error: any) {
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Upload failed.' } });
      } finally {
        setUploading(false);
      }
    }
  };

  const handlePost = async () => {
    if (mode === 'image' && !image) return;
    if (mode === 'text' && !textContent) return;

    setLoading(true);
    try {
      const content = mode === 'image' ? image : textContent;
      const newStory: Story = {
        id: Date.now().toString(),
        userId: 'me',
        userName: 'Me',
        userAvatar: 'https://ui-avatars.com/api/?name=Me&background=ff1744&color=fff',
        type: mode,
        content: content,
        timestamp: 'Just now',
        viewed: false,
        caption: mode === 'image' ? caption : undefined,
        background: mode === 'text' ? activeBg : undefined
      };
      dispatch({ type: 'ADD_STORY', payload: newStory });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Posted successfully' } });
      onClose();
      resetForm();
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Post failed.' } });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setImage(''); setTextContent(''); setCaption(''); setMode('image');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-2xl animate-in fade-in p-4 overflow-y-auto no-scrollbar">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-sm p-8 relative shadow-2xl border border-white/10 animate-in zoom-in-95 my-auto">
        <button onClick={onClose} className="absolute top-8 right-8 p-2 bg-gray-100 dark:bg-slate-800 rounded-full hover:rotate-90 transition-transform"><X className="w-5 h-5 text-slate-500" /></button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-[#ff1744]">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Add Story</h3>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Share with friends</p>
          </div>
        </div>

        <div className="flex gap-2 mb-8 bg-gray-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-800">
          <button onClick={() => setMode('image')} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'image' ? 'bg-white dark:bg-slate-800 text-[#ff1744] shadow-sm' : 'text-slate-400'}`}>Photo</button>
          <button onClick={() => setMode('text')} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'text' ? 'bg-white dark:bg-slate-800 text-[#ff1744] shadow-sm' : 'text-slate-400'}`}>Text</button>
        </div>

        {mode === 'image' ? (
          <div className="space-y-6">
            <div onClick={() => !uploading && fileInputRef.current?.click()} className="aspect-square bg-gray-50 dark:bg-slate-950 rounded-[2.5rem] overflow-hidden relative flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 group cursor-pointer hover:border-[#ff1744]/50 transition-colors">
              {image ? <img src={image} className="w-full h-full object-cover" alt="Preview" /> : (
                <>
                  <Camera className="w-10 h-10 text-slate-300 group-hover:text-[#ff1744] transition-colors mb-2" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Select Image</span>
                </>
              )}
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}
            </div>
            <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-[#ff1744]/10 transition-all" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className={`aspect-square rounded-[2.5rem] flex flex-col items-center justify-center p-8 transition-all duration-500 shadow-xl ${activeBg}`}>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full bg-transparent text-white text-center text-2xl font-black placeholder-white/40 border-none outline-none resize-none uppercase tracking-tighter"
                rows={4}
              />
            </div>
            <div className="flex justify-center gap-3">
              {gradients.map(g => (
                <button
                  key={g}
                  onClick={() => setActiveBg(g)}
                  className={`w-8 h-8 rounded-full border-4 transition-all ${activeBg === g ? 'border-white scale-125' : 'border-transparent scale-90'} ${g}`}
                />
              ))}
            </div>
          </div>
        )}

        <button onClick={handlePost} disabled={loading || uploading || (mode === 'image' ? !image : !textContent)} className="w-full mt-10 py-5 bg-[#ff1744] text-white font-black rounded-[2rem] shadow-xl shadow-red-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <span>Post Story</span>
              <Sparkles className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const CreateSpaceModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const dispatch = useGlobalDispatch();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      try {
        const url = await storageService.uploadFile(e.target.files[0]);
        setImage(url);
      } catch (error: any) {
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Upload failed.' } });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleCreate = async () => {
    if (!name || !image) return;
    setLoading(true);
    try {
      const space = await api.spaces.create({ name, description: desc, image });
      dispatch({ type: 'ADD_SPACE', payload: space });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Space created successfully!' } });
      onClose();
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in p-6">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-slate-800 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-6">Create Space</h3>

        <div className="space-y-4">
          <div onClick={() => fileInputRef.current?.click()} className="aspect-video bg-gray-50 dark:bg-slate-950 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-500 transition-colors relative overflow-hidden">
            {image ? <img src={image} className="w-full h-full object-cover" /> : (
              <>
                <UploadCloud className="w-8 h-8 text-slate-300 mb-2" />
                <span className="text-[10px] font-black uppercase text-slate-400">Cover Image</span>
              </>
            )}
            <input type="file" ref={fileInputRef} hidden onChange={handleImageUpload} />
            {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}
          </div>

          <input value={name} onChange={e => setName(e.target.value)} placeholder="Space Name" className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-xl font-bold outline-none border border-transparent focus:border-blue-500 transition-all placeholder:text-slate-400 text-sm" />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" rows={3} className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-xl font-bold outline-none border border-transparent focus:border-blue-500 transition-all placeholder:text-slate-400 text-sm resize-none" />

          <button onClick={handleCreate} disabled={loading || uploading || !name} className="w-full py-4 bg-[#ff1744] text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-red-500/30 active:scale-95 transition-all disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Launch Space'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SellItemModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const dispatch = useGlobalDispatch();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('General');
  const [condition, setCondition] = useState('New');
  const [location, setLocation] = useState('Metaverse');
  const [image, setImage] = useState('');
  const [desc, setDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      try {
        const url = await storageService.uploadFile(e.target.files[0]);
        setImage(url);
      } catch (error: any) {
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Upload failed.' } });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSell = async () => {
    if (!title || !price || !image) return;
    setLoading(true);
    try {
      const product = await api.market.create({
        title,
        price: parseFloat(price),
        image,
        description: desc,
        category,
        condition,
        location
      });
      dispatch({ type: 'ADD_PRODUCT', payload: product });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Item listed for sale!' } });
      onClose();
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in p-6">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative h-[80vh] overflow-y-auto no-scrollbar">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-slate-800 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-6">Sell Item</h3>

        <div className="space-y-4">
          <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-gray-50 dark:bg-slate-950 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 cursor-pointer hover:border-green-500 transition-colors relative overflow-hidden">
            {image ? <img src={image} className="w-full h-full object-cover" /> : (
              <>
                <Camera className="w-8 h-8 text-slate-300 mb-2" />
                <span className="text-[10px] font-black uppercase text-slate-400">Product Photo</span>
              </>
            )}
            <input type="file" ref={fileInputRef} hidden onChange={handleImageUpload} />
            {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}
          </div>

          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Item Title" className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-xl font-bold outline-none border border-transparent focus:border-green-500 transition-all placeholder:text-slate-400 text-sm" />

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full pl-8 bg-gray-50 dark:bg-slate-950 p-4 rounded-xl font-bold outline-none border border-transparent focus:border-green-500 transition-all placeholder:text-slate-400 text-sm" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City" className="w-full pl-10 bg-gray-50 dark:bg-slate-950 p-4 rounded-xl font-bold outline-none border border-transparent focus:border-green-500 transition-all placeholder:text-slate-400 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-xl font-bold outline-none text-slate-500 text-sm appearance-none">
              <option>General</option>
              <option>Electronics</option>
              <option>Fashion</option>
              <option>Home</option>
              <option>Vehicles</option>
            </select>
            <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-xl font-bold outline-none text-slate-500 text-sm appearance-none">
              <option>New</option>
              <option>Like New</option>
              <option>Used</option>
              <option>Damaged</option>
            </select>
          </div>

          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description..." rows={3} className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-xl font-bold outline-none border border-transparent focus:border-green-500 transition-all placeholder:text-slate-400 text-sm resize-none" />

          <button onClick={handleSell} disabled={loading || uploading || !title} className="w-full py-4 bg-[#ff1744] text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-red-500/30 active:scale-95 transition-all disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'List Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditProfileModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { currentUser } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      try {
        const url = await storageService.uploadFile(e.target.files[0]);
        setAvatar(url);
      } catch (error: any) {
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Upload failed.' } });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await api.auth.updateProfile({ name, bio, avatar });
      dispatch({ type: 'UPDATE_USER', payload: updated });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Profile updated' } });
      onClose();
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in p-6">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-slate-800 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-6">Edit Profile</h3>
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div onClick={() => !uploading && fileInputRef.current?.click()} className="w-24 h-24 rounded-full relative group cursor-pointer">
              <img src={avatar} className="w-full h-full rounded-full object-cover border-4 border-slate-100 dark:border-slate-800 group-hover:opacity-50 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-slate-900 dark:text-white" />
              </div>
              {uploading && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}
              <input type="file" ref={fileInputRef} hidden onChange={handleImageUpload} />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-xl font-bold outline-none text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full bg-gray-50 dark:bg-slate-950 p-4 rounded-xl font-bold outline-none text-sm resize-none" />
          </div>
          <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-[#ff1744] text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-red-500/30 active:scale-95 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
export const StatusScreen: React.FC = () => {
  const { stories, currentUser } = useGlobalState();
  const [showAddStory, setShowAddStory] = useState(false);
  const [activeViewerId, setActiveViewerId] = useState<string | null>(null);

  const storyGroups = useMemo(() => {
    const grouped = stories.reduce((acc, story) => {
      if (!acc[story.userId]) {
        acc[story.userId] = {
          userId: story.userId,
          userName: story.userName,
          userAvatar: story.userAvatar,
          stories: []
        };
      }
      acc[story.userId].stories.push(story);
      return acc;
    }, {} as Record<string, UserStoryGroup>);

    return Object.values(grouped);
  }, [stories]);

  return (
    <div className="min-h-full bg-white dark:bg-slate-950 transition-colors pb-32 overflow-y-auto no-scrollbar">
      <AddStoryModal isOpen={showAddStory} onClose={() => setShowAddStory(false)} />
      {activeViewerId && (
        <StoryViewerModal
          groups={storyGroups}
          initialGroupId={activeViewerId}
          onClose={() => setActiveViewerId(null)}
        />
      )}

      <div className="px-6 pt-6 pb-4">
        <div className="flex gap-5 overflow-x-auto pb-6 no-scrollbar -mx-2 px-2">
          <div className="flex flex-col items-center gap-3 shrink-0 cursor-pointer group" onClick={() => setShowAddStory(true)}>
            <div className="relative">
              <div className="w-[4.5rem] h-[4.5rem] rounded-[2rem] p-0.5 border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                <img src={currentUser?.avatar} className="w-full h-full object-cover opacity-60 grayscale group-hover:scale-110 transition-transform" alt="Me" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#ff1744] rounded-xl border-4 border-white dark:border-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                <Plus className="w-4 h-4 text-white" strokeWidth={4} />
              </div>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Add</span>
          </div>

          {storyGroups.map((group) => {
            const firstStory = group.stories[0];
            const allViewed = group.stories.every(s => s.viewed);

            return (
              <div key={group.userId} className="flex flex-col items-center gap-3 shrink-0 cursor-pointer group" onClick={() => setActiveViewerId(group.userId)}>
                <div className={`w-[4.5rem] h-[4.5rem] rounded-[2rem] p-1 ${allViewed ? 'bg-slate-200 dark:bg-slate-800' : 'bg-gradient-to-tr from-[#ff1744] to-red-400'}`}>
                  <div className="w-full h-full rounded-[1.8rem] overflow-hidden border-2 border-white dark:border-slate-950 bg-slate-100 dark:bg-slate-800">
                    {firstStory.type === 'image' ? (
                      <img src={firstStory.content} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={group.userName} />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center p-2 text-center text-[6px] font-black text-white ${firstStory.background}`}>
                        {firstStory.content.substring(0, 15)}...
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase truncate w-16 text-center">
                  {group.userId === 'me' ? 'Me' : group.userName.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 space-y-8 mt-4">
        <div>
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
            <Radio className="w-3 h-3 text-[#ff1744]" /> Friend Updates
          </h3>
          {storyGroups.filter(g => g.userId !== 'me').length === 0 ? (
            <div className="bg-gray-50 dark:bg-slate-900 rounded-[2.5rem] p-12 text-center opacity-40 border border-dashed border-gray-200 dark:border-slate-800">
              <CircleDashed className="w-10 h-10 mx-auto mb-4 animate-spin duration-[5s]" />
              <p className="text-[10px] font-black uppercase tracking-widest">No updates yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {storyGroups.filter(g => g.userId !== 'me').map(group => {
                const firstStory = group.stories[0];
                const allViewed = group.stories.every(s => s.viewed);

                return (
                  <div key={group.userId + '_list'} onClick={() => setActiveViewerId(group.userId)} className="flex items-center gap-5 p-5 rounded-[2.25rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group">
                    <div className="relative">
                      <img src={group.userAvatar} className="w-16 h-16 rounded-2xl object-cover shadow-md group-hover:scale-110 transition-transform" alt={group.userName} />
                      {!allViewed && <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff1744] rounded-full border-2 border-white dark:border-slate-900 shadow-sm animate-pulse"></div>}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg">{group.userName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{group.stories.length} updates • {firstStory.timestamp}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-gray-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-[#ff1744] transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// Fixed: Added missing DiscoveryScreen export
export const DiscoveryScreen: React.FC = () => {
  return (
    <div className="min-h-full bg-white dark:bg-slate-950 p-6 overflow-y-auto no-scrollbar pb-32">
      <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 text-slate-900 dark:text-white">Discover</h2>
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <Compass className="w-16 h-16 mb-4 text-slate-300" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No trending content</p>
      </div>
    </div>
  );
};

// Fixed: Added missing SpacesScreen export
export const SpacesScreen: React.FC<{ spaces: Space[] }> = ({ spaces }) => {
  const dispatch = useGlobalDispatch();
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);

  const handleToggleJoin = async (space: Space) => {
    setLoadingIds(prev => new Set(prev).add(space.id));
    try {
      if (space.joined) {
        await api.spaces.leave(space.id);
      } else {
        await api.spaces.join(space.id);
      }
      dispatch({ type: 'JOIN_SPACE', payload: space.id });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: space.joined ? `Left ${space.name}` : `Linked to ${space.name}` } });
    } catch (e) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Connection failed' } });
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(space.id);
        return next;
      });
    }
  };

  return (
    <div className="min-h-full bg-white dark:bg-slate-950 p-6 overflow-y-auto no-scrollbar pb-32">
      <CreateSpaceModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Explore Spaces</h2>
        <button onClick={() => setShowCreate(true)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:scale-105 active:scale-95 transition-all">
          <Plus className="w-5 h-5 text-slate-900 dark:text-white" />
        </button>
      </div>
      <div className="grid gap-4">
        {spaces.length === 0 ? (
          <div className="py-20 text-center opacity-30">
            <Layers className="w-12 h-12 mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">No spaces found</p>
          </div>
        ) : spaces.map(space => (
          <div key={space.id} className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50">
                <img src={space.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{space.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{space.members.toLocaleString()} Active Nodes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (space.joined) {
                    dispatch({ type: 'SET_TAB', payload: 'chats' });
                  } else {
                    handleToggleJoin(space);
                  }
                }}
                disabled={loadingIds.has(space.id)}
                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${space.joined ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 shadow-md' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'}`}
              >
                {loadingIds.has(space.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                  space.joined ? (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      Enter
                    </>
                  ) : 'Link Up'
                )}
              </button>
              {space.joined && (
                <button onClick={() => handleToggleJoin(space)} className="p-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Fixed: Added missing MarketplaceScreen export
const CartDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { cart } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [loading, setLoading] = useState(false); // Add state for loading
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      await api.wallet.pay(total, `Purchase at Market (${cart.length} items)`);
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: `Order placed for $${total.toFixed(2)}` } });
      dispatch({ type: 'CLEAR_CART' });
      onClose();
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={onClose}></div>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md h-[80vh] sm:rounded-3xl rounded-t-[3rem] shadow-2xl z-10 flex flex-col pointer-events-auto animate-in slide-in-from-bottom border-t border-white/20">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Your Bag</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
              <ShoppingBag className="w-16 h-16 mb-4 text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your bag is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-slate-950 rounded-3xl border border-gray-100 dark:border-slate-800">
                <div className="w-16 h-16 bg-white rounded-2xl overflow-hidden shrink-0"><img src={item.image} className="w-full h-full object-cover" alt="" /></div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{item.title}</h4>
                  <p className="text-[#ff1744] font-black text-xs">${item.price}</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => dispatch({ type: 'REMOVE_FROM_CART', payload: item.id })} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  <span className="text-[10px] font-black bg-white dark:bg-slate-800 px-2 py-1 rounded-lg">x{item.quantity}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-gray-50 dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 pb-10">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">${total.toFixed(2)}</span>
          </div>
          <button onClick={handleCheckout} disabled={cart.length === 0 || loading} className="w-full py-4 bg-[#ff1744] text-white font-black rounded-[2rem] shadow-xl shadow-red-500/30 uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const MarketplaceScreen: React.FC = () => {
  const { products, cart } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [showCart, setShowCart] = useState(false);
  const [showSell, setShowSell] = useState(false);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-full bg-white dark:bg-slate-950 p-6 overflow-y-auto no-scrollbar pb-32">
      <CartDrawer isOpen={showCart} onClose={() => setShowCart(false)} />
      <SellItemModal isOpen={showSell} onClose={() => setShowSell(false)} />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Market</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowSell(true)} className="p-2 bg-gray-50 dark:bg-slate-900 rounded-xl relative group hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <Plus className="w-5 h-5 text-emerald-500" />
          </button>
          <button onClick={() => setShowCart(true)} className="p-2 bg-gray-50 dark:bg-slate-900 rounded-xl relative group hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <CartIcon className="w-5 h-5 text-[#ff1744]" />
            {cartCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[8px] font-black rounded-full flex items-center justify-center shadow-lg">{cartCount}</div>}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden group shadow-sm flex flex-col hover:shadow-xl transition-all duration-300">
            <div className="aspect-square relative overflow-hidden bg-slate-100">
              <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={product.title} />
              <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 shadow-sm">
                <span className="text-[9px] font-black uppercase text-[#ff1744] tracking-widest">${product.price}</span>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <h4 className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-tight truncate mb-2">{product.title}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    dispatch({ type: 'SET_TAB', payload: 'chats' });
                    dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: `Chat started with ${product.seller}` } });
                  }}
                  className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  Message
                </button>
                <button
                  onClick={() => {
                    dispatch({ type: 'ADD_TO_CART', payload: { ...product, quantity: 1 } });
                    dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Added to bag' } });
                  }}
                  className="flex-[2] py-2.5 bg-[#ff1744] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-red-500/20 transition-all active:scale-95"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Fixed: Added missing ProfileScreen export
export const ProfileScreen: React.FC = () => {
  const { currentUser, theme } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [showEdit, setShowEdit] = useState(false);

  return (
    <div className="min-h-full bg-white dark:bg-slate-950 p-6 overflow-y-auto no-scrollbar pb-32">
      <EditProfileModal isOpen={showEdit} onClose={() => setShowEdit(false)} />
      <div className="flex flex-col items-center mb-10 mt-4">
        <div className="relative group mb-4">
          <div className="absolute -inset-1 bg-gradient-to-tr from-[#ff1744] to-orange-400 rounded-[2.5rem] blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
          <img src={currentUser?.avatar} className="w-28 h-28 rounded-[2.5rem] shadow-xl border-4 border-white dark:border-slate-900 relative z-10 object-cover" alt="" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{currentUser?.name}</h3>
        <div className="mt-1 px-4 py-1 bg-red-50 dark:bg-red-900/10 rounded-full border border-red-100 dark:border-red-900/20">
          <p className="text-[#ff1744] text-[9px] font-black uppercase tracking-[0.2em]">{currentUser?.status || 'Active Node'}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <SettingRow icon={UserIcon} title="Account Data" subtitle="Personal info, username" onClick={() => setShowEdit(true)} />
          <SettingRow icon={Bell} title="Neural Notifications" subtitle="Alerts, sounds, vibrations" value={true} isToggle />
          <SettingRow icon={Shield} title="Link Security" subtitle="Biometrics, 2FA, encryption" />
          <SettingRow icon={theme === 'dark' ? Sun : Moon} title="Dark Synthesis" subtitle="Visual interface mode" value={theme === 'dark'} isToggle onClick={() => dispatch({ type: 'SET_THEME', payload: theme === 'dark' ? 'light' : 'dark' })} />
          <SettingRow icon={LogOut} title="Terminate Link" isDanger onClick={() => dispatch({ type: 'LOGOUT' })} />
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">PingSpace Protocol v1.0.4</p>
          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Encrypted. Decentralized. Neural.</p>
        </div>
      </div>
    </div>
  );
};

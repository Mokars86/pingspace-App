
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Plus, Heart, MessageCircle, Share2, List, Grid,
  Users, ShoppingCart, ShoppingBag,
  Settings, Shield, Smartphone, HelpCircle, LogOut,
  Wallet, ArrowUpRight, ArrowDownLeft, QrCode,
  CreditCard, Send, Scan, Target,
  Zap, TrendingUp,
  Compass, User as UserIcon, ArrowRightLeft, X, Trash2, ArrowLeft,
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
  Phone as PhoneIcon, Video, PhoneMissed, VideoOff, SendHorizonal, Smile
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
      const storyData = {
        type: mode,
        content: mode === 'image' ? image : textContent,
        caption: mode === 'image' ? caption : undefined,
        background: mode === 'text' ? activeBg : undefined
      };

      // Save to Supabase
      const savedStory = await api.stories.addStory(storyData);

      // Add to local state
      dispatch({ type: 'ADD_STORY', payload: savedStory });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Story posted successfully!' } });
      onClose();
      resetForm();
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message || 'Post failed.' } });
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

const SimpleEditProfileModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
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

// Discovery Screen - Full Implementation
const PostCard: React.FC<{ post: any; onLike: () => void; onShare: () => void }> = ({ post, onLike, onShare }) => {
  const [showComments, setShowComments] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <img src={post.userAvatar} alt={post.userName} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex-1">
          <h4 className="font-black text-slate-900 dark:text-white text-sm">{post.userName}</h4>
          <p className="text-[9px] text-slate-400 font-bold">{post.timestamp}</p>
        </div>
        <button className="p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full transition-colors"><MoreHorizontal className="w-5 h-5 text-slate-400" /></button>
      </div>
      <div className="px-4 pb-3"><p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{post.content}</p></div>
      {post.mediaUrl && post.mediaType === 'image' && (<div className="w-full bg-gray-100 dark:bg-slate-800"><img src={post.mediaUrl} alt="" className="w-full object-cover max-h-96" /></div>)}
      <div className="p-4 flex items-center justify-between border-t border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-6">
          <button onClick={onLike} className="flex items-center gap-2 group">
            <Heart className={`w-5 h-5 transition-all ${post.isLiked ? 'fill-[#ff1744] text-[#ff1744]' : 'text-slate-400 group-hover:text-[#ff1744]'}`} />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{post.likesCount}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 group">
            <MessageCircle className="w-5 h-5 text-slate-400 group-hover:text-[#ff1744] transition-colors" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{post.commentsCount}</span>
          </button>
          <button onClick={onShare} className="flex items-center gap-2 group">
            <Share2 className="w-5 h-5 text-slate-400 group-hover:text-[#ff1744] transition-colors" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{post.sharesCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const CreatePostModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const dispatch = useGlobalDispatch();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const handlePost = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const post = await api.discovery.createPost({ content, visibility: 'public' });
      dispatch({ type: 'ADD_POST', payload: post });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Post created!' } });
      onClose();
      setContent('');
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    } finally {
      setLoading(false);
    }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Create Post</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's on your mind?" className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20 min-h-[150px]" />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-6 py-3 bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all">Cancel</button>
          <button onClick={handlePost} disabled={!content.trim() || loading} className="px-6 py-3 bg-[#ff1744] text-white rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}Post
          </button>
        </div>
      </div>
    </div>
  );
};

export const DiscoveryScreen: React.FC = () => {
  const { posts, trendingUsers, products } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'people' | 'posts' | 'products' | 'spaces'>('all');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    loadDiscoveryData();
  }, []);

  const loadDiscoveryData = async () => {
    setLoading(true);
    try {
      const [trendingPeople, publicPosts] = await Promise.all([
        api.discovery.getTrendingPeople(10),
        api.discovery.getPublicPosts(20)
      ]);
      dispatch({ type: 'SET_TRENDING_USERS', payload: trendingPeople });
      dispatch({ type: 'SET_POSTS', payload: publicPosts });
    } catch (e) {
      console.error('Load discovery data error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await api.discovery.search(searchQuery, activeFilter);
        setSearchResults(results);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeFilter]);

  const handleFollowToggle = async (userId: string, isFollowing: boolean) => {
    try {
      if (isFollowing) await api.discovery.unfollowUser(userId);
      else await api.discovery.followUser(userId);
      dispatch({ type: 'TOGGLE_FOLLOW_USER', payload: { userId, isFollowing: !isFollowing } });
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    }
  };

  const handlePostLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) await api.discovery.unlikePost(postId);
      else await api.discovery.likePost(postId);
      dispatch({ type: 'TOGGLE_POST_LIKE', payload: { postId, isLiked: !isLiked } });
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    }
  };

  const handleShare = async (postId: string) => {
    try {
      await api.discovery.sharePost(postId);
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Post shared!' } });
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    }
  };

  const displayPosts = searchResults ? searchResults.posts : posts;
  const displayPeople = searchResults ? searchResults.people : trendingUsers;
  const displayProducts = searchResults ? searchResults.products : products;

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-950 overflow-y-auto no-scrollbar pb-32">
      <CreatePostModal isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} />
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users, spaces, products..." className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20 transition-all" />
            {loading && <Loader2 className="absolute right-4 top-3.5 w-5 h-5 text-[#ff1744] animate-spin" />}
          </div>
          <button onClick={() => setShowCreatePost(true)} className="p-3.5 bg-[#ff1744] text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/30"><Plus className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'people', 'posts', 'products', 'spaces'] as const).map(filter => (
            <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeFilter === filter ? 'bg-[#ff1744] text-white shadow-lg shadow-red-500/20' : 'bg-gray-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>{filter}</button>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-6">
        {(activeFilter === 'all' || activeFilter === 'people') && displayPeople.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-2">Trending People</h3>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {displayPeople.map((user: any) => (
                <div key={user.id} className="flex-shrink-0 w-32">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 text-center">
                    <div className="relative inline-block mb-3">
                      <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
                      {user.isVerified && (<div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#ff1744] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900"><Check className="w-3 h-3 text-white" /></div>)}
                    </div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white truncate mb-1">{user.name}</h4>
                    <p className="text-[9px] text-slate-400 font-bold mb-3">{user.followersCount} followers</p>
                    <button onClick={() => handleFollowToggle(user.id, user.isFollowing || false)} className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${user.isFollowing ? 'bg-gray-100 dark:bg-slate-800 text-slate-500' : 'bg-[#ff1744] text-white shadow-md'}`}>{user.isFollowing ? 'Following' : 'Follow'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {(activeFilter === 'all' || activeFilter === 'posts') && displayPosts.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-2">Public Posts</h3>
            <div className="space-y-4">{displayPosts.map((post: any) => (<PostCard key={post.id} post={post} onLike={() => handlePostLike(post.id, post.isLiked || false)} onShare={() => handleShare(post.id)} />))}</div>
          </div>
        )}
        {(activeFilter === 'all' || activeFilter === 'products') && displayProducts.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-2">Popular Products</h3>
            <div className="grid grid-cols-2 gap-4">
              {displayProducts.slice(0, 6).map((product: any) => (
                <div key={product.id} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 group">
                  <div className="aspect-square bg-gray-100 dark:bg-slate-800 overflow-hidden"><img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /></div>
                  <div className="p-3">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white truncate mb-1">{product.title}</h4>
                    <p className="text-[#ff1744] font-black text-lg mb-2">${product.price}</p>
                    <button onClick={() => dispatch({ type: 'ADD_TO_CART', payload: product })} className="w-full py-2 bg-[#ff1744] text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all">Quick Buy</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && displayPosts.length === 0 && displayPeople.length === 0 && displayProducts.length === 0 && (
          <div className="py-20 text-center opacity-30">
            <Compass className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{searchQuery ? 'No results found' : 'No content available'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Spaces Screen Implementation
export const SpacesScreen: React.FC<{ spaces: Space[] }> = ({ spaces }) => {
  const { selectedSpaceId, spaceDetails } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [activeTab, setActiveTab] = useState<'joined' | 'explore'>('joined');
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [joinedSpaces, setJoinedSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSpaces();
  }, [activeTab]);

  const loadSpaces = async () => {
    setLoading(true);
    try {
      if (activeTab === 'joined') {
        const joined = await api.spaces.getJoinedSpaces();
        setJoinedSpaces(joined);
      }
    } catch (e) {
      console.error('Load spaces error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJoin = async (space: Space) => {
    setLoadingIds(prev => new Set(prev).add(space.id));
    try {
      if (space.joined) {
        await api.spaces.leave(space.id);
      } else {
        await api.spaces.join(space.id);
      }
      dispatch({ type: 'JOIN_SPACE', payload: space.id });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: space.joined ? `Left ${space.name}` : `Joined ${space.name}` } });
      loadSpaces();
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(space.id);
        return next;
      });
    }
  };

  const handleSpaceClick = async (spaceId: string) => {
    dispatch({ type: 'SELECT_SPACE', payload: spaceId });
    try {
      const detail = await api.spaces.getSpaceDetail(spaceId);
      if (detail) {
        dispatch({ type: 'SET_SPACE_DETAIL', payload: { spaceId, detail } });
      }
    } catch (e) {
      console.error('Load space detail error:', e);
    }
  };

  const displaySpaces = activeTab === 'joined' ? joinedSpaces : spaces.filter(s => !s.joined);

  // If a space is selected, show detail view
  if (selectedSpaceId && spaceDetails[selectedSpaceId]) {
    return <SpaceDetailView spaceId={selectedSpaceId} />;
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-950 overflow-y-auto no-scrollbar pb-32">
      <CreateSpaceModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Spaces</h2>
          <button onClick={() => setShowCreate(true)} className="p-3 bg-[#ff1744] text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/30"><Plus className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('joined')} className={`flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'joined' ? 'bg-[#ff1744] text-white shadow-lg shadow-red-500/20' : 'bg-gray-100 dark:bg-slate-800 text-slate-500'}`}>Joined</button>
          <button onClick={() => setActiveTab('explore')} className={`flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'explore' ? 'bg-[#ff1744] text-white shadow-lg shadow-red-500/20' : 'bg-gray-100 dark:bg-slate-800 text-slate-500'}`}>Explore</button>
        </div>
      </div>
      <div className="p-4 grid gap-4">
        {loading ? (
          <div className="py-20 text-center"><Loader2 className="w-8 h-8 mx-auto mb-4 text-[#ff1744] animate-spin" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading spaces...</p></div>
        ) : displaySpaces.length === 0 ? (
          <div className="py-20 text-center opacity-30"><Layers className="w-12 h-12 mx-auto mb-4 text-slate-300" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{activeTab === 'joined' ? 'No joined spaces' : 'No spaces found'}</p></div>
        ) : (
          displaySpaces.map(space => (
            <div key={space.id} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
              <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 flex-shrink-0"><img src={space.image} alt={space.name} className="w-full h-full object-cover" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight truncate">{space.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{space.members.toLocaleString()} Members</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{space.description}</p>
                <div className="flex gap-2">
                  {space.joined ? (
                    <>
                      <button onClick={() => handleSpaceClick(space.id)} className="flex-1 py-3 bg-[#ff1744] text-white rounded-2xl text-sm font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/20">Open</button>
                      <button onClick={(e) => { e.stopPropagation(); handleToggleJoin(space); }} disabled={loadingIds.has(space.id)} className="px-4 py-3 bg-gray-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:text-red-500 transition-colors">{loadingIds.has(space.id) ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}</button>
                    </>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); handleToggleJoin(space); }} disabled={loadingIds.has(space.id)} className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-sm font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">{loadingIds.has(space.id) ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join Space'}</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Space Detail View Component
const SpaceDetailView: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const { spaceDetails, spacePosts, spaceEvents, spaceFiles, spaceMembers } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [activeTab, setActiveTab] = useState<'discussion' | 'events' | 'files' | 'members'>('discussion');
  const [loading, setLoading] = useState(false);
  const space = spaceDetails[spaceId];

  useEffect(() => {
    loadSpaceContent();
  }, [spaceId, activeTab]);

  const loadSpaceContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'discussion') {
        const posts = await api.spaces.getSpacePosts(spaceId);
        dispatch({ type: 'SET_SPACE_POSTS', payload: { spaceId, posts } });
      } else if (activeTab === 'events') {
        const events = await api.spaces.getSpaceEvents(spaceId);
        dispatch({ type: 'SET_SPACE_EVENTS', payload: { spaceId, events } });
      } else if (activeTab === 'files') {
        const files = await api.spaces.getSpaceFiles(spaceId);
        dispatch({ type: 'SET_SPACE_FILES', payload: { spaceId, files } });
      } else if (activeTab === 'members') {
        const members = await api.spaces.getSpaceMembers(spaceId);
        dispatch({ type: 'SET_SPACE_MEMBERS', payload: { spaceId, members } });
      }
    } catch (e) {
      console.error('Load space content error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!space) return null;

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-950 overflow-y-auto no-scrollbar pb-32">
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-[#ff1744] to-purple-600" />
        <button onClick={() => dispatch({ type: 'SELECT_SPACE', payload: null })} className="absolute top-4 left-4 p-3 bg-black/50 backdrop-blur-md text-white rounded-2xl hover:scale-105 active:scale-95 transition-all"><ArrowLeft className="w-5 h-5" /></button>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border-4 border-white dark:border-slate-900"><img src={space.image} alt={space.name} className="w-full h-full object-cover" /></div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{space.name}</h1>
              <p className="text-sm text-white/80">{space.members.toLocaleString()} members</p>
            </div>
          </div>
        </div>
      </div>
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['discussion', 'events', 'files', 'members'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab ? 'bg-[#ff1744] text-white shadow-lg shadow-red-500/20' : 'bg-gray-100 dark:bg-slate-800 text-slate-500'}`}>{tab}</button>
          ))}
        </div>
      </div>
      <div className="p-4">
        {activeTab === 'discussion' && <SpaceDiscussionTab spaceId={spaceId} posts={spacePosts[spaceId] || []} loading={loading} />}
        {activeTab === 'events' && <SpaceEventsTab spaceId={spaceId} events={spaceEvents[spaceId] || []} loading={loading} />}
        {activeTab === 'files' && <SpaceFilesTab spaceId={spaceId} files={spaceFiles[spaceId] || []} loading={loading} />}
        {activeTab === 'members' && <SpaceMembersTab members={spaceMembers[spaceId] || []} loading={loading} />}
      </div>
    </div>
  );
};

// Space Discussion Tab
const SpaceDiscussionTab: React.FC<{ spaceId: string; posts: any[]; loading: boolean }> = ({ spaceId, posts, loading }) => {
  const dispatch = useGlobalDispatch();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const post = await api.spaces.createSpacePost(spaceId, { content });
      dispatch({ type: 'ADD_SPACE_POST', payload: { spaceId, post } });
      setContent('');
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Posted!' } });
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) await api.spaces.unlikeSpacePost(postId);
      else await api.spaces.likeSpacePost(postId);
      dispatch({ type: 'TOGGLE_SPACE_POST_LIKE', payload: { spaceId, postId, isLiked: !isLiked } });
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-4">
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share something with the space..." className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20 min-h-[100px] mb-3" />
        <div className="flex justify-end">
          <button onClick={handlePost} disabled={!content.trim() || posting} className="px-6 py-2.5 bg-[#ff1744] text-white rounded-2xl text-sm font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">{posting && <Loader2 className="w-4 h-4 animate-spin" />}Post</button>
        </div>
      </div>
      {loading ? (
        <div className="py-10 text-center"><Loader2 className="w-8 h-8 mx-auto mb-4 text-[#ff1744] animate-spin" /></div>
      ) : posts.length === 0 ? (
        <div className="py-10 text-center opacity-30"><MessageCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No posts yet</p></div>
      ) : (
        posts.map(post => (
          <div key={post.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <img src={post.userAvatar} alt={post.userName} className="w-10 h-10 rounded-full object-cover" />
              <div><h4 className="font-black text-slate-900 dark:text-white text-sm">{post.userName}</h4><p className="text-[9px] text-slate-400 font-bold">{post.timestamp}</p></div>
            </div>
            <div className="px-4 pb-4"><p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{post.content}</p></div>
            <div className="px-4 pb-4 flex items-center gap-6 border-t border-gray-100 dark:border-slate-800 pt-4">
              <button onClick={() => handleLike(post.id, post.isLiked || false)} className="flex items-center gap-2 group">
                <Heart className={`w-5 h-5 transition-all ${post.isLiked ? 'fill-[#ff1744] text-[#ff1744]' : 'text-slate-400 group-hover:text-[#ff1744]'}`} />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{post.likesCount}</span>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// Space Events Tab
const SpaceEventsTab: React.FC<{ spaceId: string; events: any[]; loading: boolean }> = ({ spaceId, events, loading }) => {
  const dispatch = useGlobalDispatch();
  const handleAttend = async (eventId: string, isAttending: boolean) => {
    try {
      if (isAttending) await api.spaces.leaveEvent(eventId);
      else await api.spaces.attendEvent(eventId);
      dispatch({ type: 'TOGGLE_EVENT_ATTENDANCE', payload: { spaceId, eventId, isAttending: !isAttending } });
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    }
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="w-8 h-8 mx-auto mb-4 text-[#ff1744] animate-spin" /></div>;
  if (events.length === 0) return <div className="py-10 text-center opacity-30"><Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No events scheduled</p></div>;

  return (
    <div className="space-y-4">
      {events.map(event => (
        <div key={event.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ff1744]/10 flex items-center justify-center flex-shrink-0"><Calendar className="w-6 h-6 text-[#ff1744]" /></div>
            <div className="flex-1">
              <h4 className="font-black text-lg text-slate-900 dark:text-white mb-1">{event.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{new Date(event.eventDate).toLocaleDateString()}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{event.description}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin className="w-4 h-4" /><span>{event.location}</span></div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
            <span className="text-xs text-slate-500">{event.attendeesCount} attending</span>
            <button onClick={() => handleAttend(event.id, event.isAttending || false)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${event.isAttending ? 'bg-gray-100 dark:bg-slate-800 text-slate-500' : 'bg-[#ff1744] text-white shadow-md'}`}>{event.isAttending ? 'Attending' : 'Attend'}</button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Space Files Tab
const SpaceFilesTab: React.FC<{ spaceId: string; files: any[]; loading: boolean }> = ({ spaceId, files, loading }) => {
  if (loading) return <div className="py-10 text-center"><Loader2 className="w-8 h-8 mx-auto mb-4 text-[#ff1744] animate-spin" /></div>;
  if (files.length === 0) return <div className="py-10 text-center opacity-30"><HardDrive className="w-12 h-12 mx-auto mb-4 text-slate-300" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No files uploaded</p></div>;

  return (
    <div className="grid grid-cols-2 gap-4">
      {files.map(file => (
        <div key={file.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
          <div className="w-full aspect-square bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3"><HardDrive className="w-12 h-12 text-slate-400" /></div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate mb-1">{file.fileName}</h4>
          <p className="text-[9px] text-slate-400">{(file.fileSize / 1024).toFixed(1)} KB</p>
        </div>
      ))}
    </div>
  );
};

// Space Members Tab
const SpaceMembersTab: React.FC<{ members: any[]; loading: boolean }> = ({ members, loading }) => {
  if (loading) return <div className="py-10 text-center"><Loader2 className="w-8 h-8 mx-auto mb-4 text-[#ff1744] animate-spin" /></div>;
  if (members.length === 0) return <div className="py-10 text-center opacity-30"><Users className="w-12 h-12 mx-auto mb-4 text-slate-300" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No members</p></div>;

  return (
    <div className="space-y-2">
      {members.map(member => (
        <div key={member.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 flex items-center gap-4">
          <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-black text-slate-900 dark:text-white">{member.name}</h4>
              {member.role === 'admin' && <span className="px-2 py-0.5 bg-[#ff1744] text-white text-[8px] font-black uppercase rounded-full">Admin</span>}
            </div>
            <p className="text-xs text-slate-500">{member.bio || member.status}</p>
          </div>
        </div>
      ))}
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

// Enhanced Marketplace Screen
export const MarketplaceScreen: React.FC = () => {
  const { products, cart, marketViewMode, marketSearchQuery, marketFilters, productCategories } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [showCart, setShowCart] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState(products);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [marketSearchQuery, marketFilters, products]);

  const loadCategories = async () => {
    if (productCategories.length === 0) {
      const categories = await api.market.getCategories();
      dispatch({ type: 'SET_PRODUCT_CATEGORIES', payload: categories });
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const prods = await api.market.getProducts();
      dispatch({ type: 'SET_PRODUCTS', payload: prods });
    } catch (e) {
      console.error('Load products error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = async () => {
    if (marketSearchQuery || Object.keys(marketFilters).length > 0) {
      setLoading(true);
      try {
        const results = await api.market.searchProducts(marketSearchQuery, marketFilters);
        setFilteredProducts(results);
      } catch (e) {
        console.error('Filter error:', e);
      } finally {
        setLoading(false);
      }
    } else {
      setFilteredProducts(products);
    }
  };

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-950 overflow-y-auto no-scrollbar pb-32">
      <CartDrawer isOpen={showCart} onClose={() => setShowCart(false)} />
      <SellItemModal isOpen={showSell} onClose={() => setShowSell(false)} />

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}

      {/* Header with Search */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={marketSearchQuery}
              onChange={(e) => dispatch({ type: 'SET_MARKET_SEARCH', payload: e.target.value })}
              placeholder="Search products..."
              className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20 transition-all"
            />
            {loading && <Loader2 className="absolute right-4 top-3.5 w-5 h-5 text-[#ff1744] animate-spin" />}
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_MARKET_VIEW_MODE', payload: marketViewMode === 'grid' ? 'list' : 'grid' })}
            className="p-3.5 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            {marketViewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setShowCart(true)}
            className="p-3.5 bg-gray-50 dark:bg-slate-800 rounded-2xl relative hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-[#ff1744]" />
            {cartCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff1744] text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {cartCount}
              </div>
            )}
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
          {productCategories.slice(0, 5).map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                const newFilters = { ...marketFilters };
                if (newFilters.category === cat.id) {
                  delete newFilters.category;
                } else {
                  newFilters.category = cat.id;
                }
                dispatch({ type: 'SET_MARKET_FILTERS', payload: newFilters });
              }}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${marketFilters.category === cat.id
                ? 'bg-[#ff1744] text-white shadow-lg shadow-red-500/20'
                : 'bg-gray-100 dark:bg-slate-800 text-slate-500'
                }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { value: 'newest', label: 'Newest' },
            { value: 'price-low', label: 'Price: Low' },
            { value: 'price-high', label: 'Price: High' },
            { value: 'rating', label: 'Top Rated' }
          ].map(sort => (
            <button
              key={sort.value}
              onClick={() => dispatch({ type: 'SET_MARKET_FILTERS', payload: { ...marketFilters, sortBy: sort.value as any } })}
              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${marketFilters.sortBy === sort.value
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-gray-100 dark:bg-slate-800 text-slate-500'
                }`}
            >
              {sort.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid/List */}
      <div className="p-4">
        {loading && filteredProducts.length === 0 ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 text-[#ff1744] animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center opacity-30">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No products found</p>
          </div>
        ) : (
          <div className={marketViewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProductId(product.id)}
                className={`bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-lg transition-all ${marketViewMode === 'list' ? 'flex gap-4' : 'flex flex-col'
                  }`}
              >
                <div className={`${marketViewMode === 'grid' ? 'aspect-square' : 'w-32 h-32'} bg-gray-100 dark:bg-slate-800 overflow-hidden flex-shrink-0`}>
                  <img src={product.image} alt={product.title} className="w-full h-full object-cover hover:scale-110 transition-transform" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm mb-1 line-clamp-1">{product.title}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`w-3 h-3 ${i <= (product.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-[9px] text-slate-500">{product.rating?.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2 line-clamp-2">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-[#ff1744]">${product.price}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'ADD_TO_CART', payload: { ...product, quantity: 1 } });
                        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Added to cart!' } });
                      }}
                      className="px-4 py-2 bg-[#ff1744] text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB - Post Product */}
      <button
        onClick={() => setShowSell(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#ff1744] text-white rounded-full shadow-2xl shadow-red-500/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-30"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};

// Product Detail Modal Component (inline for now)
const ProductDetailModal: React.FC<{ productId: string; onClose: () => void }> = ({ productId, onClose }) => {
  const { productDetails, productReviews } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [loading, setLoading] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

  const product = productDetails[productId];
  const reviews = productReviews[productId] || [];

  useEffect(() => {
    loadProductDetail();
  }, [productId]);

  const loadProductDetail = async () => {
    setLoading(true);
    try {
      const detail = await api.market.getProductDetail(productId);
      if (detail) {
        dispatch({ type: 'SET_PRODUCT_DETAIL', payload: { productId, detail } });
        await api.market.incrementViews(productId);
      }
      const productReviews = await api.market.getProductReviews(productId);
      dispatch({ type: 'SET_PRODUCT_REVIEWS', payload: { productId, reviews: productReviews } });
    } catch (e) {
      console.error('Load product detail error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReview = async () => {
    if (!reviewText.trim()) return;
    try {
      const review = await api.market.addProductReview(productId, reviewRating, reviewText);
      dispatch({ type: 'ADD_PRODUCT_REVIEW', payload: { productId, review } });
      setReviewText('');
      setReviewRating(5);
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Review added!' } });
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    }
  };

  if (loading || !product) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50 dark:bg-slate-950">
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4 flex items-center justify-between">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-black text-lg">Product Details</h2>
        <div className="w-10" />
      </div>

      <div className="p-4 pb-32">
        <div className="aspect-square bg-gray-100 dark:bg-slate-800 rounded-3xl overflow-hidden mb-4">
          <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 mb-4">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{product.title}</h1>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-black text-[#ff1744]">${product.price}</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`w-4 h-4 ${i <= Math.round(product.ratingAvg || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
              ))}
              <span className="text-sm text-slate-500">({product.reviewsCount})</span>
            </div>
          </div>

          <p className="text-slate-700 dark:text-slate-300 mb-4">{product.description}</p>

          <div className="flex gap-2 mb-4">
            <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full text-xs font-bold">{product.condition}</span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full text-xs font-bold">{product.categoryName}</span>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
            <img src={product.sellerAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=seller'} alt={product.sellerName} className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-1">
              <h4 className="font-black text-slate-900 dark:text-white">{product.sellerName}</h4>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-3 h-3 ${i <= Math.round(product.sellerRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                ))}
                <span className="text-xs text-slate-500">({product.sellerReviewsCount})</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => {
              dispatch({ type: 'ADD_TO_CART', payload: { ...product, quantity: 1 } });
              dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Added to cart!' } });
            }}
            className="flex-1 py-4 bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all"
          >
            Add to Cart
          </button>
          <button
            onClick={() => dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'info', message: 'Checkout coming soon!' } })}
            className="flex-1 py-4 bg-[#ff1744] text-white rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/30"
          >
            Buy Now
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6">
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Reviews ({reviews.length})</h3>

          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold">Your Rating:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <button key={i} onClick={() => setReviewRating(i)}>
                    <Star className={`w-5 h-5 ${i <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Write your review..."
              className="w-full bg-white dark:bg-slate-900 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20 mb-3"
              rows={3}
            />
            <button
              onClick={handleAddReview}
              disabled={!reviewText.trim()}
              className="px-4 py-2 bg-[#ff1744] text-white rounded-xl text-sm font-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              Submit Review
            </button>
          </div>

          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                <div className="flex items-start gap-3 mb-2">
                  <img src={review.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + review.userId} alt={review.userName} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <h5 className="font-black text-sm">{review.userName}</h5>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                      <span className="text-xs text-slate-500">{review.timestamp}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{review.reviewText}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Fixed: Added missing ProfileScreen export
// Enhanced Profile Screen
export const ProfileScreen: React.FC = () => {
  const { currentUser, theme, userDevices, notificationPreferences, privacySettings } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [showEdit, setShowEdit] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const [devices, notifPrefs, privSettings] = await Promise.all([
        api.profile.getDevices(),
        api.profile.getNotificationPreferences(),
        api.profile.getPrivacySettings()
      ]);
      dispatch({ type: 'SET_USER_DEVICES', payload: devices });
      dispatch({ type: 'SET_NOTIFICATION_PREFERENCES', payload: notifPrefs });
      dispatch({ type: 'SET_PRIVACY_SETTINGS', payload: privSettings });
    } catch (e) {
      console.error('Load profile data error:', e);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingAvatar(true);
      try {
        // For now, use a placeholder URL. In production, upload to storage
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = async () => {
          const imageUrl = reader.result as string;
          await api.profile.uploadAvatar(imageUrl);
          dispatch({ type: 'UPDATE_PROFILE', payload: { avatar: imageUrl } });
          dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Avatar updated!' } });
        };
        reader.readAsDataURL(file);
      } catch (e: any) {
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingCover(true);
      try {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = async () => {
          const imageUrl = reader.result as string;
          await api.profile.uploadCoverImage(imageUrl);
          dispatch({ type: 'UPDATE_PROFILE', payload: { coverImage: imageUrl } });
          dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Cover image updated!' } });
        };
        reader.readAsDataURL(file);
      } catch (e: any) {
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
      } finally {
        setUploadingCover(false);
      }
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        // Clear all user data
        dispatch({ type: 'LOGOUT' });
        // Clear local storage
        localStorage.removeItem('pingspace_user');
        localStorage.removeItem('pingspace_token');
        // Show notification
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Logged out successfully!' } });
        // Redirect to login (if you have a login screen, otherwise just clear state)
      } catch (e: any) {
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Logout failed' } });
      }
    }
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-slate-950 overflow-y-auto no-scrollbar">
      {/* Modals */}
      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
      {showWallet && <WalletModal onClose={() => setShowWallet(false)} />}
      {showPrivacy && <PrivacySettingsModal onClose={() => setShowPrivacy(false)} />}
      {showNotifications && <NotificationSettingsModal onClose={() => setShowNotifications(false)} />}
      {showDevices && <LinkedDevicesModal onClose={() => setShowDevices(false)} />}
      {showHelp && <HelpSupportModal onClose={() => setShowHelp(false)} />}

      {/* Cover Image */}
      <div className="h-48 bg-gradient-to-br from-[#ff1744] to-orange-500 relative">
        <img
          src={currentUser?.coverImage || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800'}
          className="w-full h-full object-cover opacity-50"
          alt="Cover"
        />
        <input
          type="file"
          ref={coverInputRef}
          hidden
          accept="image/*"
          onChange={handleCoverUpload}
        />
        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="absolute bottom-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors disabled:opacity-50"
        >
          {uploadingCover ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
        </button>
      </div>

      {/* Profile Header */}
      <div className="px-6 -mt-16 mb-6">
        <div className="flex items-end gap-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-[#ff1744] to-orange-400 rounded-3xl blur opacity-75"></div>
            <img
              src={currentUser?.avatar}
              className="w-32 h-32 rounded-3xl border-4 border-white dark:border-slate-950 relative object-cover shadow-xl"
              alt={currentUser?.name}
            />
            <input
              type="file"
              ref={avatarInputRef}
              hidden
              accept="image/*"
              onChange={handleAvatarUpload}
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 p-2 bg-[#ff1744] rounded-full text-white shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
            >
              {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex-1 pb-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{currentUser?.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{currentUser?.status || 'Active'}</p>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all mb-2"
          >
            Edit Profile
          </button>
        </div>
        {currentUser?.bio && (
          <p className="mt-4 text-slate-700 dark:text-slate-300">{currentUser.bio}</p>
        )}
      </div>

      {/* Menu Sections */}
      <div className="px-6 space-y-4 pb-32">
        {/* Account Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <MenuHeader title="Account" />
          <MenuItem icon={WalletIcon} title="Wallet" subtitle="Payments & transactions" onClick={() => setShowWallet(true)} />
        </div>

        {/* Settings Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <MenuHeader title="Settings" />
          <MenuItem icon={Lock} title="Privacy" subtitle="Profile visibility & permissions" onClick={() => setShowPrivacy(true)} />
          <MenuItem icon={Bell} title="Notifications" subtitle="Alerts & preferences" onClick={() => setShowNotifications(true)} badge={notificationPreferences?.pushNotifications ? 'On' : 'Off'} />
          <MenuItem icon={Smartphone} title="Linked Devices" subtitle="Manage your devices" onClick={() => setShowDevices(true)} badge={userDevices.length.toString()} />
          <MenuItem
            icon={theme === 'dark' ? Sun : Moon}
            title="Theme"
            subtitle={theme === 'dark' ? 'Dark mode' : 'Light mode'}
            onClick={() => dispatch({ type: 'SET_THEME', payload: theme === 'dark' ? 'light' : 'dark' })}
            showToggle
            toggleValue={theme === 'dark'}
          />
        </div>

        {/* Support Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <MenuHeader title="Support" />
          <MenuItem icon={HelpCircle} title="Help & Support" subtitle="FAQs, contact us" onClick={() => setShowHelp(true)} />
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-3xl p-4 flex items-center gap-3 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5 text-red-600" />
          <span className="font-black text-red-600">Logout</span>
        </button>

        {/* App Info */}
        <div className="p-6 bg-gray-50 dark:bg-slate-900/50 rounded-3xl border border-gray-100 dark:border-slate-800 text-center">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">PingSpace v1.0.5</p>
          <p className="text-[9px] text-slate-500">Encrypted • Decentralized • Neural</p>
        </div>
      </div>
    </div>
  );
};

// Menu Components
const MenuHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</h3>
  </div>
);

const MenuItem: React.FC<{
  icon: any;
  title: string;
  subtitle: string;
  onClick?: () => void;
  badge?: string;
  showToggle?: boolean;
  toggleValue?: boolean;
}> = ({ icon: Icon, title, subtitle, onClick, badge, showToggle, toggleValue }) => (
  <button
    onClick={onClick}
    className="w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-b border-gray-100 dark:border-slate-800 last:border-0"
  >
    <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-xl">
      <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
    </div>
    <div className="flex-1 text-left">
      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h4>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
    {badge && (
      <span className="px-2 py-1 bg-[#ff1744] text-white text-xs font-bold rounded-full">{badge}</span>
    )}
    {showToggle && (
      <div className={`w-12 h-6 rounded-full transition-colors ${toggleValue ? 'bg-[#ff1744]' : 'bg-gray-300'} relative`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${toggleValue ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </div>
    )}
    {!showToggle && !badge && <ChevronRight className="w-5 h-5 text-slate-400" />}
  </button>
);

// Edit Profile Modal
const EditProfileModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    bio: currentUser?.bio || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    location: currentUser?.location || '',
    website: currentUser?.website || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.profile.updateProfile(formData);
      dispatch({ type: 'UPDATE_PROFILE', payload: formData });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Profile updated!' } });
      onClose();
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black">Edit Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
          />
          <textarea
            placeholder="Bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
            rows={3}
          />
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
          />
          <input
            type="text"
            placeholder="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
          />
          <input
            type="url"
            placeholder="Website"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:scale-105 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-[#ff1744] text-white rounded-2xl font-bold hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Wallet Modal
const WalletModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, transactions } = useGlobalState();
  const balance = currentUser?.balance || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black">Wallet</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-[#ff1744] to-orange-500 rounded-3xl p-6 mb-6 text-white">
          <p className="text-sm opacity-80 mb-2">Total Balance</p>
          <h3 className="text-4xl font-black">${balance.toFixed(2)}</h3>
        </div>

        {/* Recent Transactions */}
        <h3 className="font-black mb-3">Recent Transactions</h3>
        <div className="space-y-2">
          {transactions.slice(0, 5).map(tx => (
            <div key={tx.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl">
              <div className={`p-2 rounded-xl ${tx.type === 'credit' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4 text-green-600" /> : <ArrowUpRight className="w-4 h-4 text-red-600" />}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">{tx.description}</p>
                <p className="text-xs text-slate-500">{tx.timestamp}</p>
              </div>
              <span className={`font-black ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                {tx.type === 'credit' ? '+' : '-'}${tx.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Privacy Settings Modal
const PrivacySettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { privacySettings } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [settings, setSettings] = useState(privacySettings || {
    profileVisibility: 'public' as const,
    showOnlineStatus: true,
    showLastSeen: true,
    allowMessagesFrom: 'everyone' as const,
    showPhone: false,
    showEmail: false
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.profile.updatePrivacySettings(settings);
      dispatch({ type: 'SET_PRIVACY_SETTINGS', payload: settings });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Privacy settings updated!' } });
      onClose();
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black">Privacy Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Profile Visibility</label>
            <select
              value={settings.profileVisibility}
              onChange={(e) => setSettings({ ...settings, profileVisibility: e.target.value as any })}
              className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
            >
              <option value="public">Public</option>
              <option value="friends">Friends Only</option>
              <option value="private">Private</option>
            </select>
          </div>

          <ToggleSetting
            label="Show Online Status"
            value={settings.showOnlineStatus}
            onChange={(v) => setSettings({ ...settings, showOnlineStatus: v })}
          />
          <ToggleSetting
            label="Show Last Seen"
            value={settings.showLastSeen}
            onChange={(v) => setSettings({ ...settings, showLastSeen: v })}
          />
          <ToggleSetting
            label="Show Phone Number"
            value={settings.showPhone}
            onChange={(v) => setSettings({ ...settings, showPhone: v })}
          />
          <ToggleSetting
            label="Show Email Address"
            value={settings.showEmail}
            onChange={(v) => setSettings({ ...settings, showEmail: v })}
          />

          <div>
            <label className="block text-sm font-bold mb-2">Allow Messages From</label>
            <select
              value={settings.allowMessagesFrom}
              onChange={(e) => setSettings({ ...settings, allowMessagesFrom: e.target.value as any })}
              className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20"
            >
              <option value="everyone">Everyone</option>
              <option value="friends">Friends Only</option>
              <option value="none">No One</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:scale-105 transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-[#ff1744] text-white rounded-2xl font-bold hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Notification Settings Modal
const NotificationSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notificationPreferences } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [prefs, setPrefs] = useState(notificationPreferences || {
    messages: true,
    transactions: true,
    marketplace: true,
    spaces: true,
    emailNotifications: false,
    pushNotifications: true
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.profile.updateNotificationPreferences(prefs);
      dispatch({ type: 'SET_NOTIFICATION_PREFERENCES', payload: prefs });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Notification preferences updated!' } });
      onClose();
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black">Notifications</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <ToggleSetting label="Messages" value={prefs.messages} onChange={(v) => setPrefs({ ...prefs, messages: v })} />
          <ToggleSetting label="Transactions" value={prefs.transactions} onChange={(v) => setPrefs({ ...prefs, transactions: v })} />
          <ToggleSetting label="Marketplace" value={prefs.marketplace} onChange={(v) => setPrefs({ ...prefs, marketplace: v })} />
          <ToggleSetting label="Spaces" value={prefs.spaces} onChange={(v) => setPrefs({ ...prefs, spaces: v })} />
          <ToggleSetting label="Email Notifications" value={prefs.emailNotifications} onChange={(v) => setPrefs({ ...prefs, emailNotifications: v })} />
          <ToggleSetting label="Push Notifications" value={prefs.pushNotifications} onChange={(v) => setPrefs({ ...prefs, pushNotifications: v })} />
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:scale-105 transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-[#ff1744] text-white rounded-2xl font-bold hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Linked Devices Modal
const LinkedDevicesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { userDevices } = useGlobalState();
  const dispatch = useGlobalDispatch();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateQR = async () => {
    setLoading(true);
    try {
      const qr = await api.profile.generateDeviceQR();
      setQrCode(qr);
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    } finally {
      setLoading(false);
    }
  };

  const removeDevice = async (deviceId: string) => {
    if (!confirm('Remove this device?')) return;
    try {
      await api.profile.removeDevice(deviceId);
      dispatch({ type: 'REMOVE_USER_DEVICE', payload: deviceId });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Device removed!' } });
    } catch (e: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return PhoneIcon;
      case 'desktop': return Monitor;
      case 'web': return Laptop;
      default: return Smartphone;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black">Linked Devices</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Section */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl text-center">
          <h3 className="font-bold mb-3">Link New Device</h3>
          {qrCode ? (
            <img src={qrCode} alt="QR Code" className="w-48 h-48 mx-auto mb-3 rounded-xl" />
          ) : (
            <button
              onClick={generateQR}
              disabled={loading}
              className="px-6 py-3 bg-[#ff1744] text-white rounded-2xl font-bold hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              Generate QR Code
            </button>
          )}
        </div>

        {/* Devices List */}
        <h3 className="font-black mb-3">Your Devices ({userDevices.length})</h3>
        <div className="space-y-2">
          {userDevices.map(device => {
            const DeviceIcon = getDeviceIcon(device.deviceType);
            return (
              <div key={device.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-xl">
                  <DeviceIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{device.deviceName}</p>
                  <p className="text-xs text-slate-500">Last active: {new Date(device.lastActive).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => removeDevice(device.id)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Help & Support Modal
const HelpSupportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black">Help & Support</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        <button className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
          <h4 className="font-bold mb-1">FAQs</h4>
          <p className="text-xs text-slate-500">Frequently asked questions</p>
        </button>
        <button className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
          <h4 className="font-bold mb-1">Contact Support</h4>
          <p className="text-xs text-slate-500">Get help from our team</p>
        </button>
        <button className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
          <h4 className="font-bold mb-1">About PingSpace</h4>
          <p className="text-xs text-slate-500">Version 1.0.5</p>
        </button>
        <button className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
          <h4 className="font-bold mb-1">Terms & Privacy</h4>
          <p className="text-xs text-slate-500">Legal information</p>
        </button>
      </div>
    </div>
  </div>
);

// Toggle Setting Component
const ToggleSetting: React.FC<{ label: string; value: boolean; onChange: (value: boolean) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl">
    <span className="font-bold text-sm">{label}</span>
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-[#ff1744]' : 'bg-gray-300'} relative`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

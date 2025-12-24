
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Zap, CheckCircle, AlertCircle, AlertTriangle, Loader2, ArrowLeft, Key, RefreshCw, Sparkles, Hash, Check, Phone, Activity, Globe, Database, ShieldAlert, X, XCircle } from 'lucide-react';
import { useGlobalDispatch } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { authService } from '../services/auth';

interface AuthProps {
  onSuccess?: () => void;
  onNavigate: () => void;
  onForgotPassword?: () => void;
}

export const SplashScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-slate-950 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-red-50 dark:bg-red-900/10 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-red-50 dark:bg-red-900/10 rounded-full blur-3xl opacity-50"></div>
      <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
        <div className="w-24 h-24 bg-[#ff1744] rounded-3xl flex items-center justify-center shadow-xl shadow-red-500/30 mb-6 transform rotate-3">
          <Zap className="w-12 h-12 text-white fill-white" />
        </div>
        <h1 className="text-4xl font-bold font-[Poppins] text-slate-900 dark:text-white tracking-tight mb-2">
          Ping<span className="text-[#ff1744]">Space</span>
        </h1>
        <p className="text-gray-400 font-medium tracking-wide text-sm">Connect. Chat. Trade. Discover.</p>
      </div>
      <div className="absolute bottom-12 flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-[#ff1744]/20 border-t-[#ff1744] rounded-full animate-spin"></div>
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export const LoginScreen: React.FC<AuthProps> = ({ onNavigate, onForgotPassword }) => {
  const dispatch = useGlobalDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncStage, setSyncStage] = useState<'auth' | 'profile' | 'data' | 'ready'>('ready');
  const [resending, setResending] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagResults, setDiagResults] = useState<any>(null);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '', form: '' });

  const validate = () => {
    let isValid = true;
    const newErrors = { email: '', password: '', form: '' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
      isValid = false;
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleRunDiagnostics = async () => {
    setLoading(true);
    const results = await api.system.diagnose();
    setDiagResults(results);
    setLoading(false);
  };

  const handleResetSession = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setShowResend(false);

    try {
      setSyncStage('auth');
      const user = await api.auth.login(formData.email, formData.password);

      setSyncStage('profile');
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });

      setSyncStage('data');
      try {
        const [chats, contacts, products, spaces, transactions, stories] = await Promise.allSettled([
          api.chats.list(),
          api.contacts.list(),
          api.market.getProducts(),
          api.spaces.list(),
          api.wallet.getTransactions(),
          api.stories.list()
        ]);

        const getVal = (res: any, fallback: any) => res.status === 'fulfilled' ? res.value : fallback;

        dispatch({
          type: 'SET_DATA',
          payload: {
            chats: getVal(chats, []),
            contacts: getVal(contacts, []),
            products: getVal(products, []),
            spaces: getVal(spaces, []),
            transactions: getVal(transactions, []),
            stories: getVal(stories, [])
          }
        });

        const token = await authService.getToken();
        if (token) socketService.connect(token);
      } catch (dataErr) {
        console.warn("Data sync failed:", dataErr);
      }

      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: `Welcome back, ${user.name}` } });
    } catch (error: any) {
      const isConfirmationPending = error.message.toLowerCase().includes('confirmation pending') || error.message.toLowerCase().includes('not confirmed') || error.message.toLowerCase().includes('verification');
      if (isConfirmationPending) setShowResend(true);

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { type: 'error', message: error.message || 'Login failed.' }
      });
    } finally {
      setLoading(false);
      setSyncStage('ready');
    }
  };

  const handleResendConfirmation = async () => {
    if (!formData.email) return;
    setResending(true);
    try {
      await api.auth.resendConfirmationEmail(formData.email);
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Verification email resent.' } });
      setShowResend(false);
    } catch (error: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: error.message || 'Failed to resend email.' } });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 p-6 flex flex-col justify-center relative transition-colors overflow-y-auto no-scrollbar">
      {showDiagnostics && (
        <div className="fixed inset-0 z-50 bg-white/95 dark:bg-slate-950/95 p-6 flex flex-col overflow-y-auto animate-in slide-in-from-bottom-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black uppercase tracking-tighter text-[#ff1744]">Diagnostics</h2>
            <button onClick={() => setShowDiagnostics(false)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
          </div>
          <div className="space-y-6">
            <div className="p-6 bg-gray-50 dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Connection Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Server Connection</span>
                  {diagResults ? (diagResults.connection ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />) : <Loader2 className="w-4 h-4 animate-spin text-slate-300" />}
                </div>
              </div>
            </div>
            <button
              onClick={handleRunDiagnostics}
              className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4" /> Run Diagnostic
            </button>
            <button
              onClick={handleResetSession}
              className="w-full py-4 border-2 border-slate-200 dark:border-slate-800 text-slate-500 font-bold rounded-2xl flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Clear Cache & Reset
            </button>
          </div>
        </div>
      )}

      <div className="mb-10 animate-in slide-in-from-bottom-4 duration-500">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4 text-[#ff1744]">
          <Zap className="w-6 h-6 fill-[#ff1744]" />
        </div>
        <h1 className="text-3xl font-bold font-[Poppins] text-slate-900 dark:text-white mb-2">Login</h1>
        <p className="text-gray-500 dark:text-slate-400">Sign in to your account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5 animate-in slide-in-from-bottom-8 duration-700" noValidate>
        {errors.form && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2 animate-shake"><AlertTriangle className="w-4 h-4" /> {errors.form}</div>}

        {showResend && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl animate-in zoom-in-95">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Email not verified.
            </p>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending}
              className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 hover:bg-amber-600 transition-all disabled:opacity-50"
            >
              {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Resend Verification Email
            </button>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
          <div className="relative">
            <Mail className={`absolute left-4 top-3.5 w-5 h-5 ${errors.email ? 'text-[#ff1744]' : 'text-gray-400'}`} />
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              placeholder="name@email.com"
              className={`w-full bg-gray-50 dark:bg-slate-900 border rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 transition-all ${errors.email
                  ? 'border-[#ff1744] focus:ring-[#ff1744]/20'
                  : 'border-gray-100 dark:border-slate-800 focus:ring-[#ff1744]/20 focus:border-[#ff1744]'
                }`}
            />
          </div>
          {errors.email && <p className="text-xs font-bold text-[#ff1744] flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" /> {errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
            <button type="button" onClick={onForgotPassword} className="text-xs font-bold text-[#ff1744] hover:underline">Forgot?</button>
          </div>
          <div className="relative">
            <Lock className={`absolute left-4 top-3.5 w-5 h-5 ${errors.password ? 'text-[#ff1744]' : 'text-gray-400'}`} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              placeholder="Password"
              className={`w-full bg-gray-50 dark:bg-slate-900 border rounded-2xl py-3.5 pl-12 pr-12 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 transition-all ${errors.password
                  ? 'border-[#ff1744] focus:ring-[#ff1744]/20'
                  : 'border-gray-100 dark:border-slate-800 focus:ring-[#ff1744]/20 focus:border-[#ff1744]'
                }`}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-gray-400 hover:text-slate-600 dark:hover:text-slate-300">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-xs font-bold text-[#ff1744] flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" /> {errors.password}</p>}
        </div>

        <button type="submit" disabled={loading} className="w-full py-4 bg-[#ff1744] text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 hover:bg-red-600 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest">
                {syncStage === 'auth' && 'Signing in...'}
                {syncStage === 'profile' && 'Loading profile...'}
                {syncStage === 'data' && 'Syncing data...'}
              </span>
            </div>
          ) : <>Sign In <ArrowRight className="w-5 h-5" /></>}
        </button>
      </form>

      <div className="mt-8 text-center animate-in slide-in-from-bottom-10 duration-1000">
        <p className="text-gray-400 text-sm mb-6 font-medium">Or log in with</p>
        <div className="flex justify-center gap-4 mb-8">
          {['Google', 'Apple', 'Facebook'].map((social) => (
            <button key={social} className="w-14 h-14 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
              <img src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${social.toLowerCase()}/${social.toLowerCase()}-original.svg`} className="w-6 h-6" alt={social} />
            </button>
          ))}
        </div>
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400 font-medium">Don't have an account? <button onClick={onNavigate} className="text-[#ff1744] font-bold hover:underline">Sign Up</button></p>
          <button onClick={() => setShowDiagnostics(true)} className="text-[10px] font-black uppercase text-slate-400 hover:text-[#ff1744] tracking-widest flex items-center justify-center gap-2 mx-auto">
            <Activity className="w-3 h-3" /> System Status
          </button>
        </div>
      </div>
    </div>
  );
};

export const SignupScreen: React.FC<AuthProps> = ({ onNavigate }) => {
  const dispatch = useGlobalDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [formData, setFormData] = useState({ name: '', username: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({ name: '', username: '', email: '', phone: '', password: '' });

  const verifiedHandles = useRef<Set<string>>(new Set());
  const isGenerating = useRef<boolean>(false);

  const generateHandle = async (fullName: string) => {
    if (!fullName.trim() || isGenerating.current) return;
    isGenerating.current = true;
    setUsernameStatus('checking');
    const base = fullName.trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
    let found = false;
    let attempts = 0;
    let candidate = base;
    while (!found && attempts < 15) {
      if (attempts > 0) {
        const suffix = attempts < 5 ? Math.floor(10 + Math.random() * 89) : Math.random().toString(36).substring(2, 5);
        candidate = `${base}${suffix}`;
      }
      const available = await api.auth.checkUsernameAvailability(candidate);
      if (available) {
        verifiedHandles.current.add(candidate);
        setFormData(prev => ({ ...prev, username: candidate }));
        setUsernameStatus('available');
        found = true;
      }
      attempts++;
    }
    isGenerating.current = false;
  };

  useEffect(() => {
    if (isGenerating.current || verifiedHandles.current.has(formData.username)) {
      if (formData.username.length >= 3) setUsernameStatus('available');
      return;
    }
    if (formData.username.length < 3) { setUsernameStatus('idle'); return; }
    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const isAvailable = await api.auth.checkUsernameAvailability(formData.username);
        if (isAvailable) { verifiedHandles.current.add(formData.username); setUsernameStatus('available'); }
        else { setUsernameStatus('taken'); }
      } catch (err) { setUsernameStatus('idle'); }
    }, 600);
    return () => clearTimeout(timer);
  }, [formData.username]);

  const validate = () => {
    let isValid = true;
    const newErrors = { name: '', username: '', email: '', phone: '', password: '' };
    if (!formData.name.trim()) { newErrors.name = 'Name is required'; isValid = false; }
    if (!formData.username.trim()) { newErrors.username = 'Username is required'; isValid = false; }
    else if (usernameStatus === 'taken') { newErrors.username = 'Username is taken'; isValid = false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) { newErrors.email = 'Email is required'; isValid = false; }
    else if (!emailRegex.test(formData.email)) { newErrors.email = 'Enter a valid email'; isValid = false; }
    if (!formData.phone.trim()) { newErrors.phone = 'Phone number is required'; isValid = false; }
    if (!formData.password) { newErrors.password = 'Password is required'; isValid = false; }
    else if (formData.password.length < 6) { newErrors.password = 'Min 6 characters'; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await api.auth.signup(formData);

      if (result.needsVerification) {
        setVerificationSent(true);
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'info', message: 'Verification email sent. Please check your inbox.' } });
      } else {
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Welcome to PingSpace!' } });
        dispatch({ type: 'LOGIN_SUCCESS', payload: result });
      }
    } catch (error: any) {
      console.error("Signup Screen Error:", error);
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: error.message || 'Signup failed.' } });
    } finally { setLoading(false); }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 p-6 flex flex-col justify-center items-center text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-[2.5rem] flex items-center justify-center mb-8 text-[#ff1744] shadow-xl shadow-red-500/10 border-2 border-[#ff1744]/20 animate-bounce">
          <Mail className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Check Your Inbox</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-10 leading-relaxed font-medium">
          We've sent a verification link to <span className="text-[#ff1744] font-black">{formData.email}</span>. Please click the link to activate your account.
        </p>
        <div className="space-y-4 w-full max-w-xs">
          <button
            onClick={onNavigate}
            className="w-full py-4 bg-[#ff1744] text-white font-black rounded-2xl shadow-xl shadow-red-500/30 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            Go to Login <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => api.auth.resendConfirmationEmail(formData.email)}
            className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-[#ff1744] transition-colors"
          >
            Didn't get the email? Resend
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 p-6 flex flex-col justify-center relative transition-colors overflow-y-auto no-scrollbar">
      <div className="mb-8 animate-in slide-in-from-bottom-4 duration-500">
        <button onClick={onNavigate} className="mb-6 p-2 -ml-2 text-gray-400 hover:text-slate-600 dark:hover:text-slate-300">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold font-[Poppins] text-slate-900 dark:text-white mb-2">Sign Up</h1>
        <p className="text-gray-500 dark:text-slate-400">Create your new account</p>
      </div>
      <form onSubmit={handleSignup} className="space-y-4 animate-in slide-in-from-bottom-8 duration-700" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
          <div className="relative">
            <User className={`absolute left-4 top-3.5 w-5 h-5 ${errors.name ? 'text-[#ff1744]' : 'text-gray-400'}`} />
            <input id="name" type="text" value={formData.name} onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (errors.name) setErrors({ ...errors, name: '' }); }} onBlur={() => !formData.username && generateHandle(formData.name)} placeholder="Your Name" className={`w-full bg-gray-50 dark:bg-slate-900 border rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white font-medium transition-all focus:outline-none focus:ring-2 ${errors.name ? 'border-[#ff1744] focus:ring-[#ff1744]/20' : 'border-gray-100 dark:border-slate-800 focus:ring-[#ff1744]/20'}`} />
          </div>
          {errors.name && <p className="text-[10px] font-black uppercase text-[#ff1744] flex items-center gap-1 mt-1 ml-1 tracking-widest"><AlertCircle className="w-3 h-3" /> {errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <label htmlFor="username" className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Username</label>
            <button type="button" onClick={() => generateHandle(formData.name || 'user')} className={`flex items-center gap-1.5 text-[9px] font-black uppercase transition-all py-1 px-2 rounded-lg ${usernameStatus === 'taken' ? 'bg-[#ff1744] text-white animate-pulse' : 'text-[#ff1744] hover:bg-red-50'}`}><Sparkles className="w-3 h-3" /> Auto-Suggest</button>
          </div>
          <div className="relative">
            <Hash className={`absolute left-4 top-3.5 w-5 h-5 ${errors.username || usernameStatus === 'taken' ? 'text-[#ff1744]' : (usernameStatus === 'available' ? 'text-emerald-500' : 'text-gray-400')}`} />
            <input id="username" type="text" value={formData.username} onChange={(e) => { const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); setFormData({ ...formData, username: val }); if (errors.username) setErrors({ ...errors, username: '' }); }} placeholder="username" className={`w-full bg-gray-50 dark:bg-slate-900 border rounded-2xl py-3.5 pl-12 pr-12 text-slate-900 dark:text-white font-medium transition-all focus:outline-none focus:ring-2 ${errors.username || usernameStatus === 'taken' ? 'border-[#ff1744] focus:ring-[#ff1744]/20' : (usernameStatus === 'available' ? 'border-emerald-500 focus:ring-emerald-500/20' : 'border-gray-100 dark:border-slate-800 focus:ring-[#ff1744]/20')}`} />
            <div className="absolute right-4 top-3.5 flex items-center gap-2">
              {usernameStatus === 'checking' && <Loader2 className="w-5 h-5 text-[#ff1744] animate-spin" />}
              {usernameStatus === 'available' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
              {usernameStatus === 'taken' && <AlertCircle className="w-5 h-5 text-[#ff1744]" />}
            </div>
          </div>
          {errors.username && <p className="text-[10px] font-black uppercase text-[#ff1744] flex items-center gap-1 mt-1 ml-1 tracking-widest"><AlertCircle className="w-3 h-3" /> {errors.username}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email-signup" className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email</label>
          <div className="relative">
            <Mail className={`absolute left-4 top-3.5 w-5 h-5 ${errors.email ? 'text-[#ff1744]' : 'text-gray-400'}`} />
            <input id="email-signup" type="email" value={formData.email} onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (errors.email) setErrors({ ...errors, email: '' }); }} placeholder="Email Address" className={`w-full bg-gray-50 dark:bg-slate-900 border rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white font-medium transition-all focus:outline-none focus:ring-2 ${errors.email ? 'border-[#ff1744] focus:ring-[#ff1744]/20' : 'border-gray-100 dark:border-slate-800 focus:ring-[#ff1744]/20'}`} />
          </div>
          {errors.email && <p className="text-[10px] font-black uppercase text-[#ff1744] flex items-center gap-1 mt-1 ml-1 tracking-widest"><AlertCircle className="w-3 h-3" /> {errors.email}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Phone</label>
          <div className="relative">
            <Phone className={`absolute left-4 top-3.5 w-5 h-5 ${errors.phone ? 'text-[#ff1744]' : 'text-gray-400'}`} />
            <input id="phone" type="tel" value={formData.phone} onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); if (errors.phone) setErrors({ ...errors, phone: '' }); }} placeholder="Phone Number" className={`w-full bg-gray-50 dark:bg-slate-900 border rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white font-medium transition-all focus:outline-none focus:ring-2 ${errors.phone ? 'border-[#ff1744] focus:ring-[#ff1744]/20' : 'border-gray-100 dark:border-slate-800 focus:ring-[#ff1744]/20'}`} />
          </div>
          {errors.phone && <p className="text-[10px] font-black uppercase text-[#ff1744] flex items-center gap-1 mt-1 ml-1 tracking-widest"><AlertCircle className="w-3 h-3" /> {errors.phone}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password-signup" className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
          <div className="relative">
            <Lock className={`absolute left-4 top-3.5 w-5 h-5 ${errors.password ? 'text-[#ff1744]' : 'text-gray-400'}`} />
            <input id="password-signup" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => { setFormData({ ...formData, password: e.target.value }); if (errors.password) setErrors({ ...errors, password: '' }); }} placeholder="Min 6 characters" className={`w-full bg-gray-50 dark:bg-slate-900 border rounded-2xl py-3.5 pl-12 pr-12 text-slate-900 dark:text-white font-medium transition-all focus:outline-none focus:ring-2 ${errors.password ? 'border-[#ff1744] focus:ring-[#ff1744]/20' : 'border-gray-100 dark:border-slate-800 focus:ring-[#ff1744]/20'}`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-gray-400 hover:text-[#ff1744] transition-colors">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
          </div>
          {errors.password && <p className="text-[10px] font-black uppercase text-[#ff1744] flex items-center gap-1 mt-1 ml-1 tracking-widest"><AlertCircle className="w-3 h-3" /> {errors.password}</p>}
        </div>
        <button type="submit" disabled={loading || usernameStatus === 'checking' || usernameStatus === 'taken'} className="w-full mt-4 py-4 bg-[#ff1744] text-white font-bold rounded-2xl shadow-xl shadow-red-500/30 hover:bg-red-600 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale uppercase tracking-widest text-xs">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Join Now <ArrowRight className="w-5 h-5" /></>}
        </button>
      </form>
      <div className="mt-8 text-center">
        <p className="text-slate-600 dark:text-slate-400 font-bold text-sm">Already have an account? <button onClick={onNavigate} className="text-[#ff1744] font-black hover:underline uppercase text-xs tracking-wider">Log In</button></p>
      </div>
    </div>
  );
};

export const ForgotPasswordScreen: React.FC<AuthProps> = ({ onNavigate }) => {
  const dispatch = useGlobalDispatch();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.auth.resetPassword(email);
      setSent(true);
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Reset email sent!' } });
    } catch (error: any) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Failed to send reset email.' } });
    } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 p-6 flex flex-col justify-center relative transition-colors">
      <div className="mb-8 animate-in slide-in-from-bottom-4 duration-500">
        <button onClick={onNavigate} className="mb-6 p-2 -ml-2 text-gray-400 hover:text-slate-600 dark:hover:text-slate-300"><ArrowLeft className="w-6 h-6" /></button>
        <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4 text-[#ff1744]"><Key className="w-6 h-6" /></div>
        <h1 className="text-3xl font-bold font-[Poppins] text-slate-900 dark:text-white mb-2">Forgot Password</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm">Enter your email to reset your password.</p>
      </div>
      {sent ? (
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-900/20 p-8 rounded-[2.5rem] text-center animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-emerald-500/30"><CheckCircle className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Email Sent</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-8 font-medium">Instructions sent to <span className="font-bold text-slate-700 dark:text-slate-200">{email}</span></p>
          <button onClick={onNavigate} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl uppercase tracking-widest text-xs">Return to Login</button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
          <div className="space-y-1.5">
            <label htmlFor="reset-email" className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20" required />
            </div>
          </div>
          <button type="submit" disabled={loading || !email} className="w-full py-4 bg-[#ff1744] text-white font-black rounded-2xl shadow-xl shadow-red-500/30 hover:bg-red-600 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 uppercase tracking-widest text-xs">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Reset Link <ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>
      )}
      {!sent && (
        <div className="mt-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 font-bold text-sm">Remember your password? <button onClick={onNavigate} className="text-[#ff1744] font-black hover:underline uppercase text-xs tracking-wider">Log In</button></p>
        </div>
      )}
    </div>
  );
};

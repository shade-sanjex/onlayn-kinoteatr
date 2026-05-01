import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Loader2, Play, KeyRound, AtSign } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Emailingiz hali tasdiqlanmagan. Iltimos pochtangizga kirib, tasdiqlash havolasini bosing.');
          }
          throw new Error('Email yoki parol noto\'g\'ri');
        }
        navigate('/dashboard');
      } else {
        const nickToUse = displayName.trim() || email.split('@')[0];
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              display_name: nickToUse
            }
          }
        });
        if (error) throw error;
        
        if (data.session === null) {
          // Email confirmation required
          setSuccessMsg('Muvaffaqiyatli! Email pochtangizga tasdiqlash xati yuborildi. Iltimos pochta qutingizni tekshiring va havolani bosing.');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      if (err.message.includes('rate_limit') || err.message.includes('rate limit')) {
        setError('Ko\'p urinishlar tufayli vaqtincha cheklov qo\'yildi. Birozdan so\'ng qayta urinib ko\'ring.');
      } else {
        setError(err.message || 'Xatolik yuz berdi');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Parolni tiklash uchun avval Email pochtangizni kiriting');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/dashboard',
      });
      if (error) throw error;
      setSuccessMsg('Parolni tiklash havolasi emailingizga yuborildi. Iltimos pochta qutingizni tekshiring.');
    } catch (err: any) {
      setError(err.message || 'Parolni tiklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4 p-6 sm:p-10 bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl rounded-3xl animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30">
            <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Yorqin Tomosha</h1>
          <p className="mt-2 text-zinc-400 text-sm">Birgalikda kino tomosha qilamiz</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
            {successMsg}
          </div>
        )}

        <div className="flex bg-white/5 p-1 rounded-xl mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isLogin ? 'bg-white/10 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
          >
            Kirish
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isLogin ? 'bg-white/10 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
          >
            Ro'yxatdan o'tish
          </button>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {/* Nickname — only shown during registration */}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 pl-1">Nik (Taxallus)</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="Ismingiz yoki taxallusiz..."
                  maxLength={30}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 pl-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="nom@gmail.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 pl-1">Parol</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Kirish' : "Ro'yxatdan o'tish")}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-xs text-zinc-500 font-medium uppercase">Yoki</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        <button
          type="button"
          onClick={handleResetPassword}
          className="w-full mt-6 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-semibold rounded-xl transition-all flex items-center justify-center space-x-2"
        >
          <KeyRound className="w-4 h-4" />
          <span>Parolni yangilash</span>
        </button>
      </div>
    </div>
  );
}

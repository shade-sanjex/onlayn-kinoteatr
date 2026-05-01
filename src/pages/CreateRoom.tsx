import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Loader2, ArrowLeft, Users } from 'lucide-react';

export default function CreateRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert([
          {
            name: name || 'Yangi Xona',
            host_id: user.id,
            host_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Foydalanuvchi',
            is_private: isPrivate,
            is_active: true,
            video_url: '' // Bo'sh qoldiramiz, xona ichida qo'shiladi
          }
        ])
        .select()
        .single();

      if (error) throw error;
      navigate(`/room/${data.id}`);
    } catch (error: any) {
      console.error('Error creating room:', error.message);
      alert('Xona yaratishda xatolik yuz berdi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-purple-500/30">
      <div className="container mx-auto px-4 py-12 max-w-xl">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Orqaga
        </button>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-center w-16 h-16 bg-purple-500/20 text-purple-400 rounded-2xl mb-6 mx-auto">
            <Users className="w-8 h-8" />
          </div>
          
          <h1 className="text-3xl font-bold text-center mb-2">Yangi Xona Yaratish</h1>
          <p className="text-zinc-400 text-center mb-8">Do'stlaringizni taklif qiling va birgalikda kino tomosha qiling. Videoni xona ichida qo'shishingiz mumkin.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Xona nomi</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masalan: Kino kechasi"
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-3 py-4 p-4 bg-black/20 rounded-xl border border-white/5">
              <input
                type="checkbox"
                id="isPrivate"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-black/20 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-zinc-950 cursor-pointer"
              />
              <div className="flex flex-col">
                <label htmlFor="isPrivate" className="text-sm font-medium text-zinc-200 cursor-pointer">
                  Maxfiy xona
                </label>
                <span className="text-xs text-zinc-500">Faqatgina to'g'ridan-to'g'ri havola (silka) orqali kirish mumkin. Bosh sahifada ko'rinmaydi.</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Yaratilmoqda...</>
              ) : (
                'Xonani Yaratish va Kirish'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

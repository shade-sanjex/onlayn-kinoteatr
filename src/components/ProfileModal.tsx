import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Image as ImageIcon, X, Loader2, CheckCircle2 } from 'lucide-react';

interface ProfileModalProps {
  profile: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function ProfileModal({ profile, onClose, onUpdate }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      setSuccess(true);
      onUpdate();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-all z-10 text-zinc-500 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-purple-600 rounded-[24px] flex items-center justify-center shadow-lg shadow-purple-500/20">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Profil Sozlamalari</h2>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Shaxsiy ma'lumotlarni tahrirlash</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Nik (Taxallus)</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all text-sm pl-12"
                  placeholder="Ismingizni kiriting..."
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-500 transition-colors" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Rasm Havolasi (Avatar)</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all text-sm pl-12"
                  placeholder="https://.../image.jpg"
                />
                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-500 transition-colors" />
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleUpdate}
                disabled={loading || success}
                className={`w-full py-4 rounded-[20px] font-black text-sm transition-all flex items-center justify-center gap-2 ${success ? 'bg-green-500 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : success ? <CheckCircle2 className="w-5 h-5" /> : 'O\'zgarishlarni saqlash'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User, ImageIcon, X, Loader2, CheckCircle2, Upload, Link } from 'lucide-react';

interface ProfileModalProps {
  profile: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function ProfileModal({ profile, onClose, onUpdate }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [avatarMode, setAvatarMode] = useState<'url' | 'upload'>('url');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert("Rasm 5MB dan kichik bo'lishi kerak"); return; }
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const uploadAvatar = async (): Promise<string> => {
    if (!avatarFile) return avatarUrl;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Login talab qilinadi');
      const ext = avatarFile.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      return `${publicUrl}?t=${Date.now()}`;
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      let finalUrl = avatarUrl;
      if (avatarMode === 'upload' && avatarFile) {
        finalUrl = await uploadAvatar();
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: finalUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      setSuccess(true);
      onUpdate();
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isWorking = loading || uploading;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-all z-10 text-zinc-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 sm:p-10">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            {/* Avatar preview */}
            <div className="relative shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-16 h-16 rounded-[24px] object-cover ring-2 ring-purple-500/30" />
              ) : (
                <div className="w-16 h-16 bg-purple-600 rounded-[24px] flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Profil Sozlamalari</h2>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Shaxsiy ma'lumotlarni tahrirlash</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Display name */}
            <div className="space-y-2">
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

            {/* Avatar section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pl-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Avatar</label>
                {/* Mode toggle */}
                <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                  <button
                    onClick={() => setAvatarMode('url')}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${avatarMode === 'url' ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                  >
                    <Link className="w-3 h-3" /> URL
                  </button>
                  <button
                    onClick={() => setAvatarMode('upload')}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${avatarMode === 'upload' ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                  >
                    <Upload className="w-3 h-3" /> Fayl
                  </button>
                </div>
              </div>

              {avatarMode === 'url' ? (
                <div className="relative group">
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => { setAvatarUrl(e.target.value); setAvatarPreview(e.target.value || null); }}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all text-sm pl-12"
                    placeholder="https://.../image.jpg"
                  />
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-500 transition-colors" />
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-3 py-8 bg-white/[0.02] border-2 border-dashed border-white/10 rounded-2xl hover:border-purple-500/40 hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-zinc-300">
                        {avatarFile ? avatarFile.name : 'Rasm tanlang'}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-0.5 uppercase font-black tracking-widest">
                        JPG, PNG, WebP — Max 5MB
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={handleUpdate}
                disabled={isWorking || success}
                className={`w-full py-4 rounded-[20px] font-black text-sm transition-all flex items-center justify-center gap-2 ${success ? 'bg-green-500 text-white' : 'bg-white text-black hover:bg-zinc-200 disabled:opacity-50'}`}
              >
                {isWorking
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> {uploading ? 'Yuklanmoqda...' : 'Saqlanmoqda...'}</>
                  : success
                    ? <><CheckCircle2 className="w-5 h-5" /> Saqlandi!</>
                    : "O'zgarishlarni saqlash"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Upload, Link as LinkIcon, Loader2, Play, Trash2, CheckCircle2 } from 'lucide-react';

interface VideoManagerProps {
  roomId: string;
  isHost: boolean;
  isAdmin: boolean;
  currentVideoUrl: string;
}

export function VideoManager({ roomId, isHost, isAdmin, currentVideoUrl }: VideoManagerProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'url' | 'upload'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [customUrl, setCustomUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !YOUTUBE_API_KEY) return;
    
    setLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(searchQuery)}&type=video&key=${YOUTUBE_API_KEY}`);
      const data = await res.json();
      if (data.items) {
        setSearchResults(data.items);
      }
    } catch (err) {
      console.error('YouTube search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateRoomVideo = async (url: string | null) => {
    if (!url && !currentVideoUrl) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ video_url: url, updated_at: new Date().toISOString() })
        .eq('id', roomId);
        
      if (error) throw error;
      
      setSuccessMsg(url ? 'Video qo\'yildi!' : 'Video o\'chirildi!');
      setTimeout(() => setSuccessMsg(null), 3000);
      
      setCustomUrl('');
      setFile(null);
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Avtorizatsiyadan o\'ting');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userData.user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      await updateRoomVideo(publicUrl);
    } catch (err: any) {
      alert('Yuklashda xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isHost && !isAdmin) return null;

  return (
    <div className="w-full bg-[#111] border border-white/5 rounded-[32px] overflow-hidden flex flex-col h-full shadow-2xl">
      <div className="flex border-b border-white/5 bg-black/20 p-1.5">
        {[
          { id: 'search', icon: Search, label: 'YouTube' },
          { id: 'url', icon: LinkIcon, label: 'Havola' },
          { id: 'upload', icon: Upload, label: 'Yuklash' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-2xl ${activeTab === tab.id ? 'bg-white/10 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar relative">
        {successMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-2 rounded-full flex items-center gap-2 text-xs font-black shadow-lg animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="relative group">
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="YouTube'dan kino qidirish..."
                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-6 pr-14 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all text-sm"
              />
              <button type="submit" className="absolute right-2 top-2 bottom-2 bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-xl transition-all">
                <Search className="w-4 h-4" />
              </button>
            </form>

            <div className="grid grid-cols-1 gap-3">
              {searchResults.map(video => (
                <div 
                  key={video.id.videoId} 
                  className="flex gap-4 bg-white/[0.02] p-3 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all group"
                >
                  <img src={video.snippet.thumbnails.medium.url} alt="thumb" className="w-32 h-20 object-cover rounded-xl shadow-lg" />
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-200 line-clamp-1 mb-1">{video.snippet.title}</h4>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{video.snippet.channelTitle}</span>
                    </div>
                    <button 
                      onClick={() => updateRoomVideo(`https://www.youtube.com/watch?v=${video.id.videoId}`)}
                      disabled={loading}
                      className="bg-white/5 hover:bg-purple-600 hover:text-white text-zinc-400 py-1.5 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 w-fit"
                    >
                      <Play className="w-3 h-3" fill="currentColor" /> Tanlash
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'url' && (
          <div className="space-y-6 pt-4">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-1">Video Havolasi</label>
              <input 
                type="url" 
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="https://.../video.mp4"
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all text-sm"
              />
            </div>
            <button 
              onClick={() => updateRoomVideo(customUrl)}
              disabled={!customUrl || loading}
              className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm transition-all hover:bg-zinc-200"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Videoni qo\'yish'}
            </button>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-6 pt-2">
             <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-white/5 border-dashed rounded-3xl cursor-pointer bg-black/20 hover:bg-white/[0.03] transition-all group">
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-sm font-bold text-zinc-300">Faylni tanlang</p>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase font-black tracking-widest">MP4, WebM (Max 500MB)</p>
              </div>
              <input type="file" className="hidden" accept="video/mp4,video/webm" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            {file && (
              <div className="bg-purple-500/10 p-3 rounded-2xl flex items-center justify-between border border-purple-500/20">
                <span className="text-xs font-bold text-purple-400 truncate pr-4">{file.name}</span>
                <button onClick={() => setFile(null)} className="text-zinc-500 hover:text-white"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
            <button 
              onClick={handleFileUpload}
              disabled={!file || loading}
              className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm transition-all hover:bg-zinc-200"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yuklash va Qo\'yish'}
            </button>
          </div>
        )}
      </div>
      
      {currentVideoUrl && (
        <div className="p-4 bg-red-500/5 border-t border-white/5">
          <button 
            onClick={() => updateRoomVideo(null)}
            className="w-full py-3 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Videoni butunlay o'chirish
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Check, 
  X, 
  User as UserIcon, 
  Clock
} from 'lucide-react';

export default function Friends() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [_loading, setLoading] = useState(false);


  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchRequests();
    }
  }, [user]);

  const fetchFriends = async () => {
    const { data } = await supabase
      .from('friends')
      .select('*, friend:friend_id(display_name, email), user:user_id(display_name, email)')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`);
    
    if (data) setFriends(data);
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('friends')
      .select('*, user:user_id(display_name, email)')
      .eq('friend_id', user?.id)
      .eq('status', 'pending');
    
    if (data) setRequests(data);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('display_name', `%${searchQuery}%`)
        .neq('id', user?.id)
        .limit(10);
      
      if (data) setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .insert([{ user_id: user?.id, friend_id: friendId, status: 'pending' }]);
      if (error) throw error;
      alert("So'rov yuborildi!");
      setSearchResults(prev => prev.filter(u => u.id !== friendId));
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleRequest = async (requestId: string, accept: boolean) => {
    try {
      if (accept) {
        await supabase.from('friends').update({ status: 'accepted' }).eq('id', requestId);
      } else {
        await supabase.from('friends').delete().eq('id', requestId);
      }
      fetchFriends();
      fetchRequests();
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 sm:mb-8 transition-colors font-bold uppercase tracking-widest text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </button>

        <h1 className="text-3xl sm:text-4xl font-black mb-8 sm:mb-12 tracking-tighter">Do'stlar</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
          {/* Left Column: Search & Incoming */}
          <div className="space-y-8 sm:space-y-12">
            <section>
              <h2 className="text-lg sm:text-xl font-black mb-5 sm:mb-6 flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-500" /> Qidirish
              </h2>
              <form onSubmit={handleSearch} className="relative mb-5 sm:mb-6">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Ism bo'yicha qidirish..."
                  className="w-full bg-[#111] border border-white/5 rounded-2xl py-3.5 sm:py-4 px-5 sm:px-6 pr-14 text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 bottom-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>
              <div className="space-y-3">
                {searchResults.map(u => (
                  <div key={u.id} className="bg-[#111] p-3.5 sm:p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 shrink-0">
                        {u.display_name?.[0].toUpperCase()}
                      </div>
                      <span className="font-bold truncate">{u.display_name}</span>
                    </div>
                    <button 
                      onClick={() => sendRequest(u.id)}
                      className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-black mb-5 sm:mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" /> So'rovlar
              </h2>
              <div className="space-y-3">
                {requests.map(r => (
                  <div key={r.id} className="bg-yellow-500/5 p-3.5 sm:p-4 rounded-2xl border border-yellow-500/10 flex items-center justify-between gap-3">
                    <span className="font-bold truncate">{r.user?.display_name}</span>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleRequest(r.id, true)} className="p-2.5 bg-green-500 hover:bg-green-400 text-black rounded-xl transition-all">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleRequest(r.id, false)} className="p-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && <p className="text-zinc-600 text-sm italic">Yangi so'rovlar yo'q</p>}
              </div>
            </section>
          </div>

          {/* Right Column: Friends List */}
          <section>
            <h2 className="text-lg sm:text-xl font-black mb-5 sm:mb-6 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-blue-500" /> Do'stlarim
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {friends.map(f => {
                const friend = f.user_id === user?.id ? f.friend : f.user;
                return (
                  <div key={f.id} className="bg-[#111] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/5 flex items-center gap-3 sm:gap-4 hover:border-blue-500/30 transition-all">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-base sm:text-lg font-black text-white shrink-0">
                      {friend?.display_name?.[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black truncate">{friend?.display_name}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">{friend?.email}</p>
                    </div>
                  </div>
                );
              })}
              {friends.length === 0 && <p className="text-zinc-600 text-sm italic">Hali do'stlaringiz yo'q</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

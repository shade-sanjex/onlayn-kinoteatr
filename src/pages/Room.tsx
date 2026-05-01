import { useEffect, useState, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import { generateLiveKitToken, LIVEKIT_URL } from '@/lib/livekit';
import { SyncPlayer } from '@/components/SyncPlayer';
import { VideoChatSidebar } from '@/components/VideoChatSidebar';
import { VideoManager } from '@/components/VideoManager';
import { 
  Loader2, ArrowLeft, Settings2, Trash2, ShieldAlert, Lock, 
  UserPlus, AlertCircle, ChevronDown, Users, X, Check, Send,
  MessageSquare
} from 'lucide-react';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-500/10 border border-red-500/20 rounded-3xl text-center m-4">
          <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
          <h3 className="text-lg font-black text-white mb-1">Xatolik</h3>
          <p className="text-zinc-500 text-xs mb-4">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} className="bg-white text-black px-6 py-2 rounded-xl font-bold text-xs">Yangilash</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [token, setToken] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(false); // Mobile sidebar toggle
  
  const [authorized, setAuthorized] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');

  const checkAuth = useCallback(async (room: any, profile: any) => {
    if (!user) return;
    const isHost = user.id === room.host_id;
    const isAdmin = profile?.role === 'admin';
    
    if (isHost || isAdmin || !room.is_private) {
      setAuthorized(true);
      return;
    }

    const { data: friendData } = await supabase
      .from('friends')
      .select('*')
      .eq('status', 'accepted')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${room.host_id}),and(user_id.eq.${room.host_id},friend_id.eq.${user.id})`);
    
    if (friendData && friendData.length > 0) {
      setAuthorized(true);
      return;
    }

    const { data: req } = await supabase
      .from('room_join_requests')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (req) {
      if (req.status === 'approved') setAuthorized(true);
      else setRequestStatus(req.status as any);
    }
  }, [user, roomId]);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('friends')
      .select('*, friend:friend_id(id, display_name, email), person:user_id(id, display_name, email)')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    if (data) setFriends(data);
  }, [user]);

  const fetchJoinRequests = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('room_join_requests')
      .select('*, profile:user_id(display_name, email)')
      .eq('room_id', roomId)
      .eq('status', 'pending');
    if (data) setJoinRequests(data);
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !user) return;

    const init = async () => {
      try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(profile);

        const { data: room, error: dbError } = await supabase.from('rooms').select('*').eq('id', roomId).single();
        if (dbError || !room) throw new Error('Xona topilmadi');
        setRoomData(room);

        await checkAuth(room, profile);
        await fetchFriends();
        await fetchJoinRequests();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();

    const channel = supabase.channel(`room_events_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, payload => {
        if (payload.eventType === 'DELETE') {
          alert('Xona egasi tomonidan yopildi');
          navigate('/dashboard');
        } else {
          setRoomData(payload.new);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_join_requests', filter: `user_id=eq.${user.id}` }, payload => {
        if (payload.new.room_id === roomId) {
          if (payload.new.status === 'approved') setAuthorized(true);
          else setRequestStatus(payload.new.status);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_join_requests', filter: `room_id=eq.${roomId}` }, () => {
        fetchJoinRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user, checkAuth, navigate, fetchFriends, fetchJoinRequests]);

  useEffect(() => {
    if (authorized && roomId && userProfile && !token) {
      const name = userProfile?.display_name || user?.email?.split('@')[0] || 'User';
      generateLiveKitToken(roomId, name).then(setToken).catch(e => setError(e.message));
    }
  }, [authorized, roomId, userProfile, user, token]);

  const handleRequestJoin = async () => {
    try {
      setLoading(true);
      await supabase.from('room_join_requests').insert([{ room_id: roomId, user_id: user?.id, status: 'pending' }]);
      setRequestStatus('pending');
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async (requestId: string, accept: boolean, _userId: string) => {
    if (accept) {
      await supabase.from('room_join_requests').update({ status: 'approved' }).eq('id', requestId);
    } else {
      await supabase.from('room_join_requests').update({ status: 'rejected' }).eq('id', requestId);
    }
    fetchJoinRequests();
  };

  const inviteFriend = async (_friendId: string, friendName: string) => {
    const link = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      alert(`${friendName} uchun havola nusxalandi:\n${link}`);
    } catch {
      prompt(`${friendName} uchun havola:`, link);
    }
  };

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-[#050505]"><Loader2 className="h-10 w-10 animate-spin text-purple-500" /></div>;

  if (error) return (
    <div className="flex flex-col h-screen w-full items-center justify-center bg-[#050505] text-center p-8">
      <ShieldAlert className="w-16 h-16 text-red-500 mb-6" />
      <h2 className="text-2xl font-black mb-2">Xatolik</h2>
      <p className="text-zinc-500 mb-8">{error}</p>
      <button onClick={() => navigate('/dashboard')} className="bg-white text-black px-10 py-4 rounded-2xl font-black">Orqaga</button>
    </div>
  );

  if (!authorized && roomData?.is_private) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-[#050505] text-white p-8 text-center">
        <Lock className="w-16 h-16 text-purple-500 mb-6 opacity-30" />
        <h2 className="text-3xl font-black mb-2">Shaxsiy Xona</h2>
        <p className="text-zinc-500 mb-8">Ruxsat so'rang.</p>
        {requestStatus === 'pending' ? (
          <div className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-zinc-400 font-bold uppercase tracking-widest text-xs">Kutilmoqda...</div>
        ) : (
          <button onClick={handleRequestJoin} className="bg-white text-black px-10 py-4 rounded-2xl font-black flex items-center gap-2"><UserPlus className="w-5 h-5" /> So'rov yuborish</button>
        )}
        <button onClick={() => navigate('/dashboard')} className="mt-8 text-zinc-600 font-bold underline">Orqaga</button>
      </div>
    );
  }

  const isHost = user?.id === roomData?.host_id;
  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="flex h-screen w-full bg-[#050505] text-white overflow-hidden font-sans">
      {token && (
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={LIVEKIT_URL}
          data-lk-theme="default"
          className="flex w-full h-full"
        >
          {/* Main content area */}
          <div className="flex-1 flex flex-col h-full relative overflow-hidden min-w-0">
            {/* Header */}
            <header className="h-14 sm:h-16 shrink-0 flex items-center justify-between px-3 sm:px-6 bg-black/80 backdrop-blur-xl border-b border-white/5 z-50">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button onClick={() => navigate('/dashboard')} className="shrink-0 p-2 hover:bg-white/5 rounded-xl transition-all">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base font-black tracking-tight truncate max-w-[120px] sm:max-w-xs">{roomData.name}</h1>
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest truncate hidden sm:block">
                    Host: {isHost ? (userProfile?.display_name || user?.email?.split('@')[0]) : roomData.host_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-1">
                {/* Join requests badge */}
                {(isHost || isAdmin) && joinRequests.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowInvite(!showInvite)}
                      className="p-2 rounded-xl border bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-all relative"
                    >
                      <Users className="w-4 h-4" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full text-black text-[8px] font-black flex items-center justify-center">
                        {joinRequests.length}
                      </span>
                    </button>
                  </div>
                )}

                {/* Invite friends */}
                <button
                  onClick={() => setShowInvite(!showInvite)}
                  className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${
                    showInvite ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden md:inline">Taklif</span>
                </button>

                {(isHost || isAdmin) && (
                  <button onClick={() => setShowManager(!showManager)} className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${showManager ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}>
                    <Settings2 className="w-4 h-4" />
                    <span className="hidden md:inline">Video</span>
                  </button>
                )}
                {(isHost || isAdmin) && (
                   <button onClick={async () => { if(window.confirm('Xonani yopish?')) { await supabase.from('rooms').delete().eq('id', roomId); navigate('/dashboard'); } }} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all">
                     <Trash2 className="w-4 h-4" />
                   </button>
                )}

                {/* Mobile: Chat/Sidebar toggle */}
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className={`md:hidden p-2 rounded-xl border transition-all ${showSidebar ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/5 text-zinc-400'}`}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </header>
            
            <main className="flex-1 relative flex flex-col overflow-hidden bg-black/40 p-2 sm:p-3 md:p-4">
              <div className="flex-1 flex flex-col min-h-0 relative rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-2xl">
                <ErrorBoundary>
                   <SyncPlayer url={roomData.video_url} isHost={isHost} isAdmin={isAdmin} />
                </ErrorBoundary>

                {!roomData.video_url && !showManager && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-0 bg-[#0a0a0a]">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-500/5 rounded-full flex items-center justify-center mb-4 sm:mb-6 border border-purple-500/10"><Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 animate-spin" /></div>
                    <h2 className="text-lg sm:text-2xl font-black mb-2 sm:mb-3">Video Kutilmoqda...</h2>
                    <p className="text-zinc-500 text-xs sm:text-sm">{isHost || isAdmin ? "Video qo'shish tugmasini bosing." : "Host video qo'yishini kuting."}</p>
                  </div>
                )}
              </div>

              {/* Video Manager Drawer */}
              {(isHost || isAdmin) && (
                <div className={`absolute bottom-0 left-0 right-0 z-[60] transition-all duration-500 ease-in-out ${showManager ? 'translate-y-0' : 'translate-y-full'}`}>
                  <div className="bg-[#0a0a0a] border-t border-white/10 p-3 sm:p-6 shadow-[0_-30px_60px_rgba(0,0,0,0.8)] rounded-t-[24px] sm:rounded-t-[32px]">
                    <div className="max-w-6xl mx-auto h-[360px] sm:h-[420px] flex flex-col">
                      <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
                        <div>
                           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-300">Video Boshqaruv Paneli</h3>
                           <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1 hidden sm:block">Video manbasini tanlang yoki yuklang</p>
                        </div>
                        <button onClick={() => setShowManager(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><ChevronDown className="w-4 h-4 text-zinc-300" /></button>
                      </div>
                      <div className="flex-1 min-h-0">
                        <ErrorBoundary>
                          <VideoManager roomId={roomId!} isHost={isHost} isAdmin={isAdmin} currentVideoUrl={roomData.video_url} />
                        </ErrorBoundary>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Invite / Join Requests Panel */}
              {showInvite && (
                <div className="absolute bottom-0 left-0 right-0 z-[60] transition-all duration-300">
                  <div className="bg-[#0a0a0a] border-t border-white/10 p-4 sm:p-5 shadow-[0_-30px_60px_rgba(0,0,0,0.8)] rounded-t-[24px] sm:rounded-t-[32px]">
                    <div className="max-w-3xl mx-auto">
                      <div className="flex justify-between items-center mb-4 sm:mb-5 shrink-0">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-300">Do'stlarni Taklif Qilish</h3>
                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1 hidden sm:block">Xona havolasini ulashing</p>
                        </div>
                        <button onClick={() => setShowInvite(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X className="w-4 h-4 text-zinc-300" /></button>
                      </div>

                      {/* Room link copy */}
                      <div className="flex gap-2 mb-4 sm:mb-5">
                        <input
                          readOnly
                          value={`${window.location.origin}/room/${roomId}`}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-400 font-mono focus:outline-none min-w-0"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
                          }}
                          className="px-3 sm:px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0"
                        >
                          <Send className="w-3 h-3" /> <span className="hidden sm:inline">Nusxa</span>
                        </button>
                      </div>

                      {/* Friends list */}
                      {friends.length > 0 && (
                        <div>
                          <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-3">Do'stlar ro'yxati</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto custom-scrollbar">
                            {friends.map(f => {
                              const friend = f.user_id === user?.id ? f.friend : f.person;
                              if (!friend) return null;
                              return (
                                <button
                                  key={f.id}
                                  onClick={() => inviteFriend(friend.id, friend.display_name)}
                                  className="flex items-center gap-2 p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all"
                                >
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                                    {friend.display_name?.[0]?.toUpperCase() || '?'}
                                  </div>
                                  <span className="text-[11px] font-bold text-zinc-300 truncate">{friend.display_name}</span>
                                  <Send className="w-3 h-3 text-zinc-600 ml-auto shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Join requests (host only) */}
                      {(isHost || isAdmin) && joinRequests.length > 0 && (
                        <div className="mt-4 sm:mt-5">
                          <p className="text-[9px] text-yellow-500/70 font-black uppercase tracking-widest mb-3">Kirish So'rovlari</p>
                          <div className="space-y-2">
                            {joinRequests.map(req => (
                              <div key={req.id} className="flex items-center justify-between p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                                <span className="text-sm font-bold truncate mr-2">{req.profile?.display_name || req.profile?.email}</span>
                                <div className="flex gap-2 shrink-0">
                                  <button onClick={() => handleJoinRequest(req.id, true, req.user_id)} className="p-2 bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white rounded-lg transition-all">
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => handleJoinRequest(req.id, false, req.user_id)} className="p-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>

          {/* Sidebar — always visible on desktop, slide-over on mobile */}
          <div className={`
            fixed md:static inset-0 z-[80] md:z-auto
            flex flex-col
            transition-transform duration-300 ease-in-out
            ${showSidebar ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            md:w-[300px] lg:w-[320px] md:min-w-[300px] lg:min-w-[320px]
            md:flex md:relative
          `}>
            {/* Mobile backdrop */}
            {showSidebar && (
              <div
                className="md:hidden absolute inset-0 bg-black/60 backdrop-blur-sm -z-10"
                onClick={() => setShowSidebar(false)}
              />
            )}
            {/* Sidebar content */}
            <div className="ml-auto w-[300px] sm:w-[320px] h-full flex flex-col bg-[#080808] border-l border-white/5 overflow-hidden relative">
              {/* Mobile close button */}
              <button
                onClick={() => setShowSidebar(false)}
                className="md:hidden absolute top-3 left-3 z-10 p-1.5 bg-white/10 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <ErrorBoundary>
                <VideoChatSidebar />
              </ErrorBoundary>
            </div>
          </div>
        </LiveKitRoom>
      )}
    </div>
  );
}

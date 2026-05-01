import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Users, 
  Play, 
  ShieldCheck, 
  LogOut, 
  Loader2, 
  Video, 
  Lock, 
  Globe, 
  Trash2, 
  UserCircle 
} from 'lucide-react';
import { ProfileModal } from '@/components/ProfileModal';
import { ServerManagementModal } from '@/components/ServerManagementModal';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(profile);

      const { data: allRooms } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
      setRooms(allRooms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('dashboard_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const deleteRoom = async (id: string) => {
    if (!window.confirm("Xonani butunlay o'chirishni xohlaysizmi?")) return;
    await supabase.from('rooms').delete().eq('id', id);
  };

  const myRooms = rooms.filter(r => r.host_id === user?.id);
  const publicRooms = rooms.filter(r => !r.is_private && r.host_id !== user?.id);
  const isAdmin = userProfile?.role === 'admin';

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-[#050505]"><Loader2 className="h-10 w-10 animate-spin text-purple-500" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 sm:h-20 bg-black/60 backdrop-blur-2xl border-b border-white/5 z-40 flex items-center px-4 sm:px-8 md:px-12 justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
            <Video className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0">
             <h1 className="text-base sm:text-xl font-black tracking-tight truncate">Yorqin Tomosha</h1>
             <p className="text-[9px] sm:text-[10px] text-zinc-500 font-black uppercase tracking-widest hidden sm:block">Premium Kinoteatr</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {isAdmin && (
            <button 
              onClick={() => setShowServerModal(true)}
              className="p-2 sm:p-3 bg-purple-600/10 hover:bg-purple-600 text-purple-500 hover:text-white rounded-xl sm:rounded-2xl border border-purple-500/20 transition-all group relative"
            >
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-[9px] font-black uppercase px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 whitespace-nowrap">Server Admin</span>
            </button>
          )}
          <button 
            onClick={() => setShowProfileModal(true)}
            className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl sm:rounded-2xl border border-white/5 transition-all"
          >
            <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button 
            onClick={() => navigate('/friends')}
            className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl sm:rounded-2xl border border-white/5 transition-all"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button 
            onClick={signOut}
            className="p-2 sm:p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl sm:rounded-2xl border border-red-500/20 transition-all"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      <main className="pt-24 sm:pt-28 pb-16 sm:pb-20 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto space-y-10 sm:space-y-16">
        {/* Create Section */}
        <section className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[28px] sm:rounded-[40px] p-6 sm:p-8 md:p-12 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-white/10 blur-[80px] sm:blur-[100px] -mr-24 sm:-mr-48 -mt-24 sm:-mt-48 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 sm:mb-3">Yangi Xona Ochish</h2>
              <p className="text-purple-100/60 font-medium text-sm sm:text-base max-w-md">Do'stlaringizni taklif qiling va birgalikda sevimli kinolaringizni tomosha qiling.</p>
            </div>
            <button 
              onClick={() => navigate('/create-room')}
              className="w-full sm:w-auto bg-white text-purple-600 px-8 sm:px-10 py-4 sm:py-5 rounded-[20px] sm:rounded-[24px] font-black flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl text-sm sm:text-base"
            >
              <Plus className="w-5 h-5 sm:w-6 sm:h-6" /> XONA YARATISH
            </button>
          </div>
        </section>

        {/* My Rooms */}
        {myRooms.length > 0 && (
          <section>
             <div className="flex items-center gap-4 mb-6 sm:mb-8">
               <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 whitespace-nowrap">Mening Xonalarim</h3>
               <div className="flex-1 h-px bg-white/5"></div>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
               {myRooms.map(room => (
                 <RoomCard key={room.id} room={room} isOwner={true} isAdmin={isAdmin} onDelete={deleteRoom} />
               ))}
             </div>
          </section>
        )}

        {/* Public Rooms */}
        <section>
           <div className="flex items-center gap-4 mb-6 sm:mb-8">
             <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 whitespace-nowrap">Faol Xonalar</h3>
             <div className="flex-1 h-px bg-white/5"></div>
           </div>
           {publicRooms.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
               {publicRooms.map(room => (
                 <RoomCard key={room.id} room={room} isOwner={false} isAdmin={isAdmin} onDelete={deleteRoom} />
               ))}
             </div>
           ) : (
             <div className="py-14 sm:py-20 text-center bg-white/[0.02] rounded-[28px] sm:rounded-[40px] border border-white/5">
                <Users className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 font-bold text-sm">Hozircha ochiq xonalar mavjud emas.</p>
             </div>
           )}
        </section>
      </main>

      {/* Modals */}
      {showProfileModal && <ProfileModal profile={userProfile} onClose={() => setShowProfileModal(false)} onUpdate={fetchData} />}
      {showServerModal && <ServerManagementModal isOpen={showServerModal} onClose={() => setShowServerModal(false)} />}
    </div>
  );
}

function RoomCard({ room, isOwner, isAdmin, onDelete }: { room: any, isOwner: boolean, isAdmin: boolean, onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 hover:border-purple-500/30 transition-all group relative overflow-hidden flex flex-col">
       <div className="flex justify-between items-start mb-5 sm:mb-6">
         <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-purple-600/10 transition-colors">
            {room.is_private ? <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 group-hover:text-purple-500" /> : <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 group-hover:text-purple-500" />}
         </div>
         {(isOwner || isAdmin) && (
           <button 
            onClick={(e) => { e.stopPropagation(); onDelete(room.id); }}
            className="p-2.5 sm:p-3 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
           >
             <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
           </button>
         )}
       </div>
       
       <div className="flex-1">
         <h4 className="text-lg sm:text-xl font-black mb-1 truncate">{room.name}</h4>
         <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-5 sm:mb-6">Host: {room.host_name}</p>
       </div>

       <button 
        onClick={() => navigate(`/room/${room.id}`)}
        className="w-full bg-white/5 hover:bg-white text-zinc-400 hover:text-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 group/btn"
       >
         <Play className="w-4 h-4 group-hover/btn:fill-current" /> XONAGA KIRISH
       </button>
    </div>
  );
}

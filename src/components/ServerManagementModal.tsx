import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  X, 
  Trash2, 
  FileVideo, 
  RefreshCw, 
  Loader2, 
  ShieldAlert,
  HardDrive
} from 'lucide-react';

interface ServerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ServerManagementModal({ isOpen, onClose }: ServerManagementModalProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ count: 0, size: 0 });

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // Supabase Storage list files is a bit tricky with nested folders
      // We'll try to list all files in the 'videos' bucket
      const { error } = await supabase.storage.from('videos').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'desc' },
      });

      if (error) throw error;

      // Note: If files are in folders (user_id/file), we might need to recurse.
      // For now, let's assume flat or just show what we find.
      // Actually, my code uploads to `userData.user.id/fileName`.
      // So I need to list folders first.
      
      const { data: folders } = await supabase.storage.from('videos').list();
      let allFiles: any[] = [];
      let totalSize = 0;

      if (folders) {
        for (const folder of folders) {
          if (folder.id === null) { // It's a folder
            const { data: folderFiles } = await supabase.storage.from('videos').list(folder.name);
            if (folderFiles) {
              const mapped = folderFiles.map(f => ({
                ...f,
                fullPath: `${folder.name}/${f.name}`,
                folder: folder.name
              }));
              allFiles = [...allFiles, ...mapped];
              totalSize += folderFiles.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);
            }
          } else {
            allFiles.push({ ...folder, fullPath: folder.name });
            totalSize += folder.metadata?.size || 0;
          }
        }
      }

      setFiles(allFiles.filter(f => f.name !== '.emptyFolderPlaceholder'));
      setStats({ count: allFiles.length, size: totalSize });
    } catch (err) {
      console.error('Storage fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchFiles();
  }, [isOpen]);

  const deleteFile = async (path: string) => {
    if (!window.confirm('Ushbu faylni serverdan butunlay o\'chirmoqchimisiz?')) return;
    try {
      const { error } = await supabase.storage.from('videos').remove([path]);
      if (error) throw error;
      fetchFiles();
    } catch (err: any) {
      alert('O\'chirishda xatolik: ' + err.message);
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Barcha yuklangan videolarni serverdan tozalab tashlamoqchimisiz?')) return;
    try {
      const paths = files.map(f => f.fullPath);
      const { error } = await supabase.storage.from('videos').remove(paths);
      if (error) throw error;
      fetchFiles();
    } catch (err: any) {
      alert('Tozalashda xatolik: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111] border border-white/10 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Serverni Boshqarish</h2>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                Serverdagi fayllar — {stats.count} ta · {(stats.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6 text-zinc-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <div className="flex justify-between items-center mb-2">
            <button 
              onClick={fetchFiles}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Yangilash
            </button>
            {files.length > 0 && (
              <button 
                onClick={clearAll}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                <Trash2 className="w-4 h-4" /> Barchasini tozalash
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              <span className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Fayllar tekshirilmoqda...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-white/5 rounded-3xl">
              <ShieldAlert className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-bold">Server hozircha toza</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500">
                      <FileVideo className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-200 truncate pr-2">{file.name}</p>
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">
                        {(file.metadata?.size / (1024 * 1024)).toFixed(2)} MB · {new Date(file.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteFile(file.fullPath)}
                    className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                  >
                    <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">O'chirish</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

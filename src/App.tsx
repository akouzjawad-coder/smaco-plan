import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Profile, WorkRecord } from './types';
import BossDashboard from './components/BossDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import PinLogin from './components/PinLogin';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [workRecords, setWorkRecords] = useState<WorkRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRealMobile, setIsRealMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsRealMobile(window.innerWidth < 500);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadData();
    const storedUserId = localStorage.getItem('sp_user_id');
    if (storedUserId) {
      const storedProfile = localStorage.getItem('sp_user_profile');
      if (storedProfile) {
        setCurrentUser(JSON.parse(storedProfile));
      }
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (profilesError) throw profilesError;

      const { data: recordsData, error: recordsError } = await supabase
        .from('work_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (recordsError) throw recordsError;

      if (profilesData && profilesData.length === 0) {
        const defaultProfiles: Omit<Profile, 'id'>[] = [
          { name: 'Manager', phone: '+49 170 0000000', role: 'boss', hourly_rate: 25, pin: '1111', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
          { name: 'employee 1', phone: '+49 170 1111111', role: 'employee', hourly_rate: 13, pin: '2222', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
          { name: 'employee 2', phone: '+49 170 2222222', role: 'employee', hourly_rate: 13, pin: '3333', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
          { name: 'employee 3', phone: '+49 170 3333333', role: 'employee', hourly_rate: 13, pin: '4444', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
        ];
        for (const profile of defaultProfiles) {
          await supabase.from('profiles').insert([profile]);
        }
        const { data: newProfiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
        setProfiles(newProfiles || []);
      } else {
        setProfiles(profilesData || []);
      }

      setWorkRecords(recordsData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = (user: Profile) => {
    setCurrentUser(user);
    localStorage.setItem('sp_user_id', user.id);
    localStorage.setItem('sp_user_profile', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sp_user_id');
    localStorage.removeItem('sp_user_profile');
  };

  const addWorkRecord = async (record: Omit<WorkRecord, 'id'>) => {
    const { data, error } = await supabase
      .from('work_records')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    setWorkRecords(prev => [data, ...prev]);
    return data;
  };

  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) throw error;
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    if (currentUser?.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const addProfile = async (profile: Omit<Profile, 'id'>) => {
    const { data, error } = await supabase.from('profiles').insert([profile]).select().single();
    if (error) throw error;
    setProfiles(prev => [...prev, data]);
    return data;
  };

  const toggleRecordPaid = async (id: string, isPaid: boolean) => {
    const { error } = await supabase.from('work_records').update({ is_paid: isPaid }).eq('id', id);
    if (error) throw error;
    setWorkRecords(prev => prev.map(r => r.id === id ? { ...r, is_paid: isPaid } : r));
  };

  const toggleRecordApproved = async (id: string, isApproved: boolean) => {
    const { error } = await supabase.from('work_records').update({ is_approved: isApproved }).eq('id', id);
    if (error) throw error;
    setWorkRecords(prev => prev.map(r => r.id === id ? { ...r, is_approved: isApproved } : r));
  };

  const markRecordsPaid = async (ids: string[]) => {
    const { error } = await supabase.from('work_records').update({ is_paid: true }).in('id', ids);
    if (error) throw error;

    setWorkRecords(prev => prev.map(r => ids.includes(r.id) ? { ...r, is_paid: true } : r));
  };

  const activeUser = currentUser ? profiles.find(p => p.id === currentUser.id) || currentUser : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center">
        <div className="text-orange-500 text-sm font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090E] flex flex-col text-slate-100 font-sans selection:bg-orange-600 selection:text-white antialiased justify-center items-center py-2 sm:py-6">
      <div className="w-full max-w-[390px] mx-auto flex items-center justify-center">
        <div className={isRealMobile
          ? 'w-full min-h-screen bg-slate-950 flex flex-col'
          : 'relative mx-auto border-[12px] border-slate-900 rounded-[48px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden w-[390px] h-[785px] bg-slate-950 flex flex-col ring-8 ring-slate-800/20'
        }>

          {!isRealMobile && (
            <div className="absolute top-0 inset-x-0 h-6 bg-slate-950 flex justify-center items-center z-50">
              <div className="w-28 h-4.5 bg-slate-950 rounded-b-xl flex items-center justify-center">
                <span className="w-9 h-1 bg-slate-800 rounded-full" />
              </div>
            </div>
          )}

          <div className={`flex-grow flex flex-col ${isRealMobile ? 'pt-3 px-4' : 'pt-8 overflow-y-auto px-4.5'} ${currentUser === null ? 'bg-slate-950 px-0 pt-0' : ''}`}>

            {currentUser === null ? (
              <PinLogin users={profiles} onUnlock={handleUnlock} />
            ) : (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 pt-1.5 shrink-0 bg-slate-950">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={activeUser?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2'}
                      alt={activeUser?.name}
                      className="h-9 w-9 rounded-full object-cover border border-orange-500/30"
                    />
                    <div>
                      <h2 className="text-xs font-bold text-white leading-none">{activeUser?.name}</h2>
                      <span className="text-[9px] text-orange-500 font-bold uppercase tracking-wider font-mono mt-1.5 block">
                        {activeUser?.role === 'boss' ? 'Manager' : 'Staff Associate'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-slate-900 border border-zinc-800 rounded-xl px-2 py-1">
                      <img src="/logo.png" alt="SMACO" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                      <span className="text-[10px] font-black tracking-tight text-white">SMACO</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-1 px-2.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/40 text-rose-350 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Lock</span>
                    </button>
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto pb-4 space-y-6">
                  {activeUser?.role === 'boss' ? (
                    <BossDashboard
                      profiles={profiles}
                      workRecords={workRecords}
                      onAddProfile={addProfile}
                      onUpdateProfile={updateProfile}
                      onTogglePaid={toggleRecordPaid}
                      onToggleApproved={toggleRecordApproved}
                      onMarkPaid={markRecordsPaid}
                    />
                  ) : (
                    <EmployeeDashboard
                      currentUser={activeUser!}
                      workRecords={workRecords}
                      onAddRecord={addWorkRecord}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {!isRealMobile && (
            <div className={`absolute bottom-1 right-0 left-0 flex justify-center py-2 z-50 border-t ${currentUser === null ? 'bg-slate-950 border-t-slate-900/40' : 'bg-slate-950 border-t-zinc-900/80'}`}>
              <div className="w-28 h-1 bg-zinc-700 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

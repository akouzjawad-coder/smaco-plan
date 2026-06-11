import React, { useState } from 'react';
import { KeyRound, Delete, UserCheck, Calendar } from 'lucide-react';
import { User } from '../types';

interface PinLoginProps {
  users: User[];
  onUnlock: (user: User) => void;
}

export default function PinLogin({ users, onUnlock }: PinLoginProps) {
  const [activeSegment, setActiveSegment] = useState<'boss' | 'employee'>('employee');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pinEntry, setPinEntry] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Filter users based on classification segment
  const filteredUsers = users.filter(u => u.role === activeSegment);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setPinEntry('');
    setPinError(null);
  };

  const handleKeyPress = (num: string) => {
    if (pinEntry.length >= 4) return;
    setPinError(null);
    const newPin = pinEntry + num;
    setPinEntry(newPin);

    // Auto-verify if 4 digits are reached
    if (newPin.length === 4) {
      if (selectedUser && selectedUser.pin === newPin) {
        // Success haptic effect trigger
        onUnlock(selectedUser);
      } else {
        setPinError('Incorrect 4-Digit Security PIN. Please try again.');
        // Clear pin after a brief delay for retry
        setTimeout(() => {
          setPinEntry('');
        }, 800);
      }
    }
  };

  const handleDelete = () => {
    setPinEntry(prev => prev.slice(0, -1));
    setPinError(null);
  };

  const handleClear = () => {
    setPinEntry('');
    setPinError(null);
  };

  return (
    <div className="flex-grow flex flex-col justify-between h-full bg-slate-950 text-white select-none">
      
      {/* Upper Brand Section */}
      <div className="pt-8 px-5 pb-4 text-center">
        <div className="mx-auto w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center shadow-lg shadow-orange-600/10 mb-3 border border-slate-800">
          <img src="/logo.png" alt="SMACO Logo" className="w-13 h-13 object-contain rounded-2xl" referrerPolicy="no-referrer" />
        </div>
        <h1 className="text-xl font-black tracking-tight font-display text-white">SMACO Plan</h1>
        <p className="text-[10px] text-orange-500 font-mono tracking-widest uppercase mt-0.5">Smash Burger & Birria Tacos Roster</p>
      </div>

      {!selectedUser ? (
        /* SCREEN A: PROFILE SELECTOR */
        <div className="flex-grow flex flex-col justify-start px-5 pb-6 space-y-5 overflow-y-auto">
          {/* Segment selection tabs: Boss vs Employee */}
          <div className="grid grid-cols-2 bg-slate-900 p-1 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => {
                setActiveSegment('employee');
                setPinError(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeSegment === 'employee'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/10'
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              Staff Portal
            </button>
            <button
              onClick={() => {
                setActiveSegment('boss');
                setPinError(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeSegment === 'boss'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/10'
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              Manager Portal
            </button>
          </div>

          <div className="space-y-2.5">
            <p className="text-[10pt] font-semibold text-slate-400 pl-1 capitalize">
              Select Your Name to Unlock
            </p>

            <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-medium">
                  No active profiles found.
                </div>
              ) : (
                filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="w-full text-left bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2'}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-750 group-hover:border-orange-500 transition-colors shadow-inner"
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-100 group-hover:text-white transition-colors">
                          {user.name}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                          {user.role === 'boss' ? 'Store Commander' : 'Store Associate'}
                        </span>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-800 group-hover:bg-orange-950 flex items-center justify-center transition-colors">
                      <KeyRound className="w-3.5 h-3.5 text-slate-450 group-hover:text-orange-400 transition-colors" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* SCREEN B: NUMERICAL PIN ENTRY DIALOG */
        <div className="flex-grow flex flex-col justify-between px-6 pb-6">
          <div className="flex flex-col items-center space-y-4 pt-1">
            <button
              onClick={() => setSelectedUser(null)}
              className="text-[10px] text-orange-400 hover:text-orange-300 bg-orange-950/45 hover:bg-orange-950 border border-orange-900 p-1.5 px-3.5 rounded-full font-bold transition-all cursor-pointer active:scale-95"
            >
              ← Back to Employee List
            </button>

            {/* Profile Avatar Node */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <img
                  src={selectedUser.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2'}
                  alt={selectedUser.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-orange-550 shadow-lg shadow-orange-600/10"
                />
                <div className="absolute -bottom-1 -right-1 bg-orange-600 p-1 rounded-full border border-slate-950">
                  <UserCheck className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <h3 className="text-xs font-bold text-white mt-2 leading-none">{selectedUser.name}</h3>
              <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-bold">
                {selectedUser.role === 'boss' ? 'Manager Portal PIN Access' : 'Associate Portal PIN Access'}
              </p>
            </div>

            {/* Entry visualizers */}
            <div className="w-full flex flex-col items-center space-y-2">
              <div className="flex gap-4.5 justify-center py-2">
                {[0, 1, 2, 3].map(idx => {
                  const filled = pinEntry.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                        filled
                          ? 'bg-orange-500 scale-110 shadow-sm shadow-orange-505/30'
                          : pinError
                          ? 'bg-rose-500 animate-pulse'
                          : 'bg-slate-800 border border-slate-700'
                      }`}
                    />
                  );
                })}
              </div>

              {pinError ? (
                <p className="text-[10px] text-rose-500 font-bold bg-rose-950/40 border border-rose-900/40 py-1 px-3.5 rounded-lg text-center animate-shake">
                  {pinError}
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 font-medium">
                  Enter your assigned 4-digit PIN code
                </p>
              )}
            </div>
          </div>

          {/* Tactile Mobile Keypad */}
          <div className="mx-auto w-full max-w-[270px] grid grid-cols-3 gap-y-3.5 gap-x-4.5 justify-items-center py-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="w-13.5 h-13.5 rounded-full bg-slate-900 hover:bg-slate-850 active:bg-slate-750 font-mono font-bold text-base text-slate-200 hover:text-white border border-slate-850 flex items-center justify-center transition-all cursor-pointer transform active:scale-90"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              className="text-[10px] text-slate-450 hover:text-white font-bold tracking-wider cursor-pointer uppercase h-13.5 w-13.5 rounded-full flex items-center justify-center hover:bg-slate-900/30 active:scale-95 transition-all"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="w-13.5 h-13.5 rounded-full bg-slate-900 hover:bg-slate-850 active:bg-slate-755 font-mono font-bold text-base text-slate-250 hover:text-white border border-slate-850 flex items-center justify-center transition-all cursor-pointer transform active:scale-95"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="text-slate-450 hover:text-white cursor-pointer h-13.5 w-13.5 rounded-full flex items-center justify-center hover:bg-slate-900 active:scale-95 transition-all"
              title="Delete last digit"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-950 p-4 text-center">
        <p className="text-[9px] text-slate-600 font-sans tracking-wide">
          SMACO Plan • Premium Workforce System
        </p>
      </div>
    </div>
  );
}

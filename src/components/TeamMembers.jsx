import React, { useState, useEffect } from 'react';
import { LogOut, Settings, Crown, Search, UserPlus2, UserCheck, X, UserMinus, Bell, Users, MessageCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import Modal from './Modal';
import ChatModal from './ChatModal';

const TeamMembers = ({ uid, userName }) => {
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!uid) return;
    
    // 1. Listen for Friends
    const friendsQ = query(collection(db, `users/${uid}/teamMembers`), orderBy('createdAt', 'desc'));
    const unsubFriends = onSnapshot(friendsQ, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // 2. Listen for Incoming Friend Requests
    const requestsQ = query(collection(db, `users/${uid}/friendRequests`), orderBy('sentAt', 'desc'));
    const unsubRequests = onSnapshot(requestsQ, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubFriends();
      unsubRequests();
    };
  }, [uid]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResult(null);

    const normalized = searchQuery.trim().toLowerCase();
    try {
      const q = query(collection(db, 'users'), where('email', '==', normalized));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setSearchError('No student found with this email.');
      } else {
        const found = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (found.id === uid) {
          setSearchError("You can't add yourself.");
        } else if (members.some(m => m.id === found.id)) {
          setSearchError('This student is already your friend.');
        } else {
          setSearchResult(found);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      // Show the specific error message to help the user diagnose (e.g. Permission Denied)
      setSearchError(`Search failed: ${err.message || 'Check your internet connection'}`);
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async () => {
    if (!searchResult || !uid) return;
    setSearching(true);
    try {
      // Get current user's profile info to send with request
      const myProfile = await getDoc(doc(db, 'users', uid));
      const myData = myProfile.data();

      // Create request in target user's incoming requests
      await setDoc(doc(db, `users/${searchResult.id}/friendRequests`, uid), {
        senderId: uid,
        senderName: myData?.display_name || userName || 'Aspirant',
        senderUsername: myData?.username || 'anonymous',
        senderPhoto: myData?.profile_pic_url || '',
        sentAt: serverTimestamp(),
        status: 'pending'
      });

      alert(`Friend request sent to @${searchResult.username}!`);
      setIsModalOpen(false);
      setSearchResult(null);
      setSearchQuery('');
    } catch (err) {
      console.error("Request error:", err);
      alert('Failed to send request.');
    } finally {
      setSearching(false);
    }
  };

  const acceptRequest = async (request) => {
    try {
      const now = serverTimestamp();
      
      // 1. Add sender to my friends
      await setDoc(doc(db, `users/${uid}/teamMembers`, request.senderId), {
        id: request.senderId,
        name: request.senderName,
        username: request.senderUsername,
        photoUrl: request.senderPhoto || '',
        role: 'Study Partner',
        createdAt: now
      });

      // 2. Add me to sender's friends (Reciprocal)
      const myProfile = await getDoc(doc(db, 'users', uid));
      const myData = myProfile.data();
      
      await setDoc(doc(db, `users/${request.senderId}/teamMembers`, uid), {
        id: uid,
        name: myData?.display_name || userName || 'Aspirant',
        username: myData?.username || 'anonymous',
        photoUrl: myData?.profile_pic_url || '',
        role: 'Study Partner',
        createdAt: now
      });

      // 3. Delete the request
      await deleteDoc(doc(db, `users/${uid}/friendRequests`, request.id));
      
      alert(`You are now friends with ${request.senderName}!`);
    } catch (err) {
      console.error("Accept error:", err);
      alert('Failed to accept request.');
    }
  };

  const declineRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, `users/${uid}/friendRequests`, requestId));
    } catch (err) {
      console.error("Decline error:", err);
    }
  };

  return (
    <div className="bg-panel rounded-3xl dark:rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-sm border border-main overflow-hidden flex flex-col h-full">
      {/* Refined Header */}
      <div className="px-6 py-5 border-b border-main flex justify-between items-center bg-white/50 dark:bg-gray-900/30 backdrop-blur-sm">
        <div className="flex items-center">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl mr-3.5">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.15em] flex items-center leading-none">
              Friends
              <span className="ml-2.5 px-2 py-0.5 rounded-full bg-blue-100/50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[9px] font-black border border-blue-200/30">
                {members.length}
              </span>
            </h3>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsChatOpen(true)}
            className="h-9 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-main hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider group"
          >
            <MessageCircle className="w-4 h-4 text-blue-500 transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">Chat</span>
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-4 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider relative group"
          >
            <UserPlus2 className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">Add</span>
            {requests.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-gray-900 animate-bounce">
                {requests.length}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Scrollable List Area */}
      <div className="flex-1 overflow-y-auto min-h-[350px] bg-panel/50 p-4">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-full space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Loading Partners...</p>
          </div>
        ) : (members.length > 0 || requests.length > 0) ? (
          <div className="space-y-4">
            
            {/* Friend Requests Section */}
            {requests.length > 0 && (
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-[2rem] border border-blue-100 dark:border-blue-800/30 animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 flex items-center">
                    <Bell className="w-3.5 h-3.5 mr-2" />
                    Incoming Invitations
                  </p>
                  <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    {requests.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {requests.map(req => (
                    <div key={req.id} className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-800/50 flex items-center justify-between transition-all hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-sm">
                          {req.senderName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-black tracking-tight">{req.senderName}</p>
                          <p className="text-[10px] text-blue-600 font-bold opacity-60">@{req.senderUsername}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => acceptRequest(req)}
                          className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg transition-all active:scale-95"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => declineRequest(req.id)}
                          className="h-8 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 text-[10px] font-black uppercase rounded-lg transition-all active:scale-95"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            {members.length > 0 && (
              <div className="space-y-2.5">
                {members.map(member => (
                  <div key={member.id} className="p-4 bg-white dark:bg-gray-800/80 rounded-2xl border border-transparent hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/5 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-50 to-blue-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-blue-600 font-black text-xl border border-main overflow-hidden group-hover:rotate-3 transition-transform">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            member.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full shadow-sm" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm tracking-tight text-gray-900 dark:text-white">{member.name}</h4>
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider opacity-60">@{member.username || 'aspirant'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center px-3 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 transition-all group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600">
                      <UserCheck className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                      Partner
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-gray-200 dark:text-gray-600" />
            </div>
            <h4 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-2">No Study Partners</h4>
            <p className="text-[11px] font-bold text-gray-300 max-w-[200px] leading-relaxed italic">Search for other students by email to start collaborating.</p>
          </div>
        )}
      </div>

      {/* MODALS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white dark:bg-gray-950 w-full max-w-sm rounded-[2.5rem] shadow-2xl relative border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
               <div className="relative z-10">
                 <h3 className="text-xl font-black uppercase tracking-tight italic">Find Partners</h3>
                 <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-80">Expand your study network</p>
               </div>
               <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            </div>

            <div className="p-8 space-y-6">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <input 
                    type="email" required
                    placeholder="student@example.com"
                    className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none transition text-sm font-black placeholder:text-gray-300"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                </div>
                <button 
                  type="submit"
                  disabled={searching}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all outline-none"
                >
                  {searching ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Search Database'}
                </button>
              </form>

              {searchError && (
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 text-[11px] font-bold text-red-500 text-center animate-in slide-in-from-top-2">
                  {searchError}
                </div>
              )}

              {searchResult && (
                <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-900 rounded-[2rem] border-2 border-blue-200/50 dark:border-blue-900/30 flex items-center justify-between mb-4 animate-in zoom-in-90">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-blue-600 font-black text-lg border border-blue-100 dark:border-gray-700 shadow-sm">
                      {searchResult.display_name?.charAt(0) || searchResult.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black tracking-tight">{searchResult.display_name || 'Aspirant'}</p>
                      <p className="text-[9px] font-bold text-blue-600 uppercase truncate max-w-[120px] opacity-70">@{searchResult.username}</p>
                    </div>
                  </div>
                  <button 
                    onClick={sendRequest}
                    disabled={searching}
                    className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-md"
                  >
                    <UserPlus2 className="w-5 h-5" />
                  </button>
                </div>
              )}

              <button 
                onClick={() => { setIsModalOpen(false); setSearchResult(null); setSearchError(''); }}
                className="w-full text-center text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isChatOpen && (
        <ChatModal 
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          uid={uid}
          userName={userName || 'Aspirant'}
        />
      )}
    </div>
  );
};

export default TeamMembers;

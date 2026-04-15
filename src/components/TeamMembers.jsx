import React, { useState, useEffect } from 'react';
import { LogOut, Settings, Crown, Search, UserPlus2, UserCheck, X, UserMinus, Bell, Users, MessageCircle, CheckCircle2 } from 'lucide-react';
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

    const normalized = searchQuery.trim().toLowerCase().replace('@', '');
    try {
      const q = query(collection(db, 'users'), where('username', '==', normalized));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setSearchError('User not found.');
      } else {
        const found = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (found.id === uid) {
          setSearchError("You can't add yourself.");
        } else if (members.some(m => m.id === found.id)) {
          setSearchError('Already in your friends list.');
        } else {
          setSearchResult(found);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchError('Search failed. Try again.');
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
    <div className="bg-panel rounded-xl shadow-sm border border-main overflow-hidden flex flex-col h-full">
      <div className="px-6 py-5 border-b border-main flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
        <h3 className="text-xl font-semibold flex items-center">
          <Users className="w-5 h-5 mr-2 text-purple-500" />
          Friends
          <span className="ml-3 text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full">
            {members.length}
          </span>
        </h3>
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsChatOpen(true)}
            className="text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-main font-medium py-1.5 px-3 rounded-lg shadow-sm transition flex items-center border border-main"
          >
            <MessageCircle className="w-4 h-4 mr-1.5 text-blue-500" /> Chat
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-sm bg-purple-600 hover:bg-purple-700 text-white font-medium py-1.5 px-3 rounded-lg shadow-sm transition flex items-center relative"
          >
            <UserPlus2 className="w-4 h-4 mr-1" /> Add Friend
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-gray-900 animate-bounce">
                {requests.length}
              </span>
            )}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-[300px] bg-panel">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (members.length > 0 || requests.length > 0) ? (
          <div className="divide-y divide-main">
            {/* Friend Requests Section */}
            {requests.length > 0 && (
              <div className="p-3 bg-purple-50/50 dark:bg-purple-900/10 border-b border-main">
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-2 flex items-center">
                  <Bell className="w-3 h-3 mr-1.5" /> Pending Invitations ({requests.length})
                </p>
                <div className="space-y-2">
                  {requests.map(req => (
                    <div key={req.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800/50 flex items-center justify-between animate-in slide-in-from-right-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center font-bold text-purple-600 dark:text-purple-400 text-xs">
                          {req.senderName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-none">{req.senderName}</p>
                          <p className="text-[10px] text-gray-500 mt-1">@{req.senderUsername}</p>
                        </div>
                      </div>
                      <div className="flex space-x-1.5 font-bold">
                        <button 
                          onClick={() => acceptRequest(req)}
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] rounded-lg transition"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => declineRequest(req.id)}
                          className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-[10px] rounded-lg transition"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List Section */}
            <ul className="divide-y divide-main">
              {members.map(member => (
                <li key={member.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition flex items-center justify-between group">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
                      {member.photoUrl ? (
                        <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        member.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-gray-900 dark:text-gray-100">{member.name}</p>
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-[10px] font-black text-purple-500 tracking-tighter uppercase">@{member.username || 'aspirant'}</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-black uppercase text-gray-400 hidden md:block tracking-widest">
                    Study Partner
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-8">
            <div className="w-16 h-16 bg-purple-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-purple-300 dark:text-gray-500" />
            </div>
            <p className="mb-2">No friends yet.</p>
            <p className="text-sm opacity-70">Search for usernames to find partners.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-main animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Find Students</h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setSearchResult(null);
                  setSearchError('');
                }} 
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <input 
                  type="text"
                  required
                  placeholder="Enter username (e.g. nimcet_topper)"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-main rounded-2xl focus:border-purple-500 outline-none transition text-sm font-bold"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <button 
                type="submit"
                disabled={searching}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-purple-500/20 flex items-center justify-center"
              >
                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search Database'}
              </button>
            </form>

            <div className="mt-6">
              {searchError && (
                <p className="text-xs text-red-500 text-center font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                  {searchError}
                </p>
              )}

              {searchResult && (
                <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-2xl border-2 border-purple-500/30 flex items-center justify-between animate-in slide-in-from-bottom-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-black text-xl">
                      {searchResult.display_name?.charAt(0) || searchResult.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black">{searchResult.display_name}</p>
                      <p className="text-xs text-purple-500 font-bold uppercase tracking-tighter">@{searchResult.username}</p>
                    </div>
                  </div>
                  <button 
                    onClick={sendRequest}
                    disabled={searching}
                    className="p-2.5 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-200 transition shadow-sm"
                    title="Send Friend Request"
                  >
                    <UserPlus2 className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Focused Study Chat Modal */}
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

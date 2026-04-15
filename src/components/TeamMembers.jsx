import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { Users, UserPlus, MessageCircle, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import ChatModal from './ChatModal';

const TeamMembers = ({ uid, userName }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: '' });

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, `users/${uid}/teamMembers`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Error fetching members: ", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, `users/${uid}/teamMembers`), {
        name: formData.name.trim(),
        role: formData.role.trim() || 'Study Partner',
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({ name: '', role: '' });
    } catch (err) {
      console.error("Error adding friend: ", err);
      alert("Failed to add friend.");
    } finally {
      setSaving(false);
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
            className="text-sm bg-purple-600 hover:bg-purple-700 text-white font-medium py-1.5 px-3 rounded-lg shadow-sm transition flex items-center"
          >
            <UserPlus className="w-4 h-4 mr-1" /> Add Friend
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-[300px] bg-panel">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : members.length > 0 ? (
          <ul className="divide-y divide-main">
            {members.map(member => (
              <li key={member.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-md">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{member.name}</p>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in fade-in slide-in-from-left-2 duration-700" title="Successfully added" />
                    </div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{member.role}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-400 font-medium hidden md:block">
                  Added {member.createdAt?.toDate ? new Date(member.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-8">
            <div className="w-16 h-16 bg-purple-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-purple-300 dark:text-gray-500" />
            </div>
            <p className="mb-2">No friends yet.</p>
            <p className="text-sm opacity-70">Connect with other aspirants here.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
      {isModalOpen && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Add New Friend"
          onSubmit={handleSubmit}
          submitText="Add Friend"
          loading={saving}
        >
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Full Name</label>
            <input 
              type="text" 
              required
              disabled={saving}
              placeholder="e.g. Jane Doe"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition text-sm"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Role (Optional)</label>
            <input 
              type="text" 
              disabled={saving}
              placeholder="e.g. Study Partner"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition text-sm"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            />
          </div>
        </Modal>
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

import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { Send, X, MessageSquare, HelpCircle, CheckCircle2, User } from 'lucide-react';

const ChatModal = ({ isOpen, onClose, uid, userName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTag, setActiveTag] = useState('none'); // 'none', 'doubt', 'answer'
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!uid || !isOpen) return;

    const messagesRef = collection(db, `users/${uid}/groupChat`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoading(false);
      
      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [uid, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      text: newMessage.trim(),
      senderId: uid,
      senderName: userName || 'Aspirant',
      tag: activeTag,
      timestamp: serverTimestamp()
    };

    setNewMessage('');
    setActiveTag('none');

    try {
      await addDoc(collection(db, `users/${uid}/groupChat`), messageData);
    } catch (err) {
      console.error("Error sending message: ", err);
      alert("Failed to send message.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-800 flex flex-col h-[80vh] animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Study Group Chat</h3>
              <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Text-Only Mode • Focused Learning</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Message Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-gray-800/20"
        >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.senderId === uid ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{msg.senderName}</span>
                  {msg.tag === 'doubt' && (
                    <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black uppercase flex items-center">
                      <HelpCircle className="w-2.5 h-2.5 mr-1" /> Doubt
                    </span>
                  )}
                  {msg.tag === 'answer' && (
                    <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-black uppercase flex items-center">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Answer
                    </span>
                  )}
                </div>
                <div 
                  className={`
                    max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm
                    ${msg.senderId === uid 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-none'}
                    ${msg.tag === 'doubt' ? 'ring-2 ring-amber-500/50' : ''}
                    ${msg.tag === 'answer' ? 'ring-2 ring-emerald-500/50' : ''}
                  `}
                >
                  <p className="whitespace-pre-wrap break-words transition-all">{msg.text}</p>
                </div>
                <span className="mt-1 text-[9px] text-gray-400">
                  {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                </span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 opacity-60">
              <MessageSquare className="w-12 h-12 mb-3 mt-4" />
              <p className="font-medium">No messages yet.</p>
              <p className="text-xs">Start a productive discussion with your study partners.</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <form onSubmit={handleSendMessage} className="space-y-4">
            {/* Tag Selection */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setActiveTag(activeTag === 'doubt' ? 'none' : 'doubt')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTag === 'doubt' 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1.5" /> Tag as Doubt
              </button>
              <button
                type="button"
                onClick={() => setActiveTag(activeTag === 'answer' ? 'none' : 'answer')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTag === 'answer' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Tag as Answer
              </button>
            </div>

            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  rows="1"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm resize-none scrollbar-hide"
                  placeholder="Ask a doubt or share an explanation..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-600/30 transition transform active:scale-90 disabled:opacity-50 disabled:scale-100"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[9px] text-center text-gray-400 font-medium">Text messages only • Images and files are disabled for better focus.</p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;

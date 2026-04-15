import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { FileText, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import Modal from './Modal';

const MyNotes = ({ uid }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, `users/${uid}/notes`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Error fetching notes: ", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, `users/${uid}/notes`), {
        title: formData.title.trim(),
        content: formData.content.trim(),
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({ title: '', content: '' });
    } catch (err) {
      console.error("Error adding note: ", err);
      alert("Failed to add note."); // Fallback for unexpected firestore rule error
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (note) => {
    setNoteToDelete(note);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!noteToDelete || deleting) return;
    
    setDeleting(true);
    try {
      await deleteDoc(doc(db, `users/${uid}/notes`, noteToDelete.id));
      setIsDeleteModalOpen(false);
      setNoteToDelete(null);
      setToast({ visible: true, message: 'Note deleted successfully!' });
      setTimeout(() => setToast({ visible: false, message: '' }), 3000);
    } catch (err) {
      console.error("Error deleting note: ", err);
      alert("Failed to delete note.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-panel rounded-xl shadow-sm border border-main overflow-hidden flex flex-col h-full relative">
      {/* Toast Notification */}
      {toast.visible && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[110] bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white/20 p-1 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      <div className="px-6 py-5 border-b border-main flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
        <h3 className="text-xl font-semibold flex items-center">
          <FileText className="w-5 h-5 mr-2 text-blue-500" />
          My Notes
          <span className="ml-3 text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
            {notes.length}
          </span>
        </h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-3 rounded-lg shadow-sm transition flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" /> New Note
        </button>
      </div>
      
      <div className="p-6 flex-1 overflow-y-auto min-h-[300px] bg-panel">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : notes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map(note => (
                <div key={note.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-xl shadow-sm hover:shadow-md transition group relative">
                  <div className="flex justify-between items-start mb-2 pr-6">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 truncate">{note.title}</h4>
                  </div>
                  <button 
                    onClick={() => handleDelete(note)}
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4">
                    {note.content || <span className="italic opacity-50">No content</span>}
                  </p>
                  <div className="text-xs text-gray-400 font-medium pt-3 border-t border-gray-50 dark:border-gray-700/50">
                    {note.createdAt?.toDate ? new Date(note.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-8">
            <div className="w-16 h-16 bg-white border-2 border-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <FileText className="w-8 h-8 text-blue-400 dark:text-gray-500" />
            </div>
            <p className="mb-2">No notes yet.</p>
            <p className="text-sm opacity-70">Capture your brilliant ideas here.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Create New Note"
          onSubmit={handleSubmit}
          submitText="Save Note"
          loading={saving}
        >
          {/* ... existing modal content ... */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Title</label>
            <input 
              type="text" 
              required
              disabled={saving}
              placeholder="e.g. Mathematics Formula Sheet"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Content (Optional)</label>
            <textarea 
              rows="4"
              disabled={saving}
              placeholder="Start typing your notes here..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm resize-none"
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
            ></textarea>
          </div>
        </Modal>
      )}

      {/* Custom Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Note"
          onSubmit={(e) => { e.preventDefault(); confirmDelete(); }}
          submitText="Delete Permanently"
          loading={deleting}
        >
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete <span className="font-bold text-gray-800 dark:text-gray-200">"{noteToDelete?.title}"</span>? This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MyNotes;

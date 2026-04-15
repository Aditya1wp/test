import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { Folder, FileText, ExternalLink, UploadCloud, FolderPlus, Download, Trash2, XCircle, Loader2, Crown, AlertTriangle, Smartphone } from 'lucide-react';
import Modal from './Modal';

const MyFiles = ({ uid, isPremium }) => {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  
  const [folderName, setFolderName] = useState('');
  const [fileData, setFileData] = useState({ file: null, folderId: '' });
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (!uid) return;
    
    const foldersQ = query(collection(db, `users/${uid}/folders`), orderBy('createdAt', 'desc'));
    const unsubscribeFolders = onSnapshot(foldersQ, (snapshot) => {
      setFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Error fetching folders: ", err));

    const filesQ = query(collection(db, `users/${uid}/files`), orderBy('createdAt', 'desc'));
    const unsubscribeFiles = onSnapshot(filesQ, (snapshot) => {
      setFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Error fetching files: ", err);
      setLoading(false);
    });

    return () => {
      unsubscribeFolders();
      unsubscribeFiles();
    };
  }, [uid]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  const FILE_LIMIT = 5;
  const isLimitReached = !isPremium && files.length >= FILE_LIMIT;

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, `users/${uid}/folders`), {
        name: folderName.trim(),
        createdAt: serverTimestamp()
      });
      setIsFolderModalOpen(false);
      setFolderName('');
    } catch (err) {
      console.error("Error creating folder: ", err);
      alert("Failed to create folder.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddFile = async (e) => {
    e.preventDefault();
    if (!fileData.file || !uid) {
      setUploadError("Please select a file.");
      return;
    }

    setSaving(true);
    setUploadProgress(10);
    setUploadError('');

    try {
      const file = fileData.file;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uid', uid);
      
      setUploadProgress(30);

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to upload to Cloudinary");
      }

      setUploadProgress(70);

      // Save the metadata to Firestore with specified fields
      await addDoc(collection(db, `users/${uid}/files`), {
        name: file.name,
        storagePath: result.fileId, // This is the Cloudinary public_id
        downloadURL: result.url,   // This is the Cloudinary secure_url
        size: file.size,           // bytes
        type: result.resource_type === 'image' ? (result.format || 'image') : result.resource_type,
        folderId: fileData.folderId || null,
        createdAt: serverTimestamp(),
      });
      
      setUploadProgress(100);
      setTimeout(() => {
        setIsFileModalOpen(false);
        setFileData({ file: null, folderId: '' });
        setUploadProgress(0);
        showToast(`"${file.name}" uploaded successfully!`);
      }, 500);

    } catch (err) {
      console.error("Error adding file: ", err);
      setUploadError(err.message || "Failed to upload file. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (file) => {
    const url = file.downloadURL || file.url || file.driveWebViewLink;
    if (!url) {
      alert("Download URL not found for this file.");
      return;
    }
    // Safely trigger download in a new tab
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteFile = (file) => {
    setFileToDelete(file);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete || deleting) return;
    
    setDeleting(true);
    try {
      const file = fileToDelete;
      // Support older field names for backward compatibility
      const publicId = file.storagePath || file.fileId || file.driveFileId;
      
      if (!publicId) {
        throw new Error("Cloud Storage ID not found. Manual deletion required.");
      }

      // 1. Delete from Cloudinary via Backend
      const response = await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          publicId: publicId,
          resourceType: file.type === 'image' || file.mimeType?.startsWith('image') ? 'image' : 'raw'
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Cloud storage deletion failed");
      }

      // 2. Delete from Firestore
      await deleteDoc(doc(db, `users/${uid}/files`, file.id));
      
      setIsDeleteModalOpen(false);
      setFileToDelete(null);
      showToast(`"${file.name}" deleted.`);
    } catch (err) {
      console.error("Delete Error:", err);
      alert(err.message || "Failed to delete file.");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpgrade = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), {
        plan: 'pro'
      });
      setIsUpgradeModalOpen(false);
    } catch (err) {
      console.error("Upgrade Error:", err);
      alert("Failed to upgrade. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-panel rounded-xl shadow-sm border border-main overflow-hidden flex flex-col h-full md:col-span-2 relative">
      {/* Toast Notification */}
      {toast.visible && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[110] px-4 py-2 rounded-xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-4 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="bg-white/20 p-1 rounded-lg">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          </div>
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      <div className="px-6 py-5 border-b border-main flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
        <h3 className="text-xl font-semibold flex items-center">
          <Folder className="w-5 h-5 mr-2 text-yellow-500" />
          My Files
          <span className={`ml-3 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center ${
            isPremium 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
          }`}>
            {isPremium ? <Crown className="w-3 h-3 mr-1" /> : null}
            {isPremium ? 'Pro Plan' : `Free (Limit: ${files.length}/${FILE_LIMIT})`}
          </span>
        </h3>
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsFolderModalOpen(true)}
            className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2 px-3 rounded-xl shadow-sm transition flex items-center"
          >
            <FolderPlus className="w-4 h-4 mr-1.5" /> New Folder
          </button>
          
          {isLimitReached ? (
            <button 
              onClick={() => setIsUpgradeModalOpen(true)}
              className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg transition flex items-center"
            >
              <Crown className="w-4 h-4 mr-1.5" /> Upgrade to Pro
            </button>
          ) : (
            <button 
              onClick={() => setIsFileModalOpen(true)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg transition flex items-center"
            >
              <UploadCloud className="w-4 h-4 mr-1.5" /> Add File
            </button>
          )}
        </div>
      </div>

      {isLimitReached && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center text-amber-700 dark:text-amber-400 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 mr-2" />
            You’ve reached the free plan limit (5 files). Please upgrade or delete files to add more.
          </div>
        </div>
      )}
      
      <div className="p-6 flex-1 overflow-y-auto min-h-[300px] bg-panel">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        ) : (folders.length > 0 || files.length > 0) ? (
          <div className="space-y-6">
            {/* Folders Section */}
            {folders.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Folders</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {folders.map(folder => (
                    <div key={folder.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-yellow-300 dark:hover:border-yellow-700 transition cursor-pointer group">
                      <Folder className="w-6 h-6 text-yellow-400 mr-3 group-hover:scale-110 transition-transform" />
                      <span className="font-medium text-sm truncate">{folder.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files Section */}
            {files.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Files</h4>
                <ul className="divide-y divide-main border border-main rounded-xl overflow-hidden">
                  {files.map(file => {
                    const parentFolder = folders.find(f => f.id === file.folderId);
                    return (
                      <li key={file.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition">
                        <div className="flex items-center space-x-3 truncate">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                            <p className="text-xs font-medium text-gray-400 capitalize">
                              {parentFolder ? `${parentFolder.name} • ` : ''}{file.type} • {formatSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="text-xs text-gray-400 whitespace-nowrap ml-2">
                            {file.createdAt?.toDate ? new Date(file.createdAt.toDate()).toLocaleDateString() : 'Pending'}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-8">
            <div className="w-16 h-16 bg-white border-2 border-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Folder className="w-8 h-8 text-yellow-400 dark:text-gray-500" />
            </div>
            <p className="mb-2">Your vault is empty.</p>
            <p className="text-sm opacity-70">Add files and folders to keep your resources organized.</p>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      <Modal 
        isOpen={isFolderModalOpen} 
        onClose={() => setIsFolderModalOpen(false)} 
        title="Create New Folder"
        onSubmit={handleCreateFolder}
        submitText="Create Folder"
        loading={saving}
      >
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Folder Name</label>
          <input 
            type="text" 
            required
            disabled={saving}
            placeholder="e.g. Past Year Papers"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
          />
        </div>
      </Modal>

      <Modal 
        isOpen={isFileModalOpen} 
        onClose={() => {
          if (!saving) {
            setIsFileModalOpen(false);
            setUploadError('');
            setUploadProgress(0);
          }
        }} 
        title="Upload File"
        onSubmit={handleAddFile}
        submitText={isLimitReached ? "Limit Reached" : (saving ? "Uploading..." : "Start Upload")}
        loading={saving || isLimitReached}
      >
        <div className="space-y-5">
          {/* File Picker */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Select Document or Image</label>
            <div 
              onClick={() => !saving && fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
                ${fileData.file 
                  ? 'border-yellow-400 bg-yellow-50/30 dark:bg-yellow-900/10' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-yellow-400 bg-gray-50/50 dark:bg-gray-800/30'}
              `}
            >
              <input 
                ref={fileInputRef}
                type="file"
                className="hidden"
                disabled={saving}
                onChange={(e) => {
                  setFileData({ ...fileData, file: e.target.files?.[0] || null });
                  setUploadError('');
                }}
              />
              <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${fileData.file ? 'text-yellow-500' : 'text-gray-400'}`} />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {fileData.file ? fileData.file.name : 'Click to browse files'}
              </p>
              {fileData.file && (
                <p className="text-xs text-gray-400 mt-1">{formatSize(fileData.file.size)}</p>
              )}
            </div>
          </div>

          {/* Folder Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Target Folder (Optional)</label>
            <select
              disabled={saving}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm appearance-none"
              value={fileData.folderId}
              onChange={(e) => setFileData({...fileData, folderId: e.target.value})}
            >
              <option value="">Root directory</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {uploadError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-xs">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {isLimitReached && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Limit Reached! Upgrade to Premium to add more files.</span>
            </div>
          )}

          {/* Progress Bar */}
          {saving && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <span>Uploading to Cloud...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Upgrade Plan Modal */}
      <Modal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => !saving && setIsUpgradeModalOpen(false)} 
        title="Upgrade your plan"
        onSubmit={(e) => { e.preventDefault(); handleUpgrade(); }}
        submitText={saving ? "Upgrading..." : "I've Paid - Confirm"}
        loading={saving}
      >
        <div className="space-y-6 text-center py-2">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
            <Crown className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black">Go Unlimited</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Unlock unlimited file uploads, folders, and premium features for your mock exam journey.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Pay via UPI</p>
            <div className="flex items-center justify-center space-x-3 text-lg font-black text-blue-600 dark:text-blue-400">
              <Smartphone className="w-5 h-5" />
              <span>adityagaurav1122@okhdfcbank</span>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Scan our code or use the ID above. After payment, click the button below to activate your Pro plan instantly.
            </p>
          </div>

          <button 
            type="button"
            onClick={() => setIsUpgradeModalOpen(false)}
            className="text-sm font-bold text-gray-400 hover:text-gray-600 transition"
          >
            Maybe later
          </button>
        </div>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete File"
          onSubmit={(e) => { e.preventDefault(); confirmDeleteFile(); }}
          submitText="Delete From Cloud"
          loading={deleting}
        >
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete <span className="font-bold text-gray-800 dark:text-gray-200">"{fileToDelete?.name}"</span>?
            </p>
            <p className="text-xs text-red-500/70 mt-3 font-medium">
              This will permanently remove the file from Cloudinary storage and Firestore.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MyFiles;

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Folder, FileText, ExternalLink, UploadCloud, FolderPlus } from 'lucide-react';
import Modal from './Modal';
import { apiFetch } from '../lib/api';

const MyFiles = ({ uid }) => {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [folderName, setFolderName] = useState('');
  const [fileData, setFileData] = useState({ file: null, folderId: '' });

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
    if (!fileData.file) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('upload', fileData.file);
      formData.append('owner_uid', uid);

      const uploadResponse = await apiFetch('/api/storage/google-drive/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorPayload = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorPayload.detail || 'Failed to upload file to Google Drive.');
      }

      const uploadData = await uploadResponse.json();
      await addDoc(collection(db, `users/${uid}/files`), {
        name: uploadData.drive_name,
        folderId: fileData.folderId || null,
        size: uploadData.size ? `${(Number(uploadData.size) / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
        mimeType: uploadData.mime_type || fileData.file.type || 'application/octet-stream',
        driveFileId: uploadData.drive_file_id,
        driveWebViewLink: uploadData.web_view_link || '',
        driveWebContentLink: uploadData.web_content_link || '',
        createdAt: serverTimestamp(),
      });
      setIsFileModalOpen(false);
      setFileData({ file: null, folderId: '' });
    } catch (err) {
      console.error("Error adding file: ", err);
      alert(err.message || "Failed to add file.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-panel rounded-xl shadow-sm border border-main overflow-hidden flex flex-col h-full md:col-span-2">
      <div className="px-6 py-5 border-b border-main flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
        <h3 className="text-xl font-semibold flex items-center">
          <Folder className="w-5 h-5 mr-2 text-yellow-500" />
          My Files
          <span className="ml-3 text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full">
            {folders.length} Folders, {files.length} Files
          </span>
        </h3>
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsFolderModalOpen(true)}
            className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-1.5 px-3 rounded-lg shadow-sm transition flex items-center"
          >
            <FolderPlus className="w-4 h-4 mr-1" /> New Folder
          </button>
          <button 
            onClick={() => setIsFileModalOpen(true)}
            className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-1.5 px-3 rounded-lg shadow-sm transition flex items-center"
          >
            <UploadCloud className="w-4 h-4 mr-1" /> Add File
          </button>
        </div>
      </div>
      
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
                            <p className="text-xs font-medium text-gray-400">
                              {parentFolder ? `In ${parentFolder.name}` : 'Root directory'} • {file.size}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          {file.driveWebViewLink ? (
                            <a
                              href={file.driveWebViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1" />
                              Open
                            </a>
                          ) : null}
                          <div className="text-xs text-gray-400 whitespace-nowrap">
                            {file.createdAt?.toDate ? new Date(file.createdAt.toDate()).toLocaleDateString() : 'Just now'}
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
            <div className="w-16 h-16 bg-yellow-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Folder className="w-8 h-8 text-yellow-300 dark:text-gray-500" />
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

      {/* Add File Modal */}
      <Modal 
        isOpen={isFileModalOpen} 
        onClose={() => setIsFileModalOpen(false)} 
        title="Upload File Metadata"
        onSubmit={handleAddFile}
        submitText="Save Options"
        loading={saving}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Choose File</label>
            <input 
              type="file"
              required
              disabled={saving}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm"
              onChange={(e) => setFileData({ ...fileData, file: e.target.files?.[0] || null })}
            />
            <p className="mt-2 text-xs text-gray-400">
              The uploaded file will be stored in the Google Drive connected to `adityastudy003@gmail.com` through the backend bridge.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Target Folder</label>
            <select
              disabled={saving}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm appearance-none"
              value={fileData.folderId}
              onChange={(e) => setFileData({...fileData, folderId: e.target.value})}
            >
              <option value="">Root directory (No folder)</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyFiles;

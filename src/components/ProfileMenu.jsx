import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LogOut, Settings, Crown } from 'lucide-react';
import { auth, db } from '../lib/firebase';

function getInitial(name, email) {
  const source = (name || email || 'A').trim();
  return source.charAt(0).toUpperCase();
}

function isPlaceholder(url) {
  return !url || url.includes('placehold.co') || url.includes('text=%2B');
}

export default function ProfileMenu({ user, setUser, isPremium, expiryDate, onPremiumClick }) {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    photoURL: user?.photoURL || '',
  });

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user?.uid) {
        setProfile({ displayName: '', email: '', photoURL: '' });
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, 'users', user.uid));
        if (!active) {
          return;
        }

        const data = snapshot.exists() ? snapshot.data() : {};
        setProfile({
          displayName: data.display_name || user.displayName || '',
          email: data.email || user.email || '',
          photoURL: data.profile_pic_url || user.photoURL || '',
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setProfile({
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
        });
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const initial = useMemo(
    () => getInitial(profile.displayName, profile.email),
    [profile.displayName, profile.email],
  );

  const handleLogout = async () => {
    await signOut(auth);
    setUser?.(null);
    navigate('/login');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-main bg-blue-600/10 text-sm font-black text-blue-700 transition hover:scale-105 hover:bg-blue-600/15 dark:text-blue-300"
        title="Open profile menu"
      >
        {!isPlaceholder(profile.photoURL) ? (
          <img src={profile.photoURL} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-50 w-56 rounded-2xl border border-main bg-panel p-2 shadow-2xl">
          <div className="border-b border-main px-3 py-2">
            <p className="truncate text-sm font-bold">
              {profile.displayName || 'Aspirant'}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {profile.email || 'Signed in'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/profile-setup');
            }}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Settings className="h-4 w-4" />
            <span>Setting</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onPremiumClick();
            }}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition-all ${
              isPremium 
              ? 'text-blue-600 bg-blue-50 dark:bg-violet-900/20 dark:text-violet-400 hover:bg-blue-100 dark:hover:bg-violet-900/40' 
              : 'text-blue-700 bg-blue-50/50 dark:bg-amber-900/20 dark:text-amber-400 hover:bg-blue-100 dark:hover:bg-amber-900/40'
            }`}
          >
            <Crown className={`h-4 w-4 ${isPremium ? 'text-blue-500 dark:text-violet-500' : 'text-blue-600 dark:text-amber-500'}`} />
            <span>{isPremium ? 'Premium Active' : 'Get Premium'}</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Check, CheckCircle2, ChevronDown, Loader2, Plus, XCircle } from 'lucide-react';
import { auth, db, storage } from '../lib/firebase';

function normalizeUsername(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [error, setError] = useState('');
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    bio: '',
    website: '',
    gender: 'Prefer not to say',
  });
  const [initialUsername, setInitialUsername] = useState('');

  const normalizedUsername = useMemo(() => normalizeUsername(formData.username), [formData.username]);
  const usernameValidated = normalizedUsername.length >= 3 && (usernameStatus === 'available' || normalizedUsername === initialUsername);
  const profileInitial = (formData.fullName || auth.currentUser?.email || 'A').trim().charAt(0).toUpperCase();

  useEffect(() => {
    let active = true;

    async function hydrateProfile() {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!active || !userDoc.exists()) {
          return;
        }

        const data = userDoc.data();
        const storedUsername = data.username || '';

        setFormData({
          fullName: data.display_name || currentUser.displayName || '',
          username: storedUsername,
          bio: data.bio || '',
          website: data.website || '',
          gender: data.gender || 'Prefer not to say',
        });
        setInitialUsername(storedUsername);
        setProfilePreview(data.profile_pic_url || '');
      } catch (loadError) {
        if (active) {
          setError('Could not load your profile details.');
        }
      }
    }

    hydrateProfile();

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    let isActive = true;
    if (normalizedUsername.length < 3) {
      setUsernameStatus('idle');
      return undefined;
    }

    if (normalizedUsername === initialUsername) {
      setUsernameStatus('available');
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const usernameQuery = query(collection(db, 'users'), where('username', '==', normalizedUsername));
        const snapshot = await getDocs(usernameQuery);
        if (!isActive) {
          return;
        }
        setUsernameStatus(snapshot.empty ? 'available' : 'taken');
      } catch (queryError) {
        if (isActive) {
          setUsernameStatus('error');
        }
      }
    }, 350);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [initialUsername, normalizedUsername]);

  useEffect(() => {
    if (!toastVisible) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      navigate('/home');
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [navigate, toastVisible]);

  const updateField = (field, value) => {
    setError('');
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setProfilePicFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!usernameValidated || loading) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigate('/login');
        return;
      }

      let profilePicUrl = profilePreview;
      if (profilePicFile) {
        const imageRef = ref(storage, `users/${currentUser.uid}/profile-photo/${profilePicFile.name}`);
        await uploadBytes(imageRef, profilePicFile);
        profilePicUrl = await getDownloadURL(imageRef);
      }

      const profilePayload = {
        display_name: formData.fullName.trim(),
        username: normalizedUsername,
        bio: formData.bio.trim(),
        website: formData.website.trim(),
        gender: formData.gender,
        profile_pic_url: profilePicUrl || 'https://placehold.co/160x160/121212/ffffff?text=%2B',
      };

      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          email: currentUser.email || '',
          created_at: new Date().toISOString(),
          ...profilePayload,
        },
        { merge: true },
      );

      await updateDoc(doc(db, 'users', currentUser.uid), profilePayload);
      setToastVisible(true);
    } catch (submitError) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="profile-setup-shell">
      <div className="profile-setup-toast-wrap">
        {toastVisible ? (
          <div className="profile-toast">
            <Check className="h-4 w-4" />
            <span>Profile Updated!</span>
          </div>
        ) : null}
      </div>

      <section className="profile-setup-card">
        <header className="profile-setup-header">
          <div>
            <p className="profile-setup-eyebrow">Settings</p>
            <h1>Profile Details</h1>
            <p className="profile-setup-subtitle">
              Keep your NIMCET account polished and ready for every mock test session.
            </p>
          </div>
          <button type="button" onClick={() => navigate('/home')} className="profile-skip-button">
            Back to dashboard
          </button>
        </header>

        <form onSubmit={handleSubmit} className="profile-setup-form">
          <div className="profile-hero-card">
            <div className="profile-avatar-block">
              <label className="profile-avatar-uploader">
                {profilePreview ? (
                  <img src={profilePreview} alt="Profile preview" className="profile-avatar-image" />
                ) : (
                  <div className="profile-avatar-placeholder">
                    <span>{profileInitial}</span>
                  </div>
                )}
                <span className="profile-avatar-plus">
                  <Plus className="h-4 w-4" />
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              <div className="profile-avatar-copy">
                <h2>{formData.fullName || 'Your profile'}</h2>
                <p>{normalizedUsername ? `@${normalizedUsername}` : 'Add a recognizable profile for your mock journey.'}</p>
                <button type="button" className="profile-photo-link">
                  Change Profile Photo
                </button>
              </div>
            </div>

            <div className="profile-hero-stats">
              <div className="profile-mini-stat">
                <span>Status</span>
                <strong>{usernameValidated ? 'Ready' : 'Editing'}</strong>
              </div>
              <div className="profile-mini-stat">
                <span>Bio</span>
                <strong>{formData.bio.length}/150</strong>
              </div>
            </div>
          </div>

          <div className="profile-settings-grid">
            <div className="profile-settings-section">
              <div className="profile-section-heading">
                <h3>Public Identity</h3>
                <p>This is what other collaborators and your dashboard surface will show.</p>
              </div>

              <label className="auth-field">
                <span>Full Name</span>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  placeholder="Full Name"
                  autoComplete="name"
                />
              </label>

              <label className="auth-field">
                <span>Username</span>
                <div className="auth-password-wrap">
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(event) => updateField('username', event.target.value)}
                    placeholder="Username"
                    autoComplete="off"
                  />
                  <div className="auth-status-icon" aria-live="polite">
                    {usernameStatus === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {usernameStatus === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : null}
                    {usernameStatus === 'taken' ? <XCircle className="h-4 w-4 text-red-400" /> : null}
                  </div>
                </div>
              </label>

              <p className={`auth-helper-text ${usernameValidated ? 'is-ready' : ''}`}>
                {usernameStatus === 'checking' && 'Checking availability...'}
                {usernameStatus === 'taken' && 'That username is already taken.'}
                {usernameStatus === 'error' && 'Could not check username availability.'}
                {usernameValidated && `@${normalizedUsername} is ready to go.`}
                {usernameStatus === 'idle' && 'Validate your username before continuing.'}
              </p>
            </div>

            <div className="profile-settings-section">
              <div className="profile-section-heading">
                <h3>Personal Details</h3>
                <p>Add supporting details to make your profile feel complete.</p>
              </div>

              <label className="auth-field">
                <span>Bio</span>
                <div className="profile-textarea-wrap">
                  <textarea
                    value={formData.bio}
                    onChange={(event) => updateField('bio', event.target.value.slice(0, 150))}
                    placeholder="Write a short bio"
                    rows="4"
                  />
                  <p>{formData.bio.length}/150</p>
                </div>
              </label>

              <label className="auth-field">
                <span>Website or portfolio</span>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(event) => updateField('website', event.target.value)}
                  placeholder="https://your-site.com"
                  autoComplete="url"
                />
              </label>

              <label className="auth-field">
                <span>Gender</span>
                <div className="profile-select-wrap">
                  <select value={formData.gender} onChange={(event) => updateField('gender', event.target.value)}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Custom</option>
                    <option>Prefer not to say</option>
                  </select>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </label>
            </div>
          </div>

          {error ? <div className="auth-alert">{error}</div> : null}

          <div className="profile-actions">
            <button type="button" onClick={() => navigate('/home')} className="profile-secondary-button">
              Cancel
            </button>
            <button type="submit" disabled={!usernameValidated || loading} className="auth-primary-button">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

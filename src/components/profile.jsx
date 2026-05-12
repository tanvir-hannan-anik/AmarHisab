// ─────────────────────────────────────────────────────────────────────────────
// Components / Profile
//
//   - Avatar        circular avatar with photo or initials fallback
//   - ProfileCard   the rich profile section used in SettingsScreen
//   - SidebarProfile compact chip at the top of the sidebar (drives auth state)
//
// Photo uploads are resized client-side to a 256px JPEG (~30-60KB) and stored
// as base64 inside settings.photoBase64. When signed in, the photo and name
// also mirror to Firestore via App.jsx's settings effect.
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateProf, useRef: useRefProf, useEffect: useEffectProf } = React;

// Public API exposed via window.AHProfile so non-React callers can reuse the
// resize routine if they ever need to.
async function ahResizeImage(file, max = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ফাইল পড়া যায়নি'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ছবি লোড করা যায়নি'));
      img.onload = () => {
        const ratio = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          reject(e);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function ahInitials(name) {
  if (!name) return '🙂';
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0] && parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first || '') + (last || '');
}

// Display priority: uploaded photoBase64 → provider photoURL (Google) → initials.
// referrerPolicy="no-referrer" is required by some Google CDN tiers to avoid
// 403s on lh3.googleusercontent.com when the page isn't on a Google domain.
function Avatar({ name, photoBase64, photoURL, size = 56, onClick, className = '' }) {
  const base = {
    width: size, height: size, borderRadius: '50%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  };
  const src = photoBase64 || photoURL;
  if (src) {
    return (
      <span
        className={'ah-avatar ' + className}
        style={{ ...base, overflow: 'hidden', cursor: onClick ? 'pointer' : 'default' }}
        onClick={onClick}
      >
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      </span>
    );
  }
  return (
    <span
      className={'ah-avatar ah-avatar-fallback ' + className}
      style={{ ...base, cursor: onClick ? 'pointer' : 'default', fontSize: Math.round(size * 0.36), fontWeight: 700 }}
      onClick={onClick}
      aria-hidden="false"
    >
      {ahInitials(name)}
    </span>
  );
}

// ── ProfileCard ─────────────────────────────────────────────────────────────
function ProfileCard({ settings, onSave, onOpenAuth, onSignOut }) {
  const [name, setName] = useStateProf(settings.name || '');
  const [photo, setPhoto] = useStateProf(settings.photoBase64 || '');
  const [dirty, setDirty] = useStateProf(false);
  const [busy, setBusy] = useStateProf(false);
  const fileRef = useRefProf(null);

  useEffectProf(() => {
    setName(settings.name || '');
    setPhoto(settings.photoBase64 || '');
    setDirty(false);
  }, [settings.name, settings.photoBase64]);

  const pickPhoto = () => { if (fileRef.current) fileRef.current.click(); };

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      window.toast.error('শুধুমাত্র ছবি ফাইল আপলোড করা যাবে');
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      window.toast.error('ছবির সাইজ ৮MB-এর কম হতে হবে');
      return;
    }
    try {
      setBusy(true);
      const dataUrl = await ahResizeImage(f, 256, 0.85);
      setPhoto(dataUrl);
      setDirty(true);
    } catch (err) {
      window.toast.error(err.message || 'ছবি প্রক্রিয়াকরণে সমস্যা হয়েছে');
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = () => {
    setPhoto('');
    setDirty(true);
  };

  const save = async () => {
    if (!name.trim()) {
      window.toast.error('নাম খালি রাখা যাবে না');
      return;
    }
    setBusy(true);
    try {
      await onSave({ name: name.trim(), photoBase64: photo });
      setDirty(false);
      window.toast.success('প্রোফাইল সংরক্ষণ হয়েছে');
    } catch (err) {
      window.toast.error('প্রোফাইল সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setBusy(false);
    }
  };

  const isGuest = !!settings.isGuest;

  return (
    <div className="ah-card ah-profile-card">
      <div className="ah-card-head">
        <div>
          <div className="ah-card-title">প্রোফাইল</div>
          <div className="ah-card-sub">
            {isGuest ? 'অতিথি মোড — লগইন না করেও ব্যবহার করতে পারেন' : 'ক্লাউডে সংরক্ষিত হচ্ছে'}
          </div>
        </div>
        <span className={'ah-profile-badge ' + (isGuest ? 'guest' : 'cloud')}>
          <span className="dot"/>
          {isGuest ? 'অতিথি' : 'সংযুক্ত'}
        </span>
      </div>

      <div className="ah-profile-row">
        <div className="ah-profile-avatar-wrap">
          <Avatar name={name} photoBase64={photo} photoURL={settings.photoURL} size={92} onClick={pickPhoto}/>
          <button type="button" className="ah-profile-avatar-edit" onClick={pickPhoto} disabled={busy} aria-label="ছবি পরিবর্তন">
            <Icon name="edit" size={12}/>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            style={{display: 'none'}}
          />
        </div>
        <div className="ah-profile-avatar-actions">
          <button type="button" className="ah-btn ah-btn-ghost" onClick={pickPhoto} disabled={busy}>
            <Icon name="edit" size={14}/> {(photo || settings.photoURL) ? 'ছবি পরিবর্তন' : 'ছবি যোগ করুন'}
          </button>
          {photo && (
            <button type="button" className="ah-btn ah-btn-ghost" onClick={removePhoto} disabled={busy}>
              <Icon name="trash" size={14}/> সরান
            </button>
          )}
          <div className="ah-profile-avatar-hint">
            {settings.photoURL && !photo
              ? 'Google থেকে আনা ছবি দেখানো হচ্ছে — পরিবর্তন করতে নিজের ছবি আপলোড করুন'
              : 'JPEG · সর্বোচ্চ ৮MB · ২৫৬px-এ রিসাইজ হবে'}
          </div>
        </div>
      </div>

      <div className="ah-field">
        <label className="ah-field-label">নাম</label>
        <input
          className="ah-input"
          value={name}
          maxLength={60}
          onChange={e => { setName(e.target.value); setDirty(true); }}
          placeholder="আপনার নাম"
        />
      </div>

      {!isGuest && (
        <div className="ah-field">
          <label className="ah-field-label">ইমেইল</label>
          <input className="ah-input" value={settings.email || ''} disabled readOnly/>
          <div className="ah-field-hint">ইমেইল পরিবর্তন করতে অ্যাকাউন্ট সেটিংস থেকে রিসেট করুন</div>
        </div>
      )}

      <div className="ah-profile-actions">
        <div className="ah-profile-actions-l">
          {isGuest ? (
            <>
              <button className="ah-btn ah-btn-primary" onClick={() => onOpenAuth('login')}>
                <Icon name="check" size={14}/> লগইন করুন
              </button>
              <button className="ah-btn ah-btn-ghost" onClick={() => onOpenAuth('signup')}>
                নতুন অ্যাকাউন্ট
              </button>
            </>
          ) : (
            <button className="ah-btn ah-btn-ghost" onClick={onSignOut}>
              <Icon name="arrow-right" size={14}/> সাইন আউট
            </button>
          )}
        </div>
        <button className="ah-btn ah-btn-primary" onClick={save} disabled={!dirty || busy}>
          {busy ? 'অপেক্ষা…' : 'সংরক্ষণ করুন'}
        </button>
      </div>
    </div>
  );
}

// ── SidebarProfile (compact entry point for the left rail) ──────────────────
function SidebarProfile({ settings, onOpenAuth, onOpenSettings }) {
  const isGuest = !!settings.isGuest;
  return (
    <button type="button" className="ah-side-profile" onClick={onOpenSettings} title="প্রোফাইল">
      <Avatar name={settings.name} photoBase64={settings.photoBase64} photoURL={settings.photoURL} size={36}/>
      <div className="ah-side-profile-body">
        <div className="ah-side-profile-name">{settings.name || 'অতিথি'}</div>
        <div className="ah-side-profile-sub">
          {isGuest ? 'অতিথি মোড' : (settings.email || 'সংযুক্ত')}
        </div>
      </div>
      {isGuest && (
        <span
          className="ah-side-profile-cta"
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onOpenAuth('login'); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOpenAuth('login'); }
          }}
        >
          লগইন
        </span>
      )}
    </button>
  );
}

window.Avatar = Avatar;
window.ProfileCard = ProfileCard;
window.SidebarProfile = SidebarProfile;
window.AHProfile = { resizeImage: ahResizeImage, initials: ahInitials };

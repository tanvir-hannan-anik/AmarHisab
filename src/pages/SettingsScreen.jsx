// ─────────────────────────────────────────────────────────────────────────────
// Pages / SettingsScreen
//
// Four sections in order:
//   1. প্রোফাইল         — name + email
//   2. থিম রঙ           — palette picker
//   3. নোটিফিকেশন      — toggle preferences
//   4. ডেটা ব্যবস্থাপনা — reset / clear all
//
// Every save merges with fresh stored settings to avoid stale-state clobbering
// when another part of the UI (e.g. the Tweaks panel) writes to settings too.
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateSet } = React;

const PALETTE_OPTIONS = [
  ['#1F6FB2', '#4FB38A', '#DCEBF8'],
  ['#5B3FA8', '#C99A2A', '#E7DFF6'],
  ['#0E7C5C', '#D9737B', '#D6F0E5'],
  ['#D9633A', '#3F8FA8', '#FCE2D4'],
];

function SettingToggleRow({ title, sub, on, onChange }) {
  return (
    <div className="ah-setting-row">
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontSize: 14, fontWeight: 600, color: 'var(--fg-1)'}}>{title}</div>
        <div style={{fontSize: 12, color: 'var(--fg-3)', marginTop: 2}}>{sub}</div>
      </div>
      <button type="button"
        className="ah-switch"
        data-on={on ? '1' : '0'}
        role="switch"
        aria-checked={!!on}
        onClick={onChange}
      ><i/></button>
    </div>
  );
}

function SettingsScreen({ setState, palette, setPalette, settings: settingsProp, saveProfile: saveProfileProp, openAuthModal, handleSignOut }) {
  // Prefer the app-level settings (kept in sync with auth state) when provided,
  // but fall back to a local copy so this screen still works in isolation.
  const [localSettings, setSettings] = useStateSet(() => settingsProp || AHStorage.loadSettings());
  const settings = settingsProp || localSettings;

  const toggle = (k) => {
    const fresh = AHStorage.loadSettings();
    const next = { ...fresh, [k]: !fresh[k] };
    setSettings(next);
    AHStorage.saveSettings(next);
  };

  const paletteKey = JSON.stringify(palette || []);

  const handleReset = async () => {
    const ok = await window.confirmDialog({
      title: 'ডেটা রিসেট',
      message: 'সব হিসাব, দেনা-পাওনা ও বাজেট মুছে গিয়ে শূন্য থেকে শুরু হবে। এই কাজ ফেরানো যাবে না।',
      okLabel: 'রিসেট করুন',
      tone: 'danger',
    });
    if (!ok) return;
    AHStorage.resetAll([], [], 0);
    setState(s => ({ ...s, txs: [], debts: [], budget: 0, catBudgets: {} }));
    window.toast.success('ডেটা রিসেট হয়েছে');
  };

  const handleClear = async () => {
    const ok = await window.confirmDialog({
      title: 'সব ডেটা মুছুন',
      message: 'আপনার সব ব্যক্তিগত ডেটা মুছে যাবে। নিশ্চিত?',
      okLabel: 'মুছে ফেলুন',
      tone: 'danger',
    });
    if (!ok) return;
    AHStorage.resetAll([], [], 0);
    setState(s => ({ ...s, txs: [], debts: [], budget: 0, catBudgets: {} }));
    window.toast.success('সব ডেটা মুছে ফেলা হয়েছে');
  };

  return (
    <div className="ah-content-inner">
      <ProfileCard
        settings={settings}
        onSave={saveProfileProp || (async ({ name, photoBase64 }) => {
          const fresh = AHStorage.loadSettings();
          const next = { ...fresh, name, photoBase64 };
          setSettings(next);
          AHStorage.saveSettings(next);
        })}
        onOpenAuth={openAuthModal || (() => window.toast.info('লগইন উপলব্ধ নয়'))}
        onSignOut={handleSignOut || (() => {})}
      />

      <div className="ah-card" style={{marginTop: 20}}>
        <div className="ah-card-head">
          <div>
            <div className="ah-card-title">থিম রঙ</div>
            <div className="ah-card-sub">আপনার পছন্দের প্যালেট বাছুন</div>
          </div>
        </div>
        <div className="ah-palette-grid">
          {PALETTE_OPTIONS.map((opt, i) => {
            const selected = JSON.stringify(opt) === paletteKey;
            return (
              <button
                key={i}
                type="button"
                className={'ah-palette-card ' + (selected ? 'active' : '')}
                onClick={() => setPalette && setPalette(opt)}
                aria-label={'প্যালেট ' + toBn(i + 1)}
                aria-pressed={selected}
                title={opt.join(' · ')}
              >
                <div className="ah-palette-stripe">
                  {opt.map((c, j) => <span key={j} style={{background: c}}/>)}
                </div>
                {selected && (
                  <div className="ah-palette-check" aria-hidden="true">
                    <Icon name="check" size={14}/>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ah-card" style={{marginTop: 20}}>
        <div className="ah-card-head">
          <div>
            <div className="ah-card-title">নোটিফিকেশন</div>
            <div className="ah-card-sub">কখন আমরা আপনাকে জানাব</div>
          </div>
        </div>
        <SettingToggleRow
          title="বাজেট সতর্কতা"
          sub="বাজেটের ৮০% খরচ হলে জানাব"
          on={settings.notifyBudget}
          onChange={() => toggle('notifyBudget')}
        />
        <SettingToggleRow
          title="দেনা-পাওনা স্মরণ"
          sub="সাত দিনের বেশি পুরোনো ধার মনে করিয়ে দেব"
          on={settings.notifyDebt}
          onChange={() => toggle('notifyDebt')}
        />
      </div>

      <div className="ah-card" style={{marginTop: 20}}>
        <div className="ah-card-head">
          <div>
            <div className="ah-card-title">ডেটা ব্যবস্থাপনা</div>
            <div className="ah-card-sub">আপনার সংরক্ষিত তথ্য পরিচালনা</div>
          </div>
        </div>
        <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
          <button className="ah-btn ah-btn-ghost" onClick={handleReset}>
            <Icon name="settings" size={14}/> ডেটা রিসেট
          </button>
          <button className="ah-btn ah-btn-danger" onClick={handleClear}>
            <Icon name="trash" size={14}/> সব ডেটা মুছুন
          </button>
        </div>
      </div>
    </div>
  );
}

window.SettingsScreen = SettingsScreen;

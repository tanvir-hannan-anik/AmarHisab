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

  const lang = settings.lang || 'bn';
  const s = window.AHStrings[lang] || window.AHStrings.bn;

  const toggle = (k) => {
    const fresh = AHStorage.loadSettings();
    const next = { ...fresh, [k]: !fresh[k] };
    setSettings(next);
    AHStorage.saveSettings(next);
  };

  const setLang = (newLang) => {
    const fresh = AHStorage.loadSettings();
    const next = { ...fresh, lang: newLang };
    setSettings(next);
    AHStorage.saveSettings(next);
  };

  const paletteKey = JSON.stringify(palette || []);

  const handleReset = async () => {
    const _s = window.AHStrings[settings.lang || 'bn'] || window.AHStrings.bn;
    const ok = await window.confirmDialog({
      title: _s.dlg_reset_title,
      message: _s.dlg_reset_msg,
      okLabel: _s.dlg_reset_ok,
      tone: 'danger',
    });
    if (!ok) return;
    AHStorage.resetAll([], [], 0);
    setState(prev => ({ ...prev, txs: [], debts: [], budget: 0, catBudgets: {} }));
    window.toast.success(_s.toast_reset);
  };

  const handleClear = async () => {
    const _s = window.AHStrings[settings.lang || 'bn'] || window.AHStrings.bn;
    const ok = await window.confirmDialog({
      title: _s.dlg_delete_title,
      message: _s.dlg_delete_msg,
      okLabel: _s.dlg_delete_ok,
      tone: 'danger',
    });
    if (!ok) return;
    AHStorage.resetAll([], [], 0);
    setState(prev => ({ ...prev, txs: [], debts: [], budget: 0, catBudgets: {} }));
    window.toast.success(_s.toast_deleted);
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
            <div className="ah-card-title">{s.set_theme_title}</div>
            <div className="ah-card-sub">{s.set_theme_sub}</div>
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
                aria-label={'Palette ' + (i + 1)}
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
            <div className="ah-card-title">{s.set_lang_title}</div>
            <div className="ah-card-sub">{s.set_lang_sub}</div>
          </div>
        </div>
        <div style={{display: 'flex', gap: 8, marginTop: 4}}>
          <button
            type="button"
            className={'ah-btn ' + (lang === 'bn' ? 'ah-btn-primary' : 'ah-btn-ghost')}
            onClick={() => setLang('bn')}
          >{s.set_lang_bn}</button>
          <button
            type="button"
            className={'ah-btn ' + (lang === 'en' ? 'ah-btn-primary' : 'ah-btn-ghost')}
            onClick={() => setLang('en')}
          >{s.set_lang_en}</button>
        </div>
      </div>

      <div className="ah-card" style={{marginTop: 20}}>
        <div className="ah-card-head">
          <div>
            <div className="ah-card-title">{s.set_notif_title}</div>
            <div className="ah-card-sub">{s.set_notif_sub}</div>
          </div>
        </div>
        <SettingToggleRow
          title={s.set_budget_alert}
          sub={s.set_budget_alert_sub}
          on={settings.notifyBudget}
          onChange={() => toggle('notifyBudget')}
        />
        <SettingToggleRow
          title={s.set_debt_remind}
          sub={s.set_debt_remind_sub}
          on={settings.notifyDebt}
          onChange={() => toggle('notifyDebt')}
        />
      </div>

      <div className="ah-card" style={{marginTop: 20}}>
        <div className="ah-card-head">
          <div>
            <div className="ah-card-title">{s.set_data_title}</div>
            <div className="ah-card-sub">{s.set_data_sub}</div>
          </div>
        </div>
        <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
          <button className="ah-btn ah-btn-ghost" onClick={handleReset}>
            <Icon name="settings" size={14}/> {s.set_data_reset}
          </button>
          <button className="ah-btn ah-btn-danger" onClick={handleClear}>
            <Icon name="trash" size={14}/> {s.set_data_delete}
          </button>
        </div>
      </div>
    </div>
  );
}

window.SettingsScreen = SettingsScreen;

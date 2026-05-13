// ─────────────────────────────────────────────────────────────────────────────
// App
//
// Root component. Holds top-level UI state (active tab, modal, drawer flags),
// loads all persisted data from AHStorage on mount, exposes save/edit/delete
// handlers, and wires palette changes through to live CSS variables.
//
// Page components are looked up on window — they self-register in their own
// files via `window.X = X`. Same for Sidebar / drawers / modals / widgets.
// ─────────────────────────────────────────────────────────────────────────────

const { useState, useEffect, useCallback } = React;

// ── Menu definitions — built at render time so they reflect the active language.
function buildNavItems(s) {
  return [
    { id: 'dashboard', label: s.nav_dashboard, icon: 'dashboard' },
    { id: 'history',   label: s.nav_history,   icon: 'list' },
    { id: 'debts',     label: s.nav_debts,      icon: 'handshake' },
    { id: 'budget',    label: s.nav_budget,     icon: 'target' },
  ];
}

function buildSecondaryNav(s) {
  return [
    { id: 'reports',   label: s.nav_reports,   icon: 'piechart' },
    { id: 'reminders', label: s.nav_reminders, icon: 'bell' },
    { id: 'settings',  label: s.nav_settings,  icon: 'settings' },
  ];
}

function buildScreenTitles(s, name) {
  const greeting = (s.welcome_prefix || '') + (name ? name.split(' ')[0] : '');
  return {
    dashboard: { eyebrow: s.screen_dashboard_eyebrow, title: greeting,                    sub: s.screen_dashboard_sub },
    history:   { eyebrow: s.screen_history_eyebrow,   title: s.screen_history_title,      sub: s.screen_history_sub },
    debts:     { eyebrow: s.screen_debts_eyebrow,     title: s.screen_debts_title,        sub: s.screen_debts_sub },
    budget:    { eyebrow: s.screen_budget_eyebrow,    title: s.screen_budget_title,       sub: s.screen_budget_sub },
    reports:   { eyebrow: s.screen_reports_eyebrow,   title: s.screen_reports_title,      sub: s.screen_reports_sub },
    reminders: { eyebrow: s.screen_reminders_eyebrow, title: s.screen_reminders_title,    sub: s.screen_reminders_sub },
    settings:  { eyebrow: s.screen_settings_eyebrow,  title: s.screen_settings_title,     sub: s.screen_settings_sub },
  };
}

function MonthLabel(lang) {
  const d = new Date();
  if (lang === 'en') {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[d.getMonth()]}, ${d.getFullYear()}`;
  }
  const months = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  return `${months[d.getMonth()]}, ${toBn(d.getFullYear())}`;
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#1F6FB2", "#4FB38A", "#DCEBF8"]
}/*EDITMODE-END*/;

// Each palette key (the hero color) maps to a full set of CSS variable values.
// Updating one key on `:root` cascades across the entire UI.
const PALETTE_MAP = {
  '#1F6FB2': { blue700: '#1F6FB2', blue900: '#0E3F6E', blue500: '#3B8FD9', blue100: '#DCEBF8', blue050: '#F2F8FD', mint700: '#4FB38A' },
  '#5B3FA8': { blue700: '#5B3FA8', blue900: '#3D2A75', blue500: '#7A5BC4', blue100: '#E7DFF6', blue050: '#F5F1FB', mint700: '#C99A2A' },
  '#0E7C5C': { blue700: '#0E7C5C', blue900: '#0A5841', blue500: '#1FA37C', blue100: '#D6F0E5', blue050: '#EFF9F4', mint700: '#D9737B' },
  '#D9633A': { blue700: '#D9633A', blue900: '#A14422', blue500: '#E88860', blue100: '#FCE2D4', blue050: '#FDF3EC', mint700: '#3F8FA8' },
};

function App() {
  // Seed tweak palette from persisted settings so the user's theme survives reload.
  const __initSettings = AHStorage.loadSettings();
  const [t, setTweak] = useTweaks({
    ...TWEAK_DEFAULTS,
    palette: __initSettings.palette || TWEAK_DEFAULTS.palette,
  });

  // Apply the active palette to CSS variables on every change.
  useEffect(() => {
    const key = Array.isArray(t.palette) ? t.palette[0] : t.palette;
    const p = PALETTE_MAP[key] || PALETTE_MAP['#1F6FB2'];
    const root = document.documentElement;
    root.style.setProperty('--brand-blue-700', p.blue700);
    root.style.setProperty('--brand-blue-900', p.blue900);
    root.style.setProperty('--brand-blue-500', p.blue500);
    root.style.setProperty('--brand-blue-100', p.blue100);
    root.style.setProperty('--brand-blue-050', p.blue050);
    root.style.setProperty('--brand-mint-700', p.mint700);
  }, [t.palette]);

  const monthLabel = MonthLabel(lang);

  // ── Persisted state ────────────────────────────────────────────────────────
  const [tab, setTab] = useState('dashboard');
  const [txs, setTxs] = useState(() => AHStorage.loadTxs(SAMPLE_TX));
  const [debts, setDebts] = useState(() => AHStorage.loadDebts(SAMPLE_DEBTS));
  const [budget, setBudgetState] = useState(() => AHStorage.loadBudget(0));
  const [catBudgets, setCatBudgetsState] = useState(() => AHStorage.loadCatBudgets());
  const [settings, setSettings] = useState(() => AHStorage.loadSettings());

  // ── Language-aware strings ─────────────────────────────────────────────────
  const lang = settings.lang || 'bn';
  window.AHLang = lang; // global so child components + format utils can read it
  const s = (window.AHStrings && window.AHStrings[lang]) || window.AHStrings.bn;
  const NAV_ITEMS      = buildNavItems(s);
  const SECONDARY_NAV  = buildSecondaryNav(s);
  const SCREEN_TITLES  = buildScreenTitles(s, settings.name);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [modal, setModal] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [editingTx, setEditingTx] = useState(null);
  const [editingDebt, setEditingDebt] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Stable refs so the Firebase auth listener (mounted once) can read the
  // latest local state when it migrates guest data into the user's account.
  const stateRef = React.useRef({ txs, debts, budget, catBudgets, settings });
  useEffect(() => { stateRef.current = { txs, debts, budget, catBudgets, settings }; },
    [txs, debts, budget, catBudgets, settings]);

  // Persist on data change.
  useEffect(() => { AHStorage.saveTxs(txs); }, [txs]);
  useEffect(() => { AHStorage.saveDebts(debts); }, [debts]);
  useEffect(() => { AHStorage.saveCatBudgets(catBudgets); }, [catBudgets]);

  // Pick up settings changes from anywhere (SettingsScreen, Tweaks panel, other tabs).
  useEffect(() => {
    const onChange = (e) => setSettings(e.detail || AHStorage.loadSettings());
    const onStorage = (e) => {
      if (e.key === AHStorage.KEYS.settings) setSettings(AHStorage.loadSettings());
    };
    window.addEventListener('ah:settings-change', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('ah:settings-change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // ── Firebase auth lifecycle ────────────────────────────────────────────────
  //
  // Subscribed once on mount. On sign-in, decides whether to pull cloud data
  // (cloud already has state) or push local data up (first sign-in — guest
  // data migration). On sign-out, flips the local profile back to guest mode
  // but keeps the user's data intact.
  useEffect(() => {
    if (!window.AHFirebase || !window.AHFirebase.isConfigured()) return;

    const applyCloudState = (data) => {
      if (!data) return;
      if (Array.isArray(data.txs))   { setTxs(data.txs); AHStorage.saveTxs(data.txs); }
      if (Array.isArray(data.debts)) { setDebts(data.debts); AHStorage.saveDebts(data.debts); }
      if (Number.isFinite(data.budget)) { setBudgetState(data.budget); AHStorage.saveBudget(data.budget); }
      if (data.catBudgets && typeof data.catBudgets === 'object') {
        setCatBudgetsState(data.catBudgets); AHStorage.saveCatBudgets(data.catBudgets);
      }
    };

    const onUser = async (user) => {
      if (user) {
        // Refresh profile fields from Firestore (or local fallback) and flip
        // out of guest mode.
        let cloudProfile = null;
        try { cloudProfile = await window.AHFirebase.loadProfile(user.uid); }
        catch (e) { console.warn('profile load failed', e); }

        const fresh = AHStorage.loadSettings();
        const next = {
          ...fresh,
          uid: user.uid,
          isGuest: false,
          email: user.email || fresh.email || '',
          name: (cloudProfile && cloudProfile.name) || user.displayName || fresh.name || '',
          photoBase64: (cloudProfile && cloudProfile.photoBase64) || fresh.photoBase64 || '',
          // Provider avatar (Google CDN URL). Used as fallback when the user
          // hasn't uploaded their own photoBase64.
          photoURL: user.photoURL || (cloudProfile && cloudProfile.photoURL) || '',
        };
        setSettings(next);
        AHStorage.saveSettings(next);

        // App state — cloud wins if it exists, otherwise migrate local up.
        let cloudState = null;
        try { cloudState = await window.AHFirebase.loadAppState(user.uid); }
        catch (e) { console.warn('app state load failed', e); }

        const cloudHasData = cloudState && (
          (Array.isArray(cloudState.txs) && cloudState.txs.length) ||
          (Array.isArray(cloudState.debts) && cloudState.debts.length) ||
          (cloudState.budget && cloudState.budget > 0)
        );

        if (cloudHasData) {
          applyCloudState(cloudState);
          window.toast.success('ক্লাউড থেকে ডেটা সিঙ্ক হয়েছে');
        } else {
          // First-time sign-in (or empty cloud): push current local data up.
          try {
            await window.AHFirebase.saveAppState(user.uid, stateRef.current);
            await window.AHFirebase.saveProfile(user.uid, {
              name: next.name, email: next.email,
              photoBase64: next.photoBase64, photoURL: next.photoURL,
            });
            const hadLocal = stateRef.current.txs.length || stateRef.current.debts.length || stateRef.current.budget > 0;
            if (hadLocal) window.toast.success('অতিথি ডেটা আপনার অ্যাকাউন্টে যুক্ত হয়েছে');
          } catch (e) {
            console.warn('initial cloud push failed', e);
          }
        }
      } else {
        // Signed out — revert to guest profile but keep the user's local data.
        const fresh = AHStorage.loadSettings();
        if (!fresh.isGuest || fresh.uid) {
          const next = { ...fresh, uid: null, isGuest: true };
          setSettings(next);
          AHStorage.saveSettings(next);
        }
      }
    };

    const unsub = window.AHFirebase.onAuthStateChanged(onUser);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  // Write-through to Firestore: any time txs/debts/budget/catBudgets change
  // and the user is signed in, queue a debounced push. Skipped while guest.
  useEffect(() => {
    if (!window.AHFirebase || !window.AHFirebase.isConfigured()) return;
    if (!settings.uid || settings.isGuest) return;
    window.AHFirebase.queueStatePush(settings.uid, () => ({
      txs, debts, budget, catBudgets, settings,
    }));
  }, [txs, debts, budget, catBudgets, settings]);

  // ── Setters that also persist + mirror to API ──────────────────────────────
  const setBudget = useCallback((v) => {
    setBudgetState(v);
    AHStorage.saveBudget(v);
    AHStorage.syncPut('budgets', 'monthly', { amount: v });
  }, []);
  const setCatBudgets = useCallback((v) => {
    setCatBudgetsState(v);
  }, []);

  // Palette setter — drives both the live CSS vars (via useTweaks) and persisted
  // settings, so a theme choice survives reloads and stays in sync between the
  // SettingsScreen picker and the (hidden) Tweaks panel.
  const setPalette = useCallback((v) => {
    setTweak('palette', v);
    const fresh = AHStorage.loadSettings();
    AHStorage.saveSettings({ ...fresh, palette: v });
  }, [setTweak]);

  const openModal = (m) => setModal(m);
  const closeModal = () => { setModal(null); setEditingTx(null); setEditingDebt(null); };

  const openAuthModal = useCallback((mode = 'login') => {
    setAuthMode(mode);
    setModal('auth');
  }, []);

  const handleSignOut = useCallback(async () => {
    const ok = await window.confirmDialog({
      title: window.t('dlg_signout_title'),
      message: window.t('dlg_signout_msg'),
      okLabel: window.t('dlg_signout_ok'),
      tone: 'default',
    });
    if (!ok) return;
    try {
      if (window.AHFirebase) await window.AHFirebase.signOut();
      window.toast.success(window.t('toast_signout'));
    } catch (e) {
      window.toast.error(window.t('toast_signout_err'));
    }
  }, []);

  // Save profile (name + photo). Mirrors to Firestore when signed in.
  const saveProfile = useCallback(async ({ name, photoBase64 }) => {
    const fresh = AHStorage.loadSettings();
    const next = { ...fresh, name, photoBase64 };
    setSettings(next);
    AHStorage.saveSettings(next);
    if (next.uid && !next.isGuest && window.AHFirebase) {
      try {
        await window.AHFirebase.saveProfile(next.uid, {
          name, email: next.email, photoBase64, photoURL: next.photoURL,
        });
      } catch (e) {
        console.warn('profile save to cloud failed', e);
      }
    }
  }, []);

  // ── Tx/Debt handlers ───────────────────────────────────────────────────────
  const saveTx = useCallback(async (tx, isEdit) => {
    if (isEdit) {
      setTxs(prev => prev.map(x => x.id === tx.id ? tx : x));
      AHStorage.syncPut('transactions', tx.id, tx);
      window.toast.success(window.t('app_tx_updated'));
    } else {
      setTxs(prev => [tx, ...prev]);
      AHStorage.syncPush('transactions', tx);
      window.toast.success(window.t('app_tx_saved'));
    }
  }, []);

  const saveDebt = useCallback(async (d, isEdit) => {
    if (isEdit) {
      setDebts(prev => prev.map(x => x.id === d.id ? d : x));
      AHStorage.syncPut('debts', d.id, d);
      window.toast.success(window.t('app_debt_updated'));
    } else {
      setDebts(prev => [d, ...prev]);
      AHStorage.syncPush('debts', d);
      window.toast.success(window.t('app_debt_saved'));
    }
  }, []);

  const onEditTx = (tx) => { setEditingTx(tx); setModal('tx'); };
  const onDeleteTx = async (tx) => {
    const ok = await window.confirmDialog({
      title: window.t('dlg_delete_tx_title'),
      message: window.t('dlg_delete_tx_msg', { desc: tx.desc, amt: fmtTk(tx.amt) }),
      okLabel: window.t('dlg_delete_tx_ok'), tone: 'danger',
    });
    if (!ok) return;
    setTxs(prev => prev.filter(x => x.id !== tx.id));
    AHStorage.syncDelete('transactions', tx.id);
    window.toast.success(window.t('app_tx_deleted'));
  };

  const onEditDebt = (d) => { setEditingDebt(d); setModal('debt'); };
  const onSettleDebt = async (id) => {
    const d = debts.find(x => x.id === id);
    const ok = await window.confirmDialog({
      title: window.t('dlg_settle_title'),
      message: d ? window.t('dlg_settle_msg', { name: d.name, amt: fmtTk(d.amt) }) : window.t('dlg_settle_ok'),
      okLabel: window.t('dlg_settle_ok'), tone: 'default',
    });
    if (!ok) return;
    setDebts(prev => prev.filter(x => x.id !== id));
    AHStorage.syncDelete('debts', id);
    window.toast.success(window.t('app_debt_settled'));
  };

  // Aggregated state object passed down to pages.
  const state = { txs, debts, budget, catBudgets, monthLabel, setTab };

  // Generic state mutator — pages call this with a function and we route each
  // field to its dedicated setter.
  const setState = (updater) => {
    if (typeof updater === 'function') {
      const next = updater(state);
      if (next.txs !== undefined) setTxs(next.txs);
      if (next.debts !== undefined) setDebts(next.debts);
      if (next.budget !== undefined) setBudget(next.budget);
      if (next.catBudgets !== undefined) setCatBudgets(next.catBudgets);
    }
  };

  const title = SCREEN_TITLES[tab] || SCREEN_TITLES.dashboard;
  const personalizedTitle = title.title;

  const screenProps = {
    state, setState, openModal,
    onEditTx, onDeleteTx, onEditDebt, onSettleDebt,
    settings, saveProfile, openAuthModal, handleSignOut, setTab,
  };

  const openNewTx = () => { setEditingTx(null); openModal('tx'); };

  return (
    <div className="ah-app">
      {/* SIDEBAR (desktop) */}
      <Sidebar
        tab={tab} setTab={setTab} debts={debts}
        openTx={openNewTx}
        settings={settings}
        navItems={NAV_ITEMS}
        secondaryNav={SECONDARY_NAV}
        onOpenAuth={openAuthModal}
      />

      {/* SIDEBAR DRAWER (mobile) */}
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Sidebar
          tab={tab} setTab={setTab} debts={debts}
          openTx={openNewTx}
          settings={settings}
          onCloseDrawer={() => setDrawerOpen(false)}
          navItems={NAV_ITEMS}
          secondaryNav={SECONDARY_NAV}
          onOpenAuth={openAuthModal}
        />
      </SidebarDrawer>

      {/* MAIN */}
      <main className="ah-main">
        <div className="ah-top">
          <div className="ah-top-l">
            <button className="ah-icon-btn ah-menu-btn" aria-label={s.topbar_menu} onClick={() => setDrawerOpen(true)}>
              <Icon name="list" size={18}/>
            </button>
            <div className="ah-top-title-wrap">
              <div className="ah-top-eyebrow">{title.eyebrow}</div>
              <h1 className="ah-top-title">{personalizedTitle}</h1>
            </div>
          </div>
          <div className="ah-top-actions">
            <div className="ah-chip"><span className="dot"></span>{monthLabel}</div>
            <button className="ah-icon-btn" title={s.topbar_search} aria-label={s.topbar_search} onClick={() => setSearchOpen(true)}>
              <Icon name="search" size={18}/>
            </button>
            <button className="ah-icon-btn" title={s.topbar_notif} aria-label={s.topbar_notif} onClick={() => setNotifOpen(true)}>
              <Icon name="bell" size={18}/>
            </button>
          </div>
        </div>

        <div className="ah-content">
          {tab === 'dashboard' && <DashboardScreen {...screenProps}/>}
          {tab === 'history'   && <HistoryScreen   {...screenProps}/>}
          {tab === 'debts'     && <DebtScreen      {...screenProps}/>}
          {tab === 'budget'    && <BudgetScreen    {...screenProps}/>}
          {tab === 'reports'   && <ReportsScreen   state={state}/>}
          {tab === 'reminders' && <RemindersScreen state={state}/>}
          {tab === 'settings'  && <SettingsScreen  state={state} setState={setState} palette={t.palette} setPalette={setPalette} settings={settings} saveProfile={saveProfile} openAuthModal={openAuthModal} handleSignOut={handleSignOut}/>}
        </div>
      </main>

      {/* Floating action button (desktop only — mobile uses the bottom nav "+") */}
      <button className="ah-fab" onClick={openNewTx} title="হিসাব যোগ করুন" aria-label="হিসাব যোগ করুন">
        <Icon name="plus" size={24}/>
      </button>

      {/* Bottom nav (mobile) */}
      <MobileBottomNav tab={tab} setTab={setTab} onAdd={openNewTx} navItems={NAV_ITEMS}/>

      {/* MODALS */}
      {modal === 'tx' && (
        <AddTxModal initial={editingTx} onClose={closeModal} onSave={saveTx}/>
      )}
      {modal === 'debt' && (
        <AddDebtModal initial={editingDebt} onClose={closeModal} onSave={saveDebt}/>
      )}
      {modal === 'budget' && (
        <BudgetModal current={budget} onClose={closeModal}
          onSave={(v) => { setBudget(v); window.toast.success(window.t('app_budget_saved')); }}
        />
      )}
      {modal === 'auth' && (
        <AuthModal onClose={closeModal} defaultTab={authMode}/>
      )}

      {/* DRAWERS */}
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} state={state}/>
      <SearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} state={state}/>

      {/* TOASTS + CONFIRM */}
      <ToastHost/>
      <ConfirmHost/>

      {/* TWEAKS PANEL (hidden by default; opens via the parent host's edit-mode message) */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="থিম রঙ">
          <TweakColor label="প্যালেট" value={t.palette}
            options={[
              ['#1F6FB2', '#4FB38A', '#DCEBF8'],
              ['#5B3FA8', '#C99A2A', '#E7DFF6'],
              ['#0E7C5C', '#D9737B', '#D6F0E5'],
              ['#D9633A', '#3F8FA8', '#FCE2D4'],
            ]}
            onChange={(v) => setPalette(v)}
          />
        </TweakSection>
        <TweakSection label="বাজেট">
          <TweakNumber label="মাসিক বাজেট" value={budget}
            min={0} max={100000} step={1000} unit="৳"
            onChange={(v) => setBudget(v)}
          />
        </TweakSection>
        <TweakSection label="ডেমো অ্যাকশন">
          <TweakButton label="হিসাব যোগ করুন" onClick={() => openModal('tx')}/>
          <TweakButton label="দেনা-পাওনা যোগ করুন" onClick={() => openModal('debt')} secondary/>
          <TweakButton label="ডেটা রিসেট" onClick={() => {
            AHStorage.resetAll([], [], 0);
            setTxs([]); setDebts([]); setBudget(0); setCatBudgets({});
            window.toast.success('ডেটা রিসেট হয়েছে');
          }} secondary/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

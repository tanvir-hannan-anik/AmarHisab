// ─────────────────────────────────────────────────────────────────────────────
// Components / Nav
//
//   - Sidebar          desktop sidebar (also rendered inside the mobile drawer)
//   - MobileBottomNav  fixed bottom bar shown ≤ 760px with a centered "+"
//   - SidebarDrawer    overlay shell that hosts the Sidebar on small screens
//
// The primary and secondary nav item arrays are defined at the top of App.jsx
// and passed in via props so this file has no hard-coded menu.
// ─────────────────────────────────────────────────────────────────────────────

const { useEffect: useEffectNav } = React;

function Sidebar({ tab, setTab, debts, openTx, onCloseDrawer, settings, navItems, secondaryNav, onOpenAuth }) {
  const handleNav = (id) => {
    setTab(id);
    if (onCloseDrawer) onCloseDrawer();
  };
  const goSettings = () => handleNav('settings');
  const openAuth = (mode) => {
    if (onCloseDrawer) onCloseDrawer();
    if (onOpenAuth) onOpenAuth(mode);
  };
  return (
    <aside className="ah-side">
      <div className="ah-brand">
        <div className="ah-brand-mark">
          <img src="src/public/logo.png" alt="Amar Hisab" />
        </div>
        <div>
          <div className="ah-brand-name">{window.t('n_brand')}</div>
          <div className="ah-brand-sub">{window.t('n_brand_sub')}</div>
        </div>
        {onCloseDrawer && (
          <button className="ah-icon-btn ah-side-close" aria-label={window.t('n_close')} onClick={onCloseDrawer}>
            <Icon name="x" size={16}/>
          </button>
        )}
      </div>

      <button className="ah-add-btn" onClick={() => { openTx(); if (onCloseDrawer) onCloseDrawer(); }}>
        <Icon name="plus" size={18}/>
        {window.t('n_add_tx')}
      </button>

      <div className="ah-nav">
        <div className="ah-nav-eyebrow">{window.t('n_main_menu')}</div>
        {navItems.map(item => (
          <button
            key={item.id}
            className={'ah-nav-item ' + (tab === item.id ? 'active' : '')}
            onClick={() => handleNav(item.id)}
          >
            <Icon name={item.icon} size={20}/>
            {item.label}
            {item.id === 'debts' && debts.length > 0 && (
              <span className="ah-nav-badge">{toBn(debts.length)}</span>
            )}
          </button>
        ))}

        <div className="ah-nav-eyebrow">{window.t('n_others')}</div>
        {secondaryNav.map(item => (
          <button
            key={item.id}
            className={'ah-nav-item ' + (tab === item.id ? 'active' : '')}
            onClick={() => handleNav(item.id)}
          >
            <Icon name={item.icon} size={20}/>
            {item.label}
          </button>
        ))}
      </div>

      <div className="ah-side-foot">
        <SidebarProfile
          settings={settings}
          onOpenAuth={openAuth}
          onOpenSettings={goSettings}
        />
      </div>
    </aside>
  );
}

function MobileBottomNav({ tab, setTab, onAdd, navItems }) {
  return (
    <nav className="ah-bottom-nav" role="tablist" aria-label={window.t('n_main_menu')}>
      {navItems.slice(0, 2).map(it => (
        <button key={it.id} role="tab" aria-selected={tab === it.id}
          className={'ah-bn-item ' + (tab === it.id ? 'active' : '')}
          onClick={() => setTab(it.id)}>
          <Icon name={it.icon} size={20}/>
          <span>{it.label}</span>
        </button>
      ))}
      <button className="ah-bn-add" onClick={onAdd} aria-label={window.t('n_add_tx')}>
        <Icon name="plus" size={22}/>
      </button>
      {navItems.slice(2).map(it => (
        <button key={it.id} role="tab" aria-selected={tab === it.id}
          className={'ah-bn-item ' + (tab === it.id ? 'active' : '')}
          onClick={() => setTab(it.id)}>
          <Icon name={it.icon} size={20}/>
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

function SidebarDrawer({ open, onClose, children }) {
  useEffectNav(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ah-sidebar-overlay" onClick={onClose}>
      <div className="ah-sidebar-drawer" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, MobileBottomNav, SidebarDrawer });

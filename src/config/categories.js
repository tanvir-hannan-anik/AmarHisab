// ─────────────────────────────────────────────────────────────────────────────
// Config / Categories
//
// The list of expense categories shown across the app, plus a lookup index.
// Each category carries its display name (Bengali), emoji, and two paint chips
// (a saturated `color` for chart strokes and a soft `bg` for badge fills).
//
// Exposed on window so non-module scripts can read them without imports.
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'food',      bn: 'খাবার',      en: 'Food',        em: '🍱', color: '#E0545B', bg: '#FCE3E4' },
  { id: 'transport', bn: 'যাতায়াত',    en: 'Transport',   em: '🚌', color: '#1F6FB2', bg: '#DCEBF8' },
  { id: 'education', bn: 'শিক্ষা',     en: 'Education',   em: '📚', color: '#7B4FB8', bg: '#EADFF8' },
  { id: 'rent',      bn: 'বাড়িভাড়া',   en: 'Rent',        em: '🏠', color: '#E8A93A', bg: '#FDF1D6' },
  { id: 'bills',     bn: 'বিল',        en: 'Bills',       em: '💡', color: '#3B8FD9', bg: '#DCEBF8' },
  { id: 'health',    bn: 'চিকিৎসা',    en: 'Health',      em: '💊', color: '#4FB38A', bg: '#E2F6EC' },
  { id: 'shopping',  bn: 'কেনাকাটা',   en: 'Shopping',    em: '🛍️', color: '#D946A8', bg: '#FBE1F1' },
  { id: 'other',     bn: 'অন্যান্য',   en: 'Other',       em: '💼', color: '#6B737C', bg: '#EDF0F3' },
];

const CAT_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

// Seed arrays — intentionally empty. The app starts at zero; users build their
// own history. Kept here as named constants so `resetAll` can still reference
// them symbolically.
const SAMPLE_TX = [];
const SAMPLE_DEBTS = [];

Object.assign(window, { CATEGORIES, CAT_BY_ID, SAMPLE_TX, SAMPLE_DEBTS });

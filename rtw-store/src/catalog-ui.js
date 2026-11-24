/** Navigation labels and display helpers shared by the live catalogue views. */
export const SECTIONS = [
  { id: 'new', label: 'New Arrivals', title: 'New', accent: 'arrivals.', copy: 'The latest pieces from the ready-to-wear edit.' },
  { id: 'men', label: 'Men', title: 'For', accent: 'him.', copy: 'Sets, shirts and trousers cut with ease and quiet confidence.' },
  { id: 'women', label: 'Women', title: 'For', accent: 'her.', copy: 'Statement silhouettes and signature pieces for every occasion.' },
  { id: 'accessories', label: 'Accessories', title: 'The finishing', accent: 'touch.', copy: 'Accents that complete the look.' },
];

export const COLOUR_GROUPS = [
  { id: 'black', label: 'Black' },
  { id: 'blue', label: 'Blue' },
  { id: 'light', label: 'White & cream' },
  { id: 'brown', label: 'Brown' },
];

export const formatGHS = value => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

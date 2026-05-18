const BARANGAY_KEYWORDS = {
  south_signal: [
    'south signal',
    'south signal village',
    'brgy south signal',
    'barangay south signal',
    'south signal taguig',
    'south signal, taguig',
    'signal village south',
  ],

  central_bicutan: [
    'central bicutan',
    'central bicutan village',
    'brgy central bicutan',
    'barangay central bicutan',
    'central bicutan taguig',
    'air force road',
    'general paulino santos',
  ],

  tup_taguig: [
    'tup',
    'tup taguig',
    'tup-taguig',
    'technological university of the philippines',
    'western bicutan',
  ],

  upper_bicutan: [
    'upper bicutan',
    'upper bicutan taguig',
  ],

  lower_bicutan: [
    'lower bicutan',
    'lower bicutan taguig',
  ],
};

const STREET_KEYWORDS = {
  south_signal: [
    'general espino',
    'magsaysay',
    'quirino',
    'ghq road',
    'navy road',
    'resma',
    'punzalan',
    'pardiñas',
    'paronas',
    'espedilla',
  ],

  central_bicutan: [
    'air force road',
    'k-9 extension',
    'west service road',
    'east service road',
    'babas',
    'diaz',
    'cristobal',
    'ferrer',
    'lozanes',
    'osano',
    'saliksik',
    'sultan kudarat',
    'sunflower',
    'villa',
  ],

  tup_taguig: [
    'campus road',
    'tup campus',
    'technical road',
  ],
};

const BARANGAY_LABELS = {
  south_signal: 'South Signal, Taguig',
  central_bicutan: 'Central Bicutan, Taguig',
  tup_taguig: 'TUP Taguig / Western Bicutan',
  upper_bicutan: 'Upper Bicutan, Taguig',
  lower_bicutan: 'Lower Bicutan, Taguig',
};

const SOUTH_SIGNAL_ALLOWED = ['Special Waste'];

const TUP_ALLOWED = ['General Waste', 'Recyclable', 'Special Waste'];

function detectBarangayFromAddress(address) {
  if (!address || typeof address !== 'string') return null;
  const lower = address.toLowerCase().trim();

  for (const [key, keywords] of Object.entries(BARANGAY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return key;
  }

  for (const [key, streets] of Object.entries(STREET_KEYWORDS)) {
    if (streets.some((st) => lower.includes(st))) return key;
  }

  return null;
}

function validateWasteForBarangay(barangay, classification) {
  if (barangay === 'south_signal') {
    if (!SOUTH_SIGNAL_ALLOWED.includes(classification)) {
      return {
        valid: false,
        reason: `South Signal only accepts Special Waste reports. Detected type is "${classification}".`,
      };
    }
  }

  if (barangay === 'tup_taguig') {
    if (!TUP_ALLOWED.includes(classification)) {
      return {
        valid: false,
        reason: `TUP Taguig only accepts General, Recyclable, or Special Waste. Detected type is "${classification}".`,
      };
    }
  }

  return { valid: true };
}

function routeReport(address, classification, override) {
  const barangay =
    override ||
    detectBarangayFromAddress(address) ||
    'central_bicutan';

  const label =
    BARANGAY_LABELS[barangay] ||
    BARANGAY_LABELS.central_bicutan;

  const validation = validateWasteForBarangay(barangay, classification);

  return {
    barangay,
    label,
    valid: validation.valid,
    reason: validation.reason || null,
  };
}

module.exports = {
  detectBarangayFromAddress,
  validateWasteForBarangay,
  routeReport,
  BARANGAY_LABELS,
  BARANGAY_KEYWORDS,
  STREET_KEYWORDS,
  SOUTH_SIGNAL_ALLOWED,
  TUP_ALLOWED,
};
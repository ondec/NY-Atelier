export type LengthUnit = 'cm' | 'in';
export type DeliveryAddress = {
  id: string; label: string; recipient: string; phone: string;
  street: string; city: string; region: string; country: string; postalCode: string; instructions: string;
};
export type AccountSettings = {
  unit: LengthUnit;
  fitNotes: string;
  notifications: { orders: boolean; consultations: boolean; collections: boolean };
  addresses: DeliveryAddress[];
  defaultAddressId: string | null;
};
export const accountSettingsKey = 'ny-atelier-account-settings-v1';
export const defaultAccountSettings: AccountSettings = {
  unit: 'cm', fitNotes: '', notifications: { orders: true, consultations: true, collections: false }, addresses: [], defaultAddressId: null,
};

export function isPhoneNumber(value: string) {
  return /^[+\d() .-]{5,40}$/.test(value) && value.replace(/\D/g, '').length >= 5;
}

export function parseAccountSettings(raw: string | null): AccountSettings {
  if (!raw) return { ...defaultAccountSettings };
  const value = JSON.parse(raw);
  const addresses = Array.isArray(value?.addresses) ? value.addresses.filter((item: DeliveryAddress) => item && typeof item.id === 'string' && typeof item.street === 'string' && typeof item.city === 'string' && typeof item.country === 'string').map((item: DeliveryAddress) => ({
    id: item.id, label: String(item.label || 'Address'), recipient: String(item.recipient || ''), phone: String(item.phone || ''),
    street: item.street, city: item.city, country: item.country, region: String(item.region || ''), postalCode: String(item.postalCode || ''), instructions: String(item.instructions || ''),
  })) : [];
  return {
    unit: value?.unit === 'in' ? 'in' : 'cm', fitNotes: typeof value?.fitNotes === 'string' ? value.fitNotes : '', addresses,
    defaultAddressId: addresses.some((item: DeliveryAddress) => item.id === value?.defaultAddressId) ? value.defaultAddressId : addresses[0]?.id ?? null,
    notifications: {
      orders: typeof value?.notifications?.orders === 'boolean' ? value.notifications.orders : true,
      consultations: typeof value?.notifications?.consultations === 'boolean' ? value.notifications.consultations : true,
      collections: value?.notifications?.collections === true,
    },
  };
}

export function displayMeasurement(value: string, key: string, unit: LengthUnit) {
  if (key === 'weight' || unit === 'cm') return value;
  return String(Math.round(Number(value) / 2.54 * 100) / 100);
}

export function canonicalMeasurement(value: string, key: string, unit: LengthUnit) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const number = Number(normalized) * (key !== 'weight' && unit === 'in' ? 2.54 : 1);
  return number >= 0.1 && number <= 999 ? String(Math.round(number * 100) / 100) : null;
}

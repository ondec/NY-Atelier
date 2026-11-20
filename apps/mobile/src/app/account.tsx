import { useTabSwipeBlocker } from '@/components/tab-swipe';
import { IconLabel } from '@/components/shop-action-icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Animated, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { atelier } from '@/atelier-theme';
import { NyIcon } from '@/components/ny-icon';
import { NyMark, NyWreath } from '@/components/ny-mark';
import { useEdgeSwipeBack } from '@/components/edge-swipe-back';
import { demoCustomer } from '@/lib/demo-customer';
import { useCustomerAuth } from '@/lib/customer-auth';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { PasskeyCancelledError } from '@/lib/passkeys';
import { formatDate } from '@/lib/orders';
import { accountSettingsKey, canonicalMeasurement, defaultAccountSettings, displayMeasurement, isPhoneNumber, parseAccountSettings, type AccountSettings, type DeliveryAddress, type LengthUnit } from '@/lib/account-settings';
import { useAccountMeasurements } from '@/lib/account-measurements';
import { accountMeasurementFields as measurementFields, type AccountFitting as Fitting } from '@/lib/measurement-history';
import type { IconName } from '@/data/ny-icons';

const sections = [
  { id: 'measurements', icon: 'ruler', title: 'Measurements' },
  { id: 'addresses', icon: 'home', title: 'Delivery addresses' },
  { id: 'notifications', icon: 'bell', title: 'Notifications' },
  { id: 'security', icon: 'lock', title: 'Security & sign-in' },
  { id: 'help', icon: 'user-settings', title: 'Help & privacy' },
] as const;
type Panel = (typeof sections)[number]['id'] | 'details' | 'fitting' | 'address-edit' | 'privacy';
const profileKey = 'ny-atelier-demo-profile-v1';
const initialProfile = { name: String(demoCustomer.name), email: String(demoCustomer.email), phone: '', address: '', city: '', region: '', country: '', postalCode: '', instructions: '', contact: 'email' };
const profileFields = [{ key: 'name', label: 'Full name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone number' }] as const;
const addressFields = [
  { key: 'label', label: 'Address label', placeholder: 'Home, work…' },
  { key: 'recipient', label: 'Recipient name' }, { key: 'phone', label: 'Delivery phone number' },
  { key: 'street', label: 'Street address' }, { key: 'city', label: 'City or town' },
  { key: 'region', label: 'Region or state (optional)' }, { key: 'country', label: 'Country' },
  { key: 'postalCode', label: 'Postal code or GhanaPost GPS (optional)' },
  { key: 'instructions', label: 'Delivery instructions (optional)' },
] as const;
const notificationOptions = [
  { key: 'orders', title: 'Order progress', note: 'Updates as your pieces move towards collection or delivery.' },
  { key: 'consultations', title: 'Consultation reminders', note: 'Reminders for your confirmed appointments.' },
  { key: 'collections', title: 'New collections & offers', note: 'Optional news from NY Atelier.' },
] as const;
const emptyAddress: DeliveryAddress = { id: '', label: '', recipient: '', phone: '', street: '', city: '', region: '', country: '', postalCode: '', instructions: '' };
const supportEmail = 'info@thenyatelier.com';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [settings, setSettings] = useState<AccountSettings>(defaultAccountSettings);
  const [settingsDraft, setSettingsDraft] = useState<AccountSettings>(defaultAccountSettings);
  const [addressDraft, setAddressDraft] = useState<DeliveryAddress>(emptyAddress);
  const [removeAddressId, setRemoveAddressId] = useState<string | null>(null);
  const { fittings, ready: measurementsReady, loadError: measurementsLoadError, saveMeasurements } = useAccountMeasurements();
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [panel, setPanel] = useState<Panel | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const { customer, updateName, signOut, passkeysAvailable, addPasskey } = useCustomerAuth();
  const close = useCallback(() => {
    if (!saving) { setError(''); setPanel(current => current === 'fitting' ? 'measurements' : current === 'address-edit' ? 'addresses' : current === 'privacy' ? 'help' : null); }
  }, [saving]);
  useTabSwipeBlocker(panel !== null);
  const swipe = useEdgeSwipeBack(close, panel !== null && !saving, panel);

  useEffect(() => {
    let active = true;
    void AsyncStorage.multiGet([profileKey, accountSettingsKey]).then(entries => {
      if (!active) return;
      let loadedProfile = initialProfile;
      try {
        const stored = JSON.parse(entries[0][1] ?? 'null');
        if (typeof stored?.name === 'string' && typeof stored?.email === 'string') {
          loadedProfile = Object.fromEntries(Object.entries(initialProfile).map(([key, fallback]) => [key, typeof stored[key] === 'string' ? stored[key] : fallback])) as typeof initialProfile;
          setProfile(loadedProfile);
        }
      } catch { /* Keep the profile usable if an old local record is damaged. */ }
      try {
        const loaded = parseAccountSettings(entries[1][1]);
        // Bring an existing single delivery address into the new address book.
        if (!entries[1][1] && loadedProfile.address.trim()) {
          const legacy = { ...emptyAddress, id: 'saved-address', label: 'Home', recipient: loadedProfile.name, phone: loadedProfile.phone, street: loadedProfile.address, city: loadedProfile.city, region: loadedProfile.region, country: loadedProfile.country, postalCode: loadedProfile.postalCode, instructions: loadedProfile.instructions };
          loaded.addresses = [legacy]; loaded.defaultAddressId = legacy.id;
        }
        setSettings(loaded);
      } catch { /* Defaults leave a damaged preferences record editable. */ }
    }).catch(() => { if (active) setError('Your saved details could not be loaded. Please try again.'); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  function openPanel(next: Panel) {
    if (saving) return;
    setDraft(profile); setSettingsDraft(settings);
    setMeasurements(Object.fromEntries(Object.entries(fittings[0]?.values ?? {}).map(([key, value]) => [key, displayMeasurement(value, key, settings.unit)])));
    setShowHistory(false); setRemoveAddressId(null); setError(''); setSaved(''); setPanel(next);
  }
  function editAddress(address?: DeliveryAddress) {
    if (saving) return;
    setAddressDraft(address ? { ...address } : { ...emptyAddress, recipient: profile.name, phone: profile.phone });
    setError(''); setSaved(''); setRemoveAddressId(null); setPanel('address-edit');
  }
  async function persistSettings(next: AccountSettings, message = '') {
    await AsyncStorage.setItem(accountSettingsKey, JSON.stringify(next));
    setSettings(next); if (message) setSaved(message);
  }
  async function changeUnit(unit: LengthUnit) {
    if (saving) return;
    setSaving(true); setError('');
    try { await persistSettings({ ...settings, unit }); setSettingsDraft(current => ({ ...current, unit })); }
    catch { setError('Could not save your measurement preference. Try again.'); }
    finally { setSaving(false); }
  }
  async function addressAction(id: string, action: 'default' | 'remove') {
    if (saving) return;
    setSaving(true); setError('');
    const addresses = action === 'remove' ? settings.addresses.filter(address => address.id !== id) : settings.addresses;
    const defaultAddressId = action === 'default' ? id : settings.defaultAddressId === id ? addresses[0]?.id ?? null : settings.defaultAddressId;
    try { await persistSettings({ ...settings, addresses, defaultAddressId }); setRemoveAddressId(null); setSaved(action === 'remove' ? 'Address removed.' : 'Default address updated.'); }
    catch { setError('Could not update this address. Try again.'); }
    finally { setSaving(false); }
  }
  async function setUpPasskey() {
    if (saving) return;
    setSaving(true); setError(''); setSaved('');
    try { await addPasskey(); setSaved('Passkey set up. Next time, sign in with Face ID, Touch ID or your phone unlock.'); }
    catch (failure) { if (!(failure instanceof PasskeyCancelledError)) setError((failure as Error).message); }
    finally { setSaving(false); }
  }
  async function contact(subject: string) {
    setError('');
    try { await Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`); }
    catch { setError(`Please email ${supportEmail}. No email app is available on this device.`); }
  }
  async function save() {
    if (saving) return;
    setError(''); setSaving(true);
    try {
      if (panel === 'details') {
        const next = { ...draft, name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim() };
        if (!next.name || (!next.email && !next.phone) || (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) || (next.phone && !isPhoneNumber(next.phone))) {
          setError('Enter your name and a valid email address or phone number.'); return;
        }
        if (customer && next.name !== customer.name) await updateName(next.name);
        await AsyncStorage.setItem(profileKey, JSON.stringify(next)); setProfile(next); setSaved('Profile saved.'); setPanel(null);
      } else if (panel === 'fitting') {
        const filled = Object.entries(measurements).filter(([, value]) => value.trim());
        const values = filled.map(([key, value]) => [key, canonicalMeasurement(value, key, settings.unit)] as const);
        if (!values.length || values.some(([, value]) => value === null)) { setError('Enter at least one valid measurement. Use up to two decimal places; lengths must be within 0.1–999 cm and weight within 0.1–999 kg.'); return; }
        await saveMeasurements(Object.fromEntries(values) as Record<string, string>, { replace: true }); setSaved('Measurements saved.'); setPanel('measurements');
      } else if (panel === 'address-edit') {
        const next = Object.fromEntries(Object.entries(addressDraft).map(([key, value]) => [key, value.trim()])) as DeliveryAddress;
        if (!next.label || !next.recipient || !next.street || !next.city || !next.country || !isPhoneNumber(next.phone)) { setError('Add an address label, recipient, valid delivery phone number, street, city and country.'); return; }
        next.id ||= `address-${Date.now()}`;
        const addresses = settings.addresses.some(address => address.id === next.id) ? settings.addresses.map(address => address.id === next.id ? next : address) : [...settings.addresses, next];
        await persistSettings({ ...settings, addresses, defaultAddressId: settings.defaultAddressId ?? next.id }); setSaved('Address saved.'); setPanel('addresses');
      } else if (panel === 'notifications') {
        await persistSettings({ ...settings, notifications: settingsDraft.notifications }, 'Notification preferences saved.'); setPanel(null);
      } else if (panel === 'measurements') {
        await persistSettings({ ...settings, fitNotes: settingsDraft.fitNotes.trim() }, 'Fit preferences saved.'); setPanel(null);
      }
    } catch { setError('Could not save your changes on this device. Try again.'); }
    finally { setSaving(false); }
  }
  const panelTitle = panel === 'details' ? 'Edit profile' : panel === 'fitting' ? 'Record measurements' : panel === 'address-edit' ? addressDraft.id ? 'Edit address' : 'Add an address' : panel === 'privacy' ? 'Your privacy' : sections.find(section => section.id === panel)?.title;
  const displayName = customer?.name || profile.name;
  const displayContact = customer ? customer.email ?? customer.phone ?? '' : profile.email || profile.phone;
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  function renderRow(section: typeof sections[number], last: boolean) {
    const value = section.id === 'measurements' ? settings.unit : section.id === 'addresses' ? settings.addresses.length ? String(settings.addresses.length) : '' : '';
    return <Pressable key={section.id} accessibilityRole="button" disabled={!ready || !measurementsReady} onPress={() => openPanel(section.id)} style={[styles.row, !last && styles.rowDivider]}>
      <NyIcon name={section.icon} color={atelier.petrol} size={23} />
      <Text style={styles.rowTitle}>{section.title}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <NyIcon name="chevron-right" color={atelier.muted} size={17} />
    </Pressable>;
  }

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.header}><View style={styles.brand}><NyMark color={atelier.petrol} size={25} /><Text style={styles.wordmark}>NY ATELIER</Text></View></View>
      <View style={styles.intro}><Text style={styles.eyebrow}>THE PERSONAL EDIT</Text><Text style={styles.title}>Account.</Text></View>
      {!customer ? <SignInPrompt reason="account" /> : <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit profile for ${displayName}`} disabled={!ready || !measurementsReady} onPress={() => openPanel('details')} style={styles.profile}>
        <View style={styles.avatar}><NyWreath color={atelier.brass} size={78} /><Text style={styles.initials}>{initials}</Text></View>
        <View style={styles.identity}><Text style={styles.profileName}>{displayName}</Text><Text style={styles.profileContact}>{displayContact}</Text>{customer ? <Text style={styles.customerId}>{`NY-${String(customer.id).padStart(5, '0')}`}</Text> : null}</View>
        <NyIcon name="chevron-right" color={atelier.white} size={20} />
      </Pressable>
      <Text style={styles.groupLabel}>PERSONAL</Text>
      <View style={styles.group}>{sections.slice(0, 2).map((section, index) => renderRow(section, index === 1))}</View>
      <Text style={styles.groupLabel}>PREFERENCES & ACCESS</Text>
      <View style={styles.group}>{sections.slice(2).map((section, index) => renderRow(section, index === 2))}</View>
      </>}
      {saved ? <Text accessibilityRole="status" style={styles.saved}>{saved}</Text> : null}
      {!panel && error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </ScrollView>
    <Modal visible={panel !== null} animationType="slide" transparent presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <Animated.View {...swipe.panHandlers} style={[swipe.animatedStyle, styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView key={panel} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editor}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to account" onPress={close} disabled={saving} style={styles.back}><IconLabel label="Back" name="back" color={atelier.petrol} style={styles.backText} /></Pressable>
          <Text style={styles.panelTitle}>{panelTitle}</Text>
          {panel === 'details' && <>
            <Text style={styles.copy}>How we know you and keep in touch.</Text>
            <View style={styles.formCard}>{profileFields.map(({ key, label }) => <Field key={key} label={label} value={draft[key]} keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'} onChangeText={value => setDraft(current => ({ ...current, [key]: value }))} />)}</View>
            <Text style={styles.hint}>Add an email address or phone number. Delivery addresses are managed separately.</Text>
          </>}
          {panel === 'addresses' && <>
            <Text style={styles.copy}>Keep the places you want your pieces delivered to.</Text>
            {settings.addresses.length ? settings.addresses.map(address => <View key={address.id} style={styles.formCard}>
              <View style={styles.addressHeading}><Text style={styles.cardTitle}>{address.label}</Text>{settings.defaultAddressId === address.id ? <Text style={styles.defaultTag}>Default</Text> : null}</View>
              <Text style={styles.copy}>{address.recipient}{'\n'}{address.street}{'\n'}{[address.city, address.region, address.country].filter(Boolean).join(', ')}{address.postalCode ? `\n${address.postalCode}` : ''}{'\n'}{address.phone}</Text>
              {address.instructions ? <Text style={styles.hint}>{address.instructions}</Text> : null}
              <View style={styles.addressActions}><SmallAction label="Edit" icon="user-settings" onPress={() => editAddress(address)} />{settings.defaultAddressId !== address.id ? <SmallAction label="Make default" icon="check" disabled={saving} onPress={() => { void addressAction(address.id, 'default'); }} /> : null}<SmallAction label="Remove" icon="trash" onPress={() => setRemoveAddressId(address.id)} /></View>
              {removeAddressId === address.id ? <View style={styles.confirm}><Text style={styles.copy}>Remove this saved address?</Text><View style={styles.addressActions}><SmallAction label="Keep address" onPress={() => setRemoveAddressId(null)} /><SmallAction label="Remove address" disabled={saving} onPress={() => { void addressAction(address.id, 'remove'); }} /></View></View> : null}
            </View>) : <EmptyDetail icon="home" title="A place for your next delivery" text="Add your first address, then choose a default for future deliveries." />}
            <Pressable accessibilityRole="button" onPress={() => editAddress()} style={styles.primary}><Text style={styles.primaryText}>ADD AN ADDRESS</Text></Pressable>
          </>}
          {panel === 'address-edit' && <View style={styles.formCard}>{addressFields.map(({ key, label, ...rest }) => <Field key={key} label={label} placeholder={'placeholder' in rest ? rest.placeholder : undefined} value={addressDraft[key]} multiline={key === 'instructions'} keyboardType={key === 'phone' ? 'phone-pad' : 'default'} onChangeText={value => setAddressDraft(current => ({ ...current, [key]: value }))} />)}</View>}
          {panel === 'measurements' && <>
            {measurementsLoadError ? <Text accessibilityRole="alert" style={styles.error}>{measurementsLoadError}</Text> : null}
            <View style={styles.unitBar}><Text style={styles.cardTitle}>Length units</Text><View style={styles.choices}>{(['cm', 'in'] as const).map(unit => <Pressable key={unit} accessibilityRole="radio" accessibilityLabel={unit === 'cm' ? 'Centimetres' : 'Inches'} accessibilityState={{ checked: settings.unit === unit }} disabled={saving} onPress={() => { void changeUnit(unit); }} style={[styles.choice, settings.unit === unit && styles.choiceSelected]}><Text style={[styles.choiceText, settings.unit === unit && styles.choiceTextSelected]}>{unit === 'cm' ? 'cm' : 'inches'}</Text></Pressable>)}</View></View>
            <Text style={styles.sectionLabel}>Current measurements</Text>
            {fittings[0] ? <MeasurementSummary fitting={fittings[0]} unit={settings.unit} /> : <EmptyDetail icon="ruler" title="Made for your fit" text="Add your measurements to start a dated fitting record." />}
            <Pressable accessibilityRole="button" onPress={() => openPanel('fitting')} style={styles.primary}><Text style={styles.primaryText}>{fittings.length ? 'RECORD NEW MEASUREMENTS' : 'ADD MEASUREMENTS'}</Text></Pressable>
            {fittings.length > 1 ? <><Pressable accessibilityRole="button" accessibilityState={{ expanded: showHistory }} onPress={() => setShowHistory(value => !value)} style={styles.history}><Text style={styles.cardTitle}>Previous measurements ({fittings.length - 1})</Text><NyIcon name={showHistory ? 'chevron-up' : 'chevron-down'} color={atelier.petrol} size={20} /></Pressable>{showHistory ? fittings.slice(1).map(fitting => <MeasurementSummary key={fitting.id} fitting={fitting} unit={settings.unit} />) : null}</> : null}
            <View style={styles.formCard}><Field label="Fit preferences (optional)" value={settingsDraft.fitNotes} multiline placeholder="How you like your clothes to fit…" onChangeText={fitNotes => setSettingsDraft(current => ({ ...current, fitNotes }))} /><Text style={styles.hint}>For example, a relaxed sleeve or a closer trouser fit.</Text></View>
          </>}
          {panel === 'fitting' && <><Text style={styles.copy}>Lengths in {settings.unit === 'cm' ? 'centimetres' : 'inches'}; weight in kilograms. Leave unused fields blank. Your previous records will be kept.</Text><View style={styles.formCard}>{measurementFields.map(([key, label]) => <Field key={key} label={`${label} (${key === 'weight' ? 'kg' : settings.unit})`} value={measurements[key] ?? ''} keyboardType="decimal-pad" maxLength={6} onChangeText={value => setMeasurements(current => ({ ...current, [key]: value }))} />)}</View></>}
          {panel === 'notifications' && <>
            <Text style={styles.copy}>Choose the updates you would like to hear about.</Text>
            <View style={styles.formCard}>{notificationOptions.map(option => <View key={option.key} style={styles.toggleRow}><View style={styles.toggleText}><Text style={styles.cardTitle}>{option.title}</Text><Text style={styles.hint}>{option.note}</Text></View><Switch accessibilityLabel={option.title} value={settingsDraft.notifications[option.key]} trackColor={{ false: atelier.line, true: atelier.petrol }} onValueChange={value => setSettingsDraft(current => ({ ...current, notifications: { ...current.notifications, [option.key]: value } }))} /></View>)}</View>
            <Text style={styles.hint}>Updates that need your response remain visible in Orders.</Text>
            <View style={styles.formCard}><Text style={styles.cardTitle}>Where we reach you</Text><Text style={styles.copy}>In the app and by email. If no email is provided, SMS is the fallback.</Text><Text style={styles.hint}>{profile.email || profile.phone || 'Add your contact details in your profile.'}</Text></View>
            <Text style={styles.hint}>Preferences are saved on this device. Email, SMS and reminder delivery will follow these choices once connected.</Text>
          </>}
          {panel === 'security' && <>
            <Text style={styles.copy}>Your account access, in one place.</Text>
            <View style={styles.formCard}>
              <SecurityItem icon="user" title="Signed in" text={`${customer?.email ?? customer?.phone ?? ''}${customer?.email && customer.phone ? ` · ${customer.phone}` : ''}`} />
              <SecurityItem icon="lock" title={customer?.passkey.status === 'enrolled' ? 'Passkey: set up' : 'Passkey'} text={customer?.passkey.status === 'enrolled' ? 'Face ID, Touch ID or your device unlock signs you in.' : !passkeysAvailable ? 'Passkeys are not available on this device. Sign in with a code sent to your email or phone.' : customer?.passkey.status === 'required' ? 'A passkey is now required to keep signing in quickly.' : 'Use Face ID, Touch ID or your device unlock to sign in instead of waiting for a code.'} />
              <SecurityItem icon="send" title="Email or phone code" text="If your passkey is unavailable, we can send a one-time code to your verified email or phone." />
            </View>
            {passkeysAvailable && customer && customer.passkey.status !== 'enrolled' ? <SmallAction label={saving ? 'Setting up…' : 'Set up a passkey'} icon="lock" disabled={saving} onPress={() => { void setUpPasskey(); }} /> : null}
            <SmallAction label="Sign out of this device" icon="logout" disabled={saving} onPress={() => { setSaving(true); void signOut().finally(() => { setSaving(false); setPanel(null); }); }} />
            <Text style={styles.hint}>Lost access to your email or phone? Contact NY Atelier and the team will verify your identity before updating your account.</Text>
          </>}
          {panel === 'help' && <>
            <View style={styles.group}><SettingAction icon="send" label="Contact NY Atelier" onPress={() => { void contact('Customer support'); }} /><SettingAction icon="warning" label="Report a problem" onPress={() => { void contact('App feedback'); }} /><SettingAction icon="lock" label="Your privacy" last onPress={() => { setError(''); setPanel('privacy'); }} /></View>
            <Text style={styles.hint}>{supportEmail}</Text>
            <Text style={styles.sectionLabel}>Account requests</Text><View style={styles.formCard}><Text style={styles.cardTitle}>Request account deletion</Text><Text style={styles.copy}>Ask the team to review your account deletion request. This opens an email for you to review and send.</Text><SmallAction label="Prepare deletion request" icon="trash" onPress={() => { void contact('Account deletion request'); }} /></View>
          </>}
          {panel === 'privacy' && <View style={styles.formCard}><Text style={styles.cardTitle}>Your information</Text><Text style={styles.copy}>Your profile details, saved addresses, notification preferences and self-entered measurements are currently stored on this device. Your orders and consultations use the connected NY Atelier records.</Text><Text style={styles.sectionLabel}>Fitting history</Text><Text style={styles.copy}>Recording a new measurement set keeps previous sets so you can refer back to them.</Text><Text style={styles.sectionLabel}>Questions about your data?</Text><Text style={styles.copy}>Contact NY Atelier to ask about your information or request account deletion. A published privacy policy will be linked here when available.</Text><SmallAction label="Contact the team" icon="send" onPress={() => { void contact('Privacy enquiry'); }} /></View>}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {saved && panel ? <Text accessibilityRole="status" style={styles.saved}>{saved}</Text> : null}
          {(['details', 'fitting', 'address-edit', 'notifications', 'measurements'] as (Panel | null)[]).includes(panel) ? <Pressable accessibilityRole="button" onPress={() => { void save(); }} disabled={saving} style={[styles.primary, saving && styles.disabled]}><Text style={styles.primaryText}>{saving ? 'SAVING…' : panel === 'fitting' ? 'SAVE MEASUREMENTS' : panel === 'address-edit' ? 'SAVE ADDRESS' : panel === 'details' ? 'SAVE PROFILE' : 'SAVE PREFERENCES'}</Text></Pressable> : null}
        </ScrollView>
      </Animated.View>
    </Modal>
  </SafeAreaView>;
}

function Field({ label, multiline, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} maxLength={multiline ? 600 : 254} autoCapitalize={props.keyboardType === 'email-address' ? 'none' : 'sentences'} autoCorrect={props.keyboardType === 'email-address' ? false : undefined} multiline={multiline} {...props} style={[styles.input, multiline && styles.longInput]} /></View>;
}
function SmallAction({ label, icon, onPress, disabled }: { label: string; icon?: IconName; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.smallAction}>{icon ? <NyIcon name={icon} color={atelier.petrol} size={17} /> : null}<Text style={styles.smallActionText}>{label}</Text></Pressable>;
}
function SettingAction({ icon, label, onPress, last }: { icon: IconName; label: string; onPress: () => void; last?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.row, !last && styles.rowDivider]}><NyIcon name={icon} color={atelier.petrol} size={22} /><Text style={styles.rowTitle}>{label}</Text><NyIcon name="chevron-right" color={atelier.muted} size={17} /></Pressable>;
}
function SecurityItem({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return <View style={styles.securityItem}><NyIcon name={icon} color={atelier.petrol} size={23} /><View style={styles.toggleText}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.hint}>{text}</Text></View></View>;
}
function EmptyDetail({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return <View style={styles.empty}><NyIcon name={icon} color={atelier.petrol} size={30} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.copy}>{text}</Text></View>;
}
function MeasurementSummary({ fitting, unit }: { fitting: Fitting; unit: LengthUnit }) {
  return <View style={styles.formCard}><Text style={styles.hint}>{formatDate(fitting.date)} · Self-entered</Text>{measurementFields.filter(([key]) => fitting.values[key]).map(([key, label]) => <View key={key} style={styles.measurementRow}><Text style={styles.copy}>{label}</Text><Text style={styles.measurementValue}>{displayMeasurement(fitting.values[key], key, unit)} {key === 'weight' ? 'kg' : unit}</Text></View>)}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.alabaster },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingBottom: 125, paddingHorizontal: 24 },
  header: { height: 70, justifyContent: 'center' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  wordmark: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 16, fontWeight: '700', letterSpacing: 3.7 },
  intro: { paddingTop: 22, paddingBottom: 23 }, eyebrow: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 10, letterSpacing: 2, marginBottom: 12 },
  title: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 32, lineHeight: 41 },
  profile: { backgroundColor: atelier.petrol, padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center' },
  initials: { position: 'absolute', color: atelier.white, fontFamily: atelier.body, fontWeight: '700', fontSize: 22, lineHeight: 28 },
  identity: { flex: 1, minWidth: 0 }, profileName: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', fontSize: 21, lineHeight: 27 },
  profileContact: { color: '#DCE4DE', fontFamily: atelier.body, fontSize: 13, lineHeight: 19, marginTop: 3 }, customerId: { color: atelier.brass, fontFamily: atelier.body, fontSize: 9, letterSpacing: 1, marginTop: 8 },
  groupLabel: { color: atelier.cognac, fontFamily: atelier.body, fontWeight: '700', fontSize: 9, letterSpacing: 1.5, marginTop: 28, marginBottom: 11, paddingHorizontal: 4 },
  group: { backgroundColor: atelier.white, borderRadius: 18, borderWidth: 1, borderColor: atelier.line, paddingHorizontal: 20, overflow: 'hidden' },
  row: { minHeight: 65, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 13 }, rowDivider: { borderBottomWidth: 1, borderBottomColor: atelier.line },
  rowTitle: { flex: 1, color: atelier.petrol, fontFamily: atelier.body, fontSize: 17, lineHeight: 24, fontWeight: '700' }, rowValue: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12 },
  editor: { padding: 24, paddingBottom: 38, width: '100%', maxWidth: 680, alignSelf: 'center' },
  back: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, marginBottom: 16 }, backText: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '700', fontSize: 13 },
  panelTitle: { color: atelier.petrol, fontFamily: atelier.display, fontSize: 28, lineHeight: 38, marginBottom: 18 },
  copy: { color: atelier.muted, fontFamily: atelier.body, fontSize: 14, lineHeight: 21 }, hint: { color: atelier.muted, fontFamily: atelier.body, fontSize: 12, lineHeight: 18, marginTop: 7 },
  formCard: { backgroundColor: atelier.white, borderRadius: 18, borderWidth: 1, borderColor: atelier.line, padding: 20, marginTop: 16 }, field: { marginBottom: 14 },
  fieldLabel: { color: atelier.petrol, fontFamily: atelier.body, fontWeight: '600', fontSize: 13, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: atelier.line, borderRadius: 14, backgroundColor: atelier.white, color: atelier.slate, paddingHorizontal: 14, minHeight: 48, fontFamily: atelier.body, fontSize: 16 },
  longInput: { minHeight: 88, paddingVertical: 13, textAlignVertical: 'top' },
  sectionLabel: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 16, fontWeight: '700', marginTop: 25, marginBottom: 9 },
  cardTitle: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  primary: { marginTop: 22, minHeight: 50, padding: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: atelier.petrol, borderRadius: atelier.buttonRadius },
  primaryText: { color: atelier.white, fontFamily: atelier.body, fontWeight: '700', letterSpacing: 1, fontSize: 11, textAlign: 'center' }, disabled: { opacity: 0.5 },
  error: { color: '#A33434', fontFamily: atelier.body, fontSize: 13, lineHeight: 19, marginTop: 16 }, saved: { color: '#267448', fontFamily: atelier.body, fontSize: 12, lineHeight: 18, marginTop: 16 },
  addressHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, defaultTag: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 10, fontWeight: '700', backgroundColor: '#E9F0ED', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12 },
  addressActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 }, smallAction: { minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center' }, smallActionText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 12, fontWeight: '700' },
  confirm: { borderTopWidth: 1, borderTopColor: atelier.line, paddingTop: 14, marginTop: 12 },
  unitBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, choices: { flexDirection: 'row', gap: 6 }, choice: { minHeight: 44, minWidth: 51, borderRadius: 22, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: atelier.white }, choiceSelected: { backgroundColor: atelier.petrol }, choiceText: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 12 }, choiceTextSelected: { color: atelier.white },
  empty: { marginTop: 16, borderRadius: 20, backgroundColor: '#E9F0ED', padding: 24, gap: 10 }, emptyTitle: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 19, fontWeight: '700', lineHeight: 25 },
  measurementRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEEAE2' }, measurementValue: { color: atelier.petrol, fontFamily: atelier.body, fontSize: 14, fontWeight: '700' },
  history: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, marginTop: 20 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 14 }, toggleText: { flex: 1 },
  securityItem: { flexDirection: 'row', gap: 15, paddingVertical: 14, alignItems: 'flex-start' }, notice: { flexDirection: 'row', gap: 12, marginTop: 22, padding: 18, borderRadius: 18, backgroundColor: '#E9F0ED' }, noticeText: { flex: 1 },
});

import {headers} from 'next/headers';
import {workspaceForHost} from '@/lib/workspace-hosts';
import StaffPasswordRecovery from '../password-recovery';

export const metadata = {title: 'NY Atelier | Forgot staff password', referrer: 'no-referrer' as const};

export default async function ForgotPasswordPage({searchParams}: {searchParams: Promise<{next?: string}>}) {
  const query = await searchParams;
  const destination = query.next === 'studio' ? 'studio' : query.next === 'office' ? 'office' : workspaceForHost(await headers());
  return <StaffPasswordRecovery mode="forgot" destination={destination}/>;
}

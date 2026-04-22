import { redirect } from 'next/navigation';

export default function SettingsPage() {
  redirect('/me?section=security');
}

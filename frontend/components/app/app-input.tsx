import type { InputHTMLAttributes } from 'react';
import { CatalystInput } from '@/components/catalyst/input';

export function AppInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <CatalystInput {...props} />;
}

import type { TextareaHTMLAttributes } from 'react';
import { CatalystTextarea } from '@/components/catalyst/textarea';

export function AppTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return <CatalystTextarea {...props} />;
}

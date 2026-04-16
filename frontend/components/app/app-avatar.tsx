import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppAvatar(props: React.ComponentProps<typeof Avatar>) {
  return <Avatar {...props} />;
}

export const AppAvatarImage = AvatarImage;
export const AppAvatarFallback = AvatarFallback;

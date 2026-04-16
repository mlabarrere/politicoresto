import { AppButton } from "@/components/app/app-button";
import { signOutAction } from "@/lib/data/rpc/auth";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <AppButton type="submit" variant="ghost" size="sm" className="rounded-full">
        Se deconnecter
      </AppButton>
    </form>
  );
}

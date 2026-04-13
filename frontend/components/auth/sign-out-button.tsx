import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/data/rpc/auth";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm" className="rounded-full">
        Se deconnecter
      </Button>
    </form>
  );
}

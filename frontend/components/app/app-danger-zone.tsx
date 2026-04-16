import { AppBanner } from "@/components/app/app-banner";
import { AppButton } from "@/components/app/app-button";
import { AppCard } from "@/components/app/app-card";
import { AppInput } from "@/components/app/app-input";
import { AppModal } from "@/components/app/app-modal";

export function AppDangerZone({
  onDeactivate,
  onDelete
}: {
  onDeactivate: (formData: FormData) => Promise<void>;
  onDelete: (formData: FormData) => Promise<void>;
}) {
  return (
    <AppCard className="space-y-4 border-rose-200 bg-rose-50/40 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Danger Zone</p>
        <h3 className="mt-2 text-lg font-semibold text-foreground">Actions sensibles</h3>
        <p className="mt-1 text-sm text-muted-foreground">Ces actions sont separees des reglages standards et necessitent une confirmation explicite.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <AppModal
          title="Desactiver le compte"
          trigger={<AppButton variant="secondary">Desactiver</AppButton>}
        >
          <form action={onDeactivate} className="space-y-3">
            <AppBanner
              title="Confirmation requise"
              body="Saisissez DESACTIVER pour confirmer."
              tone="warning"
            />
            <AppInput name="confirm_deactivate" required placeholder="DESACTIVER" autoComplete="off" />
            <div className="flex justify-end">
              <AppButton type="submit" variant="secondary">Confirmer</AppButton>
            </div>
          </form>
        </AppModal>

        <AppModal
          title="Supprimer le compte"
          trigger={<AppButton variant="ghost" className="text-rose-700">Supprimer</AppButton>}
        >
          <form action={onDelete} className="space-y-3">
            <AppBanner
              title="Action irreversible"
              body="Saisissez SUPPRIMER pour confirmer la suppression."
              tone="danger"
            />
            <AppInput name="confirm_delete" required placeholder="SUPPRIMER" autoComplete="off" />
            <div className="flex justify-end">
              <AppButton type="submit" className="bg-rose-600 text-white hover:bg-rose-700">Supprimer definitivement</AppButton>
            </div>
          </form>
        </AppModal>
      </div>
    </AppCard>
  );
}

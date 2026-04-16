import { redirect } from "next/navigation";

export default async function MeSettingsPage() {
  redirect("/me?section=security");
}

import { redirect } from "next/navigation";
import type { Route } from "next";

export default function TopicsRedirectPage() {
  redirect("/threads" as Route);
}

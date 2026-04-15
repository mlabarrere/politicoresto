"use client";

import Link from "next/link";
import type { Route } from "next";
import { Plus } from "lucide-react";

import { AppButton } from "@/components/app/app-button";

export function CreatePostCTA({
  href = "/post/new",
  floating = false
}: {
  href?: string;
  floating?: boolean;
}) {
  const baseClass = floating
    ? "fixed bottom-4 right-4 z-40 shadow-lg lg:hidden"
    : "w-full";

  return (
    <AppButton variant="primary" size="sm" className={baseClass} render={<Link href={href as Route} />}>
      <Plus className="size-4" />
      Nouveau post
    </AppButton>
  );
}



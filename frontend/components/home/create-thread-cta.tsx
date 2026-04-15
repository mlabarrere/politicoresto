"use client";

import Link from "next/link";
import type { Route } from "next";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

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
    <Link
      href={href as Route}
      className={cn(
        buttonVariants({ size: "sm" }),
        "inline-flex items-center justify-center gap-2",
        baseClass
      )}
    >
      <Plus className="size-4" />
      Nouveau post
    </Link>
  );
}




export const CreateThreadCTA = CreatePostCTA;


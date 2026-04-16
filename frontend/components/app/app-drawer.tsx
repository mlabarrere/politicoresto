"use client";

import { useState, type ReactNode } from "react";

import { CatalystDialog } from "@/components/catalyst/dialog";

export function AppDrawer({
  trigger,
  title,
  side = "right",
  children
}: {
  trigger: ReactNode;
  title: string;
  side?: "right" | "left" | "bottom";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span role="button" tabIndex={0} onClick={() => setOpen(true)} onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen(true);
        }
      }}>{trigger}</span>
      <CatalystDialog open={open} onClose={setOpen} title={title} side={side}>
        {children}
      </CatalystDialog>
    </>
  );
}

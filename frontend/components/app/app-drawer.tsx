"use client";

import { useState, type ReactNode } from "react";

import { CatalystDialog } from "@/components/catalyst/dialog";

export function AppDrawer({
  trigger,
  title,
  side = "right",
  open,
  onClose,
  children
}: {
  trigger?: ReactNode;
  title: string;
  side?: "right" | "left" | "bottom";
  open?: boolean;
  onClose?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof open === "boolean";
  const resolvedOpen = isControlled ? open : internalOpen;

  function setOpen(next: boolean) {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onClose?.(next);
  }

  return (
    <>
      {trigger ? (
        <span role="button" tabIndex={0} onClick={() => setOpen(true)} onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}>{trigger}</span>
      ) : null}
      <CatalystDialog open={resolvedOpen} onClose={setOpen} title={title} side={side}>
        {children}
      </CatalystDialog>
    </>
  );
}

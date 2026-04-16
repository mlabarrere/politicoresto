"use client";

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import clsx from "clsx";
import type { ReactNode } from "react";

export function CatalystTabs({ selectedIndex, onChange, children }: { selectedIndex: number; onChange: (index: number) => void; children: ReactNode }) {
  return (
    <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
      {children}
    </TabGroup>
  );
}

export function CatalystTabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <TabList className={clsx("inline-flex gap-1 rounded-xl border border-border bg-secondary p-1", className)}>{children}</TabList>;
}

export function CatalystTabsTrigger({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) {
  return (
    <Tab
      disabled={disabled}
      className={({ selected }) =>
        clsx(
          "rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition",
          selected ? "bg-white text-foreground shadow-[var(--shadow-sm)]" : "text-muted-foreground hover:text-foreground",
          disabled && "cursor-not-allowed opacity-50"
        )
      }
    >
      {children}
    </Tab>
  );
}

export function CatalystTabsPanels({ children }: { children: ReactNode }) {
  return <TabPanels className="mt-4">{children}</TabPanels>;
}

export function CatalystTabsPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <TabPanel unmount={false} className={clsx("outline-none", className)}>{children}</TabPanel>;
}

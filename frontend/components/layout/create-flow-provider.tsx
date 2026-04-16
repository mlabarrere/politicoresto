"use client";

import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { usePathname } from "next/navigation";

import { AppPrimaryCTA } from "@/components/app/app-primary-cta";
import { CatalystDialog } from "@/components/catalyst/dialog";
import { PostComposer } from "@/components/home/post-composer";

type CreateFlowContextValue = {
  isAuthenticated: boolean;
  isOpen: boolean;
  openCreate: () => void;
  closeCreate: () => void;
};

const CreateFlowContext = createContext<CreateFlowContextValue | null>(null);

export function useCreateFlow() {
  const context = useContext(CreateFlowContext);
  if (!context) {
    throw new Error("useCreateFlow must be used inside CreateFlowProvider");
  }
  return context;
}

export function CreateFlowProvider({
  children,
  isAuthenticated,
  action
}: PropsWithChildren<{
  isAuthenticated: boolean;
  action: (formData: FormData) => Promise<void>;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const redirectPath = pathname || "/";

  const value = useMemo<CreateFlowContextValue>(
    () => ({
      isAuthenticated,
      isOpen,
      openCreate: () => setIsOpen(true),
      closeCreate: () => setIsOpen(false)
    }),
    [isAuthenticated, isOpen]
  );

  return (
    <CreateFlowContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-40 lg:hidden">
        <AppPrimaryCTA mode="fab" />
      </div>
      <CatalystDialog open={isOpen} onClose={setIsOpen} title="Créer" side="right">
        <PostComposer action={action} redirectPath={redirectPath} />
      </CatalystDialog>
    </CreateFlowContext.Provider>
  );
}

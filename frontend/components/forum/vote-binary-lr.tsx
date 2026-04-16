"use client";

import { useMemo } from "react";

import { AuthRequiredSheet } from "@/components/auth/auth-required-sheet";
import { AppButton } from "@/components/app/app-button";
import type { VoteBinaryLRProps } from "@/lib/types/forum-components";
import type { VoteSide } from "@/lib/types/forum";
import { cn } from "@/lib/utils";

type Pole = {
  value: Exclude<VoteSide, null>;
  label: string;
  activeClass: string;
  idleClass: string;
};

const POLES: Pole[] = [
  {
    value: "left",
    label: "Gauche",
    activeClass: "border-rose-600 bg-rose-600 text-white",
    idleClass: "border-rose-200 text-rose-700 hover:bg-rose-50"
  },
  {
    value: "right",
    label: "Droite",
    activeClass: "border-sky-600 bg-sky-600 text-white",
    idleClass: "border-sky-200 text-sky-700 hover:bg-sky-50"
  }
];

export function VoteBinaryLR({
  value,
  leftCount,
  rightCount,
  disabled,
  size = "sm",
  onChange,
  isAuthenticated,
  redirectPath
}: VoteBinaryLRProps) {
  const sizeClass = size === "sm" ? "h-7 min-w-16 px-2 text-xs" : "h-8 min-w-18 px-3 text-sm";

  const counts = useMemo(
    () => ({
      left: leftCount,
      right: rightCount
    }),
    [leftCount, rightCount]
  );

  return (
    <div className="flex items-center gap-2" aria-label="Votes gauche droite">
      {POLES.map((pole) => {
        const isActive = value === pole.value;
        const next = isActive ? null : pole.value;
        const className = cn(
          "rounded-full border font-medium transition",
          sizeClass,
          isActive ? pole.activeClass : pole.idleClass
        );

        const content = (
          <>
            <span>{pole.label}</span>
            <span className="tabular-nums">{pole.value === "left" ? counts.left : counts.right}</span>
          </>
        );

        if (!isAuthenticated) {
          return (
            <AuthRequiredSheet
              key={pole.value}
              nextPath={redirectPath}
              triggerLabel={`Classer ${pole.label.toLowerCase()}`}
              triggerClassName={className}
              triggerContent={content}
            />
          );
        }

        return (
          <AppButton
            key={pole.value}
            type="button"
            variant="ghost"
            size="sm"
            className={className}
            aria-pressed={isActive}
            aria-label={`Classer ${pole.label.toLowerCase()}`}
            disabled={disabled}
            onClick={() => onChange(next)}
          >
            {content}
          </AppButton>
        );
      })}
    </div>
  );
}

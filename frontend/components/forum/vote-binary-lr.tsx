"use client";

import { useMemo } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { AuthRequiredSheet } from "@/components/auth/auth-required-sheet";
import { AppButton } from "@/components/app/app-button";
import type { VoteBinaryLRProps } from "@/lib/types/forum-components";
import type { VoteSide } from "@/lib/types/forum";
import { cn } from "@/lib/utils";

type Pole = {
  value: Exclude<VoteSide, null>;
  tooltip: string;
  Icon: typeof ArrowLeft;
  activeClass: string;
  idleClass: string;
};

const POLES: Pole[] = [
  {
    value: "left",
    tooltip: "C'est de gauche",
    Icon: ArrowLeft,
    activeClass: "border-rose-600 bg-rose-600 text-white",
    idleClass: "border-rose-200 text-rose-700 hover:bg-rose-50"
  },
  {
    value: "right",
    tooltip: "C'est de droite",
    Icon: ArrowRight,
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
        const Icon = pole.Icon;
        const isActive = value === pole.value;
        const next = isActive ? null : pole.value;
        const className = cn(
          "rounded-full border font-medium transition",
          sizeClass,
          isActive ? pole.activeClass : pole.idleClass
        );

        const content = (
          <>
            <Icon className="size-3.5" />
            <span className="tabular-nums">{pole.value === "left" ? counts.left : counts.right}</span>
            <span className="sr-only">{pole.tooltip}</span>
          </>
        );

        if (!isAuthenticated) {
          return (
            <AuthRequiredSheet
              key={pole.value}
              nextPath={redirectPath}
              triggerLabel={`Classer ${pole.value === "left" ? "gauche" : "droite"}`}
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
            title={pole.tooltip}
            aria-label={`Classer ${pole.value === "left" ? "gauche" : "droite"}`}
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

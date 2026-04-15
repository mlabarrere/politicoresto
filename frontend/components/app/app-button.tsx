import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

type AppButtonVariant = "primary" | "secondary" | "ghost";

function mapVariant(variant: AppButtonVariant): NonNullable<VariantProps<typeof buttonVariants>["variant"]> {
  if (variant === "secondary") return "secondary";
  if (variant === "ghost") return "ghost";
  return "default";
}

export function AppButton({
  variant = "primary",
  size = "sm",
  ...props
}: Omit<ComponentProps<typeof Button>, "variant"> & {
  variant?: AppButtonVariant;
}) {
  return <Button variant={mapVariant(variant)} size={size} {...props} />;
}

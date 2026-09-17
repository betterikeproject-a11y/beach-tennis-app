import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface PlayerAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const SIZE_MAP = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

// Elegant beach/solar-inspired gradients harmonized with the Liga Jurerê Design System
const GRADIENT_PALETTES = [
  "from-[#4ABACC] to-[#2563EB] text-white", // Brand Cyan to Ocean Blue
  "from-[#34D399] to-[#059669] text-white", // Emerald Beach
  "from-[#FB923C] to-[#EA580C] text-white", // Sunset Orange
  "from-[#38BDF8] to-[#0284C7] text-white", // Sky Cyan
  "from-[#A78BFA] to-[#7C3AED] text-white", // Lavender
  "from-[#F472B6] to-[#DB2777] text-white", // Coral Rose
  "from-[#FBBF24] to-[#D97706] text-white", // Solar Amber
];

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradientIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % GRADIENT_PALETTES.length;
}

export function PlayerAvatar({
  name,
  avatarUrl,
  className,
  size = "md",
}: PlayerAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name);
  const gradientClass = GRADIENT_PALETTES[getGradientIndex(name)];
  const sizeClass = SIZE_MAP[size];

  if (avatarUrl && !imageError) {
    return (
      <div
        className={cn(
          "relative rounded-full overflow-hidden shrink-0 border border-border/80 shadow-xs",
          sizeClass,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center font-bold tracking-tight select-none shadow-xs bg-gradient-to-br",
        gradientClass,
        sizeClass,
        className
      )}
      title={name}
      aria-label={name}
    >
      <span>{initials}</span>
    </div>
  );
}

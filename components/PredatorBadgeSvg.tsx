"use client";

import React from "react";
import { SplitType } from "@/lib/predator-data";

interface PredatorBadgeSvgProps {
  season: number;
  rank?: number | string;
  splitType?: SplitType | "unknown" | "all";
  size?: "sm" | "md" | "lg" | "xl";
  selected?: boolean;
  showSeasonLabel?: boolean;
}

export function PredatorBadgeSvg({
  season,
  rank,
  splitType = "both",
  size = "md",
  selected = false,
  showSeasonLabel = false,
}: PredatorBadgeSvgProps) {
  const isAnimated = splitType === "both" || splitType === "all";
  const px =
    size === "xl" ? 104 : size === "lg" ? 84 : size === "md" ? 64 : 44;

  // s2.png ~ s29.png まで対応
  const safeSeason = Math.min(Math.max(season, 2), 29);
  const imgSrc = `/badges/s${safeSeason}.png`;

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none transition-transform duration-150 ${
        selected ? "scale-105" : ""
      }`}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: px, height: px }}
      >
        {/* 両スプ発光エフェクト */}
        {isAnimated && (
          <div className="absolute inset-1 rounded-full bg-red-600/45 blur-md animate-pulse pointer-events-none" />
        )}

        {/* 実際のApexプレデターバッジ画像 */}
        <img
          src={imgSrc}
          alt={`S${season} Predator`}
          width={px}
          height={px}
          className="w-full h-full object-contain relative z-10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.75)]"
          loading="lazy"
        />

        {/* S17以降の順位ナンバープレート */}
        {rank !== undefined && rank !== "" && (
          <span className="absolute -bottom-1.5 z-20 px-1.5 py-0.2 rounded bg-zinc-950/95 border border-red-500/80 text-[11px] font-mono font-black text-white leading-tight shadow">
            #{rank}
          </span>
        )}
      </div>

      {showSeasonLabel && (
        <span
          className={`mt-1.5 text-xs font-mono font-bold ${
            selected ? "text-red-400" : "text-zinc-400"
          }`}
        >
          S{season}
        </span>
      )}
    </div>
  );
}

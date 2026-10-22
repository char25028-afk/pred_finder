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
    size === "xl" ? 132 : size === "lg" ? 96 : size === "md" ? 76 : 54;

  // s2.png ~ s29.png 全シーズン実物透過バッジ対応
  const safeSeason = Math.min(Math.max(season, 2), 29);
  const imgSrc = `/badges/s${safeSeason}.png`;

  const fontSize =
    size === "xl"
      ? "text-sm"
      : size === "lg"
      ? "text-xs"
      : size === "md"
      ? "text-[11px]"
      : "text-[9px]";

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none transition-transform duration-150 ${
        selected ? "scale-105" : "hover:scale-105"
      }`}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: px, height: px }}
      >
        {/* 両スプ発光エフェクト */}
        {isAnimated && (
          <div className="absolute inset-2 rounded-full bg-red-600/40 blur-lg animate-pulse pointer-events-none" />
        )}

        {/* 実際のApexプレデターバッジ透過画像 (S2〜S29) */}
        <img
          src={imgSrc}
          alt={`S${season} Predator`}
          width={px}
          height={px}
          className="w-full h-full object-contain relative z-10 drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]"
          loading="lazy"
        />

        {/* S17以降のバッジ下部・赤い六角プレート内に順位ナンバーを刻印 */}
        {rank !== undefined && rank !== "" && (
          <span
            className={`absolute bottom-[13%] z-20 font-mono font-black text-white tracking-tighter drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] ${fontSize}`}
          >
            #{rank}
          </span>
        )}
      </div>

      {showSeasonLabel && (
        <span
          className={`mt-1 text-sm font-mono font-black tracking-wide ${
            selected ? "text-red-400" : "text-zinc-200"
          }`}
        >
          S{season}
        </span>
      )}
    </div>
  );
}

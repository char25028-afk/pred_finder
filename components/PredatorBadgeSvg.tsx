"use client";

import React from "react";
import { NUMBERED_SEASONS, SplitType } from "@/lib/predator-data";

interface PredatorBadgeSvgProps {
  season: number;
  rank?: number | string;
  splitType?: SplitType | "unknown" | "all";
  size?: "sm" | "md" | "lg";
  selected?: boolean;
}

export function PredatorBadgeSvg({
  season,
  rank,
  splitType = "both",
  size = "md",
  selected = false,
}: PredatorBadgeSvgProps) {
  const meta = NUMBERED_SEASONS.find((s) => s.season === season) || {
    season,
    frameShape: "classic" as const,
    accentColor: "#ef4444",
    secondaryColor: "#f59e0b",
  };

  const isAnimated = splitType === "both" || splitType === "all";
  const dimensions =
    size === "lg" ? 112 : size === "md" ? 76 : 48;

  const displayRank =
    rank !== undefined && rank !== "" ? `#${rank}` : season >= 17 ? "#???" : `S${season}`;

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none transition-transform duration-200 ${
        selected ? "scale-105" : ""
      }`}
      style={{ width: dimensions, height: dimensions }}
    >
      {/* 両スプ維持（アニメーション発光オーラ） */}
      {isAnimated && (
        <div
          className="absolute inset-1 rounded-full blur-md opacity-65 animate-pulse pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${meta.accentColor} 0%, ${meta.secondaryColor} 55%, transparent 80%)`,
          }}
        />
      )}

      <svg
        viewBox="0 0 120 120"
        className="w-full h-full relative z-10 drop-shadow-[0_4px_10px_rgba(220,38,38,0.45)]"
      >
        <defs>
          <linearGradient id={`predCore-${season}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.accentColor} />
            <stop offset="55%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>
          <linearGradient id={`predWing-${season}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={meta.secondaryColor} />
            <stop offset="50%" stopColor={meta.accentColor} />
            <stop offset="100%" stopColor="#18181b" />
          </linearGradient>
        </defs>

        {/* シーズン固有の外枠ウイングシルエット */}
        {meta.frameShape === "blade-crown" && (
          <g>
            {/* S24: 鋭利な3連王冠ブレード＋大型ウイング */}
            <polygon
              points="60,4 47,24 34,10 38,34 8,24 22,56 12,82 40,94 60,112 80,94 108,82 98,56 112,24 82,34 86,10 73,24"
              fill={`url(#predWing-${season})`}
              stroke="#fef08a"
              strokeWidth="1.8"
            />
          </g>
        )}

        {meta.frameShape === "rift-halo" && (
          <g>
            {/* S23: 紫白リフトオーラリング＋湾曲ホーン */}
            <circle
              cx="60"
              cy="54"
              r="46"
              fill="none"
              stroke="#c084fc"
              strokeWidth="3.5"
              strokeDasharray="10 4"
            />
            <polygon
              points="60,10 35,20 12,42 22,78 44,96 60,110 76,96 98,78 108,42 85,20"
              fill={`url(#predWing-${season})`}
              stroke="#e9d5ff"
              strokeWidth="1.6"
            />
          </g>
        )}

        {meta.frameShape === "shock-bolt" && (
          <g>
            {/* S22: シアン稲妻ウイング */}
            <polygon
              points="60,8 40,22 10,18 24,48 6,62 28,86 60,110 92,86 114,62 96,48 110,18 80,22"
              fill={`url(#predWing-${season})`}
              stroke="#22d3ee"
              strokeWidth="2"
            />
          </g>
        )}

        {meta.frameShape === "void-spike" && (
          <g>
            {/* S21: 放射状ヴォイド結晶トゲ */}
            <polygon
              points="60,5 48,25 22,12 30,38 5,45 26,65 16,92 44,90 60,112 76,90 104,92 94,65 115,45 90,38 98,12 72,25"
              fill={`url(#predWing-${season})`}
              stroke="#d8b4fe"
              strokeWidth="1.6"
            />
          </g>
        )}

        {meta.frameShape === "cyber-wing" && (
          <g>
            {/* S20: 直線的メカニカル4枚羽 */}
            <polygon
              points="60,12 38,24 8,22 18,48 10,74 36,88 60,108 84,88 110,74 102,48 112,22 82,24"
              fill={`url(#predWing-${season})`}
              stroke="#f1f5f9"
              strokeWidth="1.8"
            />
          </g>
        )}

        {meta.frameShape === "flame-crown" && (
          <g>
            {/* S19: 炎の王冠ウイング */}
            <polygon
              points="60,6 44,18 24,10 16,40 12,72 36,92 60,108 84,92 108,72 104,40 96,10 76,18"
              fill={`url(#predWing-${season})`}
              stroke="#fdba74"
              strokeWidth="1.8"
            />
          </g>
        )}

        {meta.frameShape === "reaper-wing" && (
          <g>
            {/* S18: 下向き死神鎌ウイング */}
            <polygon
              points="60,14 34,20 10,36 14,88 30,72 44,96 60,108 76,96 90,72 106,88 110,36 86,20"
              fill={`url(#predWing-${season})`}
              stroke="#f87171"
              strokeWidth="1.6"
            />
          </g>
        )}

        {(meta.frameShape === "hex-fang" || meta.frameShape === "classic") && (
          <g>
            {/* S17 / Classic: 重厚な六角形ガンメタル＋下部3本牙 */}
            <polygon
              points="60,10 22,28 16,70 36,98 48,88 60,112 72,88 84,98 104,70 98,28"
              fill={`url(#predWing-${season})`}
              stroke="#fca5a5"
              strokeWidth="1.6"
            />
          </g>
        )}

        {/* 内側のプレデターコア盾 */}
        <polygon
          points="60,18 32,34 36,74 60,96 84,74 88,34"
          fill={`url(#predCore-${season})`}
          stroke="#fecaca"
          strokeWidth="1.5"
        />

        {/* プレデタースカル（捕食者の牙・眼光モチーフ） */}
        <polygon points="60,26 43,44 48,68 60,80 72,68 77,44" fill="#18181b" />
        {/* 眼光 */}
        <polygon
          points="46,48 56,53 49,57"
          fill={isAnimated ? "#fef08a" : "#ef4444"}
        />
        <polygon
          points="74,48 64,53 71,57"
          fill={isAnimated ? "#fef08a" : "#ef4444"}
        />
        {/* 額のV字クレスト */}
        <polygon points="60,30 52,42 60,39 68,42" fill="#ef4444" />
        {/* 牙 */}
        <polygon points="52,62 56,73 60,65 64,73 68,62" fill="#dc2626" />

        {/* 下部の順位ナンバー刻印プレート（S17以降の特徴） */}
        <rect
          x="26"
          y="88"
          width="68"
          height="22"
          rx="5"
          fill="#09090b"
          stroke={isAnimated ? meta.secondaryColor : "#71717a"}
          strokeWidth="2"
        />
        <text
          x="60"
          y="103"
          textAnchor="middle"
          fill="#fafafa"
          fontSize="13"
          fontWeight="900"
          fontFamily="monospace"
        >
          {displayRank}
        </text>
      </svg>
    </div>
  );
}

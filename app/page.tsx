"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Sparkles,
  ExternalLink,
  Plus,
  MessageSquarePlus,
  RotateCcw,
  ThumbsUp,
} from "lucide-react";
import {
  FILTERABLE_ALL_SEASONS,
  INITIAL_PLAYERS,
  INITIAL_SIGHTINGS,
  NUMBERED_SEASONS,
  Platform,
  PostType,
  PredatorPlayerEntry,
  SightingPost,
  SplitType,
} from "@/lib/predator-data";
import {
  createSightingPost,
  fetchAllPlayers,
  fetchSightingsPosts,
  registerPredatorEntry,
} from "@/lib/supabase";
import { PredatorBadgeSvg } from "@/components/PredatorBadgeSvg";

export default function PredFinderPage() {
  const [players, setPlayers] = useState<PredatorPlayerEntry[]>(INITIAL_PLAYERS);
  const [posts, setPosts] = useState<SightingPost[]>(INITIAL_SIGHTINGS);
  const [dataSource, setDataSource] = useState<"supabase" | "local">("local");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 検索条件
  const [selectedSeason, setSelectedSeason] = useState<number | "all">("all");
  const [rankInput, setRankInput] = useState<string>("");
  const [rankTolerance, setRankTolerance] = useState<number>(0);
  const [splitFilter, setSplitFilter] = useState<"all" | "both" | "single">("all");
  const [platformFilter, setPlatformFilter] = useState<Platform>("PC");
  const [requiredOtherSeasons, setRequiredOtherSeasons] = useState<number[]>([]);
  const [keywordQuery, setKeywordQuery] = useState<string>("");

  // モーダル・タブ
  const [activeMainTab, setActiveMainTab] = useState<"search" | "board">("search");
  const [boardTab, setBoardTab] = useState<"all" | PostType>("all");
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [showPostModal, setShowPostModal] = useState<boolean>(false);
  const [displayLimit, setDisplayLimit] = useState<number>(40);

  // 掲示板投稿ステート
  const [postSeason, setPostSeason] = useState<number>(20);
  const [postRank, setPostRank] = useState<string>("");
  const [postSplit, setPostSplit] = useState<SplitType | "unknown">("both");
  const [postType, setPostType] = useState<PostType>("sighting");
  const [postSuspectName, setPostSuspectName] = useState<string>("");
  const [postOtherBadges, setPostOtherBadges] = useState<number[]>([]);
  const [postComment, setPostComment] = useState<string>("");
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);

  // DB登録ステート
  const [regName, setRegName] = useState<string>("");
  const [regRecordedIgn, setRegRecordedIgn] = useState<string>("");
  const [regSeason, setRegSeason] = useState<number>(20);
  const [regRank, setRegRank] = useState<string>("");
  const [regSplit, setRegSplit] = useState<SplitType>("both");
  const [regDevice, setRegDevice] = useState<"PAD" | "MnK" | "Unknown">("PAD");
  const [regOtherSeasons, setRegOtherSeasons] = useState<number[]>([]);
  const [regXUrl, setRegXUrl] = useState<string>("");
  const [regTwitchUrl, setRegTwitchUrl] = useState<string>("");
  const [regTrackerUrl, setRegTrackerUrl] = useState<string>("");
  const [isSubmittingReg, setIsSubmittingReg] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      const [{ players: loadedPlayers, source }, loadedPosts] = await Promise.all([
        fetchAllPlayers(),
        fetchSightingsPosts(),
      ]);
      if (!active) return;
      setPlayers(loadedPlayers);
      setDataSource(source);
      setPosts(loadedPosts);
      setIsLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const toggleOtherSeason = (s: number) => {
    setRequiredOtherSeasons((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const resetSearch = () => {
    setSelectedSeason("all");
    setRankInput("");
    setRankTolerance(0);
    setSplitFilter("all");
    setRequiredOtherSeasons([]);
    setKeywordQuery("");
  };

  const matchedPlayers = useMemo(() => {
    const parsedRank = rankInput.trim() !== "" ? parseInt(rankInput.trim(), 10) : null;
    const kw = keywordQuery.trim().toLowerCase();

    return players.filter((player) => {
      if (player.platform !== platformFilter) return false;

      if (kw) {
        const nameHit =
          player.currentName.toLowerCase().includes(kw) ||
          player.aliases.some((a) => a.toLowerCase().includes(kw)) ||
          player.achievements.some((ach) =>
            ach.recordedIgn.toLowerCase().includes(kw)
          );
        if (!nameHit) return false;
      }

      if (requiredOtherSeasons.length > 0) {
        const ownedSeasons = new Set(player.achievements.map((a) => a.season));
        if (!requiredOtherSeasons.every((reqS) => ownedSeasons.has(reqS))) {
          return false;
        }
      }

      const matchingAchievement = player.achievements.find((ach) => {
        if (selectedSeason !== "all" && ach.season !== selectedSeason) {
          return false;
        }
        if (splitFilter === "both") {
          if (ach.splitType !== "both" && ach.splitType !== "full") return false;
        } else if (splitFilter === "single") {
          if (ach.splitType !== "split1" && ach.splitType !== "split2")
            return false;
        }
        if (parsedRank !== null && !Number.isNaN(parsedRank)) {
          if (ach.rank === undefined) return false;
          if (Math.abs(ach.rank - parsedRank) > rankTolerance) return false;
        }
        return true;
      });

      return Boolean(matchingAchievement);
    });
  }, [
    players,
    platformFilter,
    keywordQuery,
    requiredOtherSeasons,
    selectedSeason,
    splitFilter,
    rankInput,
    rankTolerance,
  ]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => boardTab === "all" || p.postType === boardTab);
  }, [posts, boardTab]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postComment.trim()) return;
    setIsSubmittingPost(true);
    try {
      const created = await createSightingPost({
        season: postSeason,
        rank: postRank ? parseInt(postRank, 10) : undefined,
        splitType: postSplit,
        platform: platformFilter,
        postType,
        suspectPlayerName: postSuspectName,
        otherBadges: postOtherBadges,
        comment: postComment,
      });
      setPosts((prev) => [created, ...prev]);
      setPostComment("");
      setPostSuspectName("");
      setPostRank("");
      setShowPostModal(false);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleRegisterPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regRank.trim()) return;
    setIsSubmittingReg(true);
    try {
      const created = await registerPredatorEntry({
        currentName: regName.trim(),
        recordedIgn: regRecordedIgn.trim() || regName.trim(),
        season: regSeason,
        rank: parseInt(regRank, 10) || 1,
        splitType: regSplit,
        platform: platformFilter,
        inputDevice: regDevice,
        mainLegends: [],
        otherSeasons: regOtherSeasons,
        xUrl: regXUrl.trim() || undefined,
        twitchUrl: regTwitchUrl.trim() || undefined,
        trackerUrl: regTrackerUrl.trim() || undefined,
      });
      setPlayers((prev) => [created, ...prev]);
      setSelectedSeason(regSeason);
      setRankInput(regRank);
      setShowRegisterModal(false);
      setRegName("");
      setRegRecordedIgn("");
      setRegRank("");
    } finally {
      setIsSubmittingReg(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* シンプルヘッダー */}
      <header className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/badges/s20.png"
                alt="Predator"
                className="w-8 h-8 object-contain"
              />
              <span className="font-black tracking-wider text-base text-white">
                PRED FINDER
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  dataSource === "supabase" ? "bg-emerald-500" : "bg-zinc-600"
                }`}
                title={dataSource === "supabase" ? "Supabase Connected" : "Local"}
              />
            </div>

            {/* 検索 / 掲示板 切り替えタブ */}
            <nav className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveMainTab("search")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  activeMainTab === "search"
                    ? "bg-red-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                バッジ検索
              </button>
              <button
                onClick={() => setActiveMainTab("board")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  activeMainTab === "board"
                    ? "bg-red-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                掲示板 ({posts.length})
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://apexlegendsstatus.com/live-ranked-leaderboards/Battle_Royale/PC"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 inline-flex items-center gap-1"
            >
              <span>現役順位</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>DB登録</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {activeMainTab === "search" ? (
          <>
            {/* 検索パネル：大きなバッジ画像と最小限の入力欄 */}
            <section className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-4 sm:p-6 space-y-6">
              {/* 1. メインバッジ画像選択 (S17〜S29 特大サイズ) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">
                    シーズンバッジ (S17〜S29)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedSeason("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      selectedSeason === "all"
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    ALL (シーズン不明)
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {NUMBERED_SEASONS.map((sMeta) => {
                    const isSelected = selectedSeason === sMeta.season;
                    return (
                      <button
                        key={sMeta.season}
                        type="button"
                        onClick={() =>
                          setSelectedSeason(
                            isSelected ? "all" : sMeta.season
                          )
                        }
                        className={`rounded-2xl py-3 px-2 border flex flex-col items-center justify-center transition cursor-pointer ${
                          isSelected
                            ? "bg-red-950/60 border-red-500 ring-2 ring-red-500/70 shadow-lg shadow-red-950/50"
                            : "bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-600 hover:bg-zinc-900"
                        }`}
                      >
                        <PredatorBadgeSvg
                          season={sMeta.season}
                          rank={isSelected && rankInput ? rankInput : undefined}
                          splitType={splitFilter === "single" ? "split1" : "both"}
                          size="xl"
                          selected={isSelected}
                          showSeasonLabel
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. 順位入力 ＆ 両スプ/片スプ ＆ 名前フィルタ（1行） */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                {/* # 順位 */}
                <div className="sm:col-span-4 flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 font-mono font-black text-base">
                      #
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={750}
                      value={rankInput}
                      onChange={(e) => setRankInput(e.target.value)}
                      placeholder="順位 (1〜750)"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <select
                    value={rankTolerance}
                    onChange={(e) => setRankTolerance(Number(e.target.value))}
                    className="px-2 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-mono"
                  >
                    <option value={0}>±0</option>
                    <option value={3}>±3</option>
                    <option value={10}>±10</option>
                  </select>
                </div>

                {/* 両スプ / 片スプ */}
                <div className="sm:col-span-4 grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setSplitFilter("all")}
                    className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      splitFilter === "all"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    すべて
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitFilter("both")}
                    className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                      splitFilter === "both"
                        ? "bg-red-600/30 text-red-200 border border-red-500/50"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    両スプ
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitFilter("single")}
                    className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      splitFilter === "single"
                        ? "bg-zinc-800 text-zinc-200"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    片スプ
                  </button>
                </div>

                {/* 名前検索 + リセット */}
                <div className="sm:col-span-4 flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={keywordQuery}
                      onChange={(e) => setKeywordQuery(e.target.value)}
                      placeholder="名前・別名義..."
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={resetSearch}
                    title="リセット"
                    className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 3. 他シーズン所持絞り込み（見やすい大きめの実物バッジアイコン） */}
              <div className="pt-4 border-t border-zinc-800/70 space-y-2">
                <span className="text-xs font-bold text-zinc-400 block">
                  他枠バッジ絞り込み (S12〜S29)
                </span>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                  {FILTERABLE_ALL_SEASONS.map((sNum) => {
                    const active = requiredOtherSeasons.includes(sNum);
                    return (
                      <button
                        key={sNum}
                        type="button"
                        onClick={() => toggleOtherSeason(sNum)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                          active
                            ? "bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400"
                            : "bg-zinc-950 border-zinc-800/90 text-zinc-400 hover:border-zinc-600"
                        }`}
                      >
                        <img
                          src={`/badges/s${sNum}.png`}
                          alt={`S${sNum}`}
                          className="w-12 h-12 object-contain"
                        />
                        <span className="text-xs font-mono font-bold">
                          S{sNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 検索結果一覧（シンプル＆ビジュアル重視） */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-zinc-400">
                  検索結果 ({matchedPlayers.length})
                </span>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  読み込み中...
                </div>
              ) : matchedPlayers.length === 0 ? (
                <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-8 text-center space-y-3">
                  <div className="text-sm font-bold text-zinc-300">
                    該当データなし
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        if (selectedSeason !== "all") setPostSeason(selectedSeason);
                        if (rankInput) setPostRank(rankInput);
                        setPostType("question");
                        setShowPostModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
                    >
                      掲示板で聞く
                    </button>
                    <button
                      onClick={() => {
                        if (selectedSeason !== "all") setRegSeason(selectedSeason);
                        if (rankInput) setRegRank(rankInput);
                        setShowRegisterModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                    >
                      ＋ この順位を登録
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {matchedPlayers.slice(0, displayLimit).map((player) => (
                      <div
                        key={player.id}
                        className="rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 p-4 flex flex-col justify-between gap-4 transition"
                      >
                        {/* プレイヤー名 ＆ リンクボタン */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-white">
                                {player.currentName}
                              </h3>
                              {player.inputDevice !== "Unknown" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300">
                                  {player.inputDevice}
                                </span>
                              )}
                            </div>
                            {player.aliases.length > 0 && (
                              <div className="text-xs text-zinc-400 font-mono mt-0.5">
                                別名義: {player.aliases.join(" / ")}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {player.trackerUrl && (
                              <a
                                href={player.trackerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 inline-flex items-center gap-1"
                              >
                                <span>Tracker</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {player.xUrl && (
                              <a
                                href={player.xUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                              >
                                𝕏
                              </a>
                            )}
                            {player.twitchUrl && (
                              <a
                                href={player.twitchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-950/70 hover:bg-purple-900/70 text-purple-300 border border-purple-700/40"
                              >
                                Twitch
                              </a>
                            )}
                          </div>
                        </div>

                        {/* 所持プレデターバッジ画像一覧（一目でバナーと照合できる） */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-zinc-800/70">
                          {player.achievements.map((ach, idx) => {
                            const isTarget =
                              (selectedSeason !== "all" &&
                                ach.season === selectedSeason) ||
                              requiredOtherSeasons.includes(ach.season);

                            return (
                              <div
                                key={`${ach.season}-${idx}`}
                                className={`rounded-xl p-1.5 border flex flex-col items-center min-w-[58px] ${
                                  isTarget
                                    ? "bg-red-950/40 border-red-500"
                                    : "bg-zinc-950/70 border-zinc-800/80"
                                }`}
                                title={`当時の名前: ${ach.recordedIgn}`}
                              >
                                <PredatorBadgeSvg
                                  season={ach.season}
                                  rank={ach.rank}
                                  splitType={ach.splitType}
                                  size="md"
                                />
                                <span className="mt-1.5 text-[10px] font-mono font-bold text-zinc-300">
                                  S{ach.season}
                                  {ach.splitType === "both" ? "✨" : ""}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {matchedPlayers.length > displayLimit && (
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setDisplayLimit((prev) => prev + 60)}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 cursor-pointer"
                      >
                        もっと表示する（残り {matchedPlayers.length - displayLimit} 件）
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        ) : (
          /* 掲示板タブ */
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {(["all", "question", "identify", "sighting"] as const).map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => setBoardTab(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        boardTab === t
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {t === "all"
                        ? "すべて"
                        : t === "question"
                        ? "🕵️ 特定依頼"
                        : t === "identify"
                        ? "💡 情報提供"
                        : "👀 目撃"}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setShowPostModal(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>投稿する</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <PredatorBadgeSvg
                      season={post.season}
                      rank={post.rank}
                      splitType={post.splitType}
                      size="sm"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-black text-white">
                          S{post.season} {post.rank ? `#${post.rank}` : ""}
                        </span>
                        {post.suspectPlayerName && (
                          <span className="text-xs font-bold text-amber-300">
                            ➔ {post.suspectPlayerName}
                          </span>
                        )}
                        {post.otherBadges.map((b) => (
                          <span
                            key={b}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300"
                          >
                            +S{b}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-200">{post.comment}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPosts((prev) =>
                        prev.map((item) =>
                          item.id === post.id
                            ? { ...item, likes: item.likes + 1 }
                            : item
                        )
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <ThumbsUp className="w-3 h-3 text-amber-400" />
                    <span>{post.likes}</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 掲示板投稿モーダル */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePost}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">掲示板に投稿</h3>
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as PostType)}
                className="px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              >
                <option value="question">🕵️ 特定依頼</option>
                <option value="identify">💡 情報提供</option>
                <option value="sighting">👀 目撃</option>
              </select>
              <select
                value={postSeason}
                onChange={(e) => setPostSeason(Number(e.target.value))}
                className="px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              >
                {NUMBERED_SEASONS.map((s) => (
                  <option key={s.season} value={s.season}>
                    S{s.season}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={750}
                value={postRank}
                onChange={(e) => setPostRank(e.target.value)}
                placeholder="#順位"
                className="px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white font-mono"
              />
            </div>

            <input
              type="text"
              value={postSuspectName}
              onChange={(e) => setPostSuspectName(e.target.value)}
              placeholder="プレイヤー名（わかる場合）"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
            />

            <textarea
              rows={3}
              required
              value={postComment}
              onChange={(e) => setPostComment(e.target.value)}
              placeholder="コメントを入力..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-300 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmittingPost}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-zinc-950 cursor-pointer"
              >
                {isSubmittingPost ? "送信中..." : "投稿"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DB新規登録モーダル */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRegisterPlayer}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">
                プレデター順位をDB登録
              </h3>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="プレイヤー名 *"
                className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              />
              <input
                type="text"
                value={regRecordedIgn}
                onChange={(e) => setRegRecordedIgn(e.target.value)}
                placeholder="当時の表記・別名義"
                className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <select
                value={regSeason}
                onChange={(e) => setRegSeason(Number(e.target.value))}
                className="px-2 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              >
                {NUMBERED_SEASONS.map((s) => (
                  <option key={s.season} value={s.season}>
                    S{s.season}
                  </option>
                ))}
              </select>
              <input
                type="number"
                required
                min={1}
                max={750}
                value={regRank}
                onChange={(e) => setRegRank(e.target.value)}
                placeholder="#順位 *"
                className="px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white font-mono"
              />
              <select
                value={regSplit}
                onChange={(e) => setRegSplit(e.target.value as SplitType)}
                className="px-2 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              >
                <option value="both">両スプ</option>
                <option value="split1">片スプ1</option>
                <option value="split2">片スプ2</option>
                <option value="full">通期</option>
              </select>
              <select
                value={regDevice}
                onChange={(e) =>
                  setRegDevice(e.target.value as "PAD" | "MnK" | "Unknown")
                }
                className="px-2 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              >
                <option value="PAD">PAD</option>
                <option value="MnK">MnK</option>
                <option value="Unknown">不明</option>
              </select>
            </div>

            <div>
              <span className="text-[11px] text-zinc-400 block mb-1">
                他シーズン所持バッジ
              </span>
              <div className="flex flex-wrap gap-1">
                {FILTERABLE_ALL_SEASONS.map((s) => {
                  const active = regOtherSeasons.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setRegOtherSeasons((prev) =>
                          prev.includes(s)
                            ? prev.filter((item) => item !== s)
                            : [...prev, s]
                        )
                      }
                      className={`px-2 py-1 rounded text-[11px] font-mono border cursor-pointer ${
                        active
                          ? "bg-red-500/20 border-red-400 text-red-200"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      S{s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="url"
                value={regTrackerUrl}
                onChange={(e) => setRegTrackerUrl(e.target.value)}
                placeholder="Tracker URL"
                className="px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              />
              <input
                type="url"
                value={regXUrl}
                onChange={(e) => setRegXUrl(e.target.value)}
                placeholder="X URL"
                className="px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              />
              <input
                type="url"
                value={regTwitchUrl}
                onChange={(e) => setRegTwitchUrl(e.target.value)}
                placeholder="Twitch URL"
                className="px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-300 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmittingReg}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white cursor-pointer"
              >
                {isSubmittingReg ? "保存中..." : "登録"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

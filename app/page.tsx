"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Sparkles,
  ShieldAlert,
  ExternalLink,
  PlusCircle,
  MessageSquarePlus,
  Filter,
  CheckCircle2,
  Gamepad2,
  Tv,
  Globe,
  HelpCircle,
  Eye,
  Lightbulb,
  RotateCcw,
  Database,
  Flame,
  ThumbsUp,
  Layers,
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
  // データ状態
  const [players, setPlayers] = useState<PredatorPlayerEntry[]>(INITIAL_PLAYERS);
  const [posts, setPosts] = useState<SightingPost[]>(INITIAL_SIGHTINGS);
  const [dataSource, setDataSource] = useState<"supabase" | "local">("local");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 検索・フィルタ状態
  const [selectedSeason, setSelectedSeason] = useState<number | "all">(20);
  const [rankInput, setRankInput] = useState<string>("");
  const [rankTolerance, setRankTolerance] = useState<number>(0); // 0: ピンポイント, 3: ±3位
  const [splitFilter, setSplitFilter] = useState<"all" | "both" | "single">("all");
  const [platformFilter, setPlatformFilter] = useState<Platform>("PC");
  const [requiredOtherSeasons, setRequiredOtherSeasons] = useState<number[]>([]);
  const [keywordQuery, setKeywordQuery] = useState<string>("");

  // 掲示板フィルタ＆投稿フォーム状態
  const [boardTab, setBoardTab] = useState<"all" | PostType>("all");
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [showPostForm, setShowPostForm] = useState<boolean>(false);

  // 新規掲示板投稿用ステート
  const [postSeason, setPostSeason] = useState<number>(20);
  const [postRank, setPostRank] = useState<string>("");
  const [postSplit, setPostSplit] = useState<SplitType | "unknown">("both");
  const [postType, setPostType] = useState<PostType>("sighting");
  const [postSuspectName, setPostSuspectName] = useState<string>("");
  const [postLegend, setPostLegend] = useState<string>("");
  const [postOtherBadges, setPostOtherBadges] = useState<number[]>([]);
  const [postComment, setPostComment] = useState<string>("");
  const [postAuthor, setPostAuthor] = useState<string>("");
  const [postTrackerUrl, setPostTrackerUrl] = useState<string>("");
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);

  // 新規DB登録モーダル用ステート
  const [regName, setRegName] = useState<string>("");
  const [regRecordedIgn, setRegRecordedIgn] = useState<string>("");
  const [regSeason, setRegSeason] = useState<number>(20);
  const [regRank, setRegRank] = useState<string>("");
  const [regSplit, setRegSplit] = useState<SplitType>("both");
  const [regPlatform, setRegPlatform] = useState<Platform>("PC");
  const [regDevice, setRegDevice] = useState<"PAD" | "MnK" | "Unknown">("PAD");
  const [regLegends, setRegLegends] = useState<string>("ホライゾン, パスファインダー");
  const [regOtherSeasons, setRegOtherSeasons] = useState<number[]>([]);
  const [regXUrl, setRegXUrl] = useState<string>("");
  const [regTwitchUrl, setRegTwitchUrl] = useState<string>("");
  const [regTrackerUrl, setRegTrackerUrl] = useState<string>("");
  const [regBio, setRegBio] = useState<string>("");
  const [isSubmittingReg, setIsSubmittingReg] = useState<boolean>(false);

  // 初回データロード
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

  // 他シーズン必須フィルタのトグル
  const toggleOtherSeason = (s: number) => {
    setRequiredOtherSeasons((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  // 検索リセット
  const resetSearch = () => {
    setSelectedSeason("all");
    setRankInput("");
    setRankTolerance(0);
    setSplitFilter("all");
    setPlatformFilter("PC");
    setRequiredOtherSeasons([]);
    setKeywordQuery("");
  };

  // 検索・照合ロジック
  const matchedPlayers = useMemo(() => {
    const parsedRank = rankInput.trim() !== "" ? parseInt(rankInput.trim(), 10) : null;
    const kw = keywordQuery.trim().toLowerCase();

    return players
      .filter((player) => {
        // 1. プラットフォーム一致
        if (player.platform !== platformFilter) return false;

        // 2. キーワード検索（指定時）
        if (kw) {
          const nameHit =
            player.currentName.toLowerCase().includes(kw) ||
            player.aliases.some((a) => a.toLowerCase().includes(kw)) ||
            player.mainLegends.some((l) => l.toLowerCase().includes(kw)) ||
            player.achievements.some((ach) =>
              ach.recordedIgn.toLowerCase().includes(kw)
            );
          if (!nameHit) return false;
        }

        // 3. 「どのシーズンいってるか（他枠バッジ）」のAND絞り込み
        if (requiredOtherSeasons.length > 0) {
          const ownedSeasons = new Set(player.achievements.map((a) => a.season));
          const hasAllRequired = requiredOtherSeasons.every((reqS) =>
            ownedSeasons.has(reqS)
          );
          if (!hasAllRequired) return false;
        }

        // 4. メインの「シーズン × 順位 × 両スプ/片スプ」照合
        const matchingAchievement = player.achievements.find((ach) => {
          // シーズン条件
          if (selectedSeason !== "all" && ach.season !== selectedSeason) {
            return false;
          }
          // 両スプ / 片スプ条件
          if (splitFilter === "both") {
            if (ach.splitType !== "both" && ach.splitType !== "full") return false;
          } else if (splitFilter === "single") {
            if (ach.splitType !== "split1" && ach.splitType !== "split2")
              return false;
          }
          // 順位条件
          if (parsedRank !== null && !Number.isNaN(parsedRank)) {
            if (ach.rank === undefined) return false;
            if (Math.abs(ach.rank - parsedRank) > rankTolerance) return false;
          }
          return true;
        });

        return Boolean(matchingAchievement);
      })
      .sort((a, b) => b.verifiedCount - a.verifiedCount);
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

  // 掲示板のフィルタリング（現在の検索条件やタブに連動）
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (boardTab !== "all" && p.postType !== boardTab) return false;
      return true;
    });
  }, [posts, boardTab]);

  // 現在の選択シーズンのメタ情報
  const currentSeasonMeta = useMemo(() => {
    if (selectedSeason === "all") return null;
    return NUMBERED_SEASONS.find((s) => s.season === selectedSeason) || null;
  }, [selectedSeason]);

  // 掲示板への新規投稿ハンドラ
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
        legendUsed: postLegend,
        comment: postComment,
        authorName: postAuthor,
        trackerUrl: postTrackerUrl,
      });
      setPosts((prev) => [created, ...prev]);
      setPostComment("");
      setPostSuspectName("");
      setPostRank("");
      setShowPostForm(false);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // 新規プレデター登録ハンドラ
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
        platform: regPlatform,
        inputDevice: regDevice,
        mainLegends: regLegends
          .split(/[,、/]/)
          .map((s) => s.trim())
          .filter(Boolean),
        otherSeasons: regOtherSeasons,
        xUrl: regXUrl.trim() || undefined,
        twitchUrl: regTwitchUrl.trim() || undefined,
        trackerUrl: regTrackerUrl.trim() || undefined,
        bioNote: regBio.trim() || undefined,
      });
      setPlayers((prev) => [created, ...prev]);
      setSelectedSeason(regSeason);
      setRankInput(regRank);
      setShowRegisterModal(false);
      setRegName("");
      setRegRecordedIgn("");
      setRegRank("");
      setRegBio("");
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // 検証・発表会デモ用のプリセットボタン
  const applyDemoPreset = (preset: "cheeky" | "collision" | "onechar" | "multi") => {
    resetSearch();
    if (preset === "cheeky") {
      setSelectedSeason(20);
      setRankInput("2");
      setSplitFilter("both");
      setRequiredOtherSeasons([17, 18]);
    } else if (preset === "collision") {
      // S20 #14 で両スプ(YukaF)と片スプ(Kuroba_sub)が2人ヒットし、光り方やS14バッジ有無で絞り込めるデモ
      setSelectedSeason(20);
      setRankInput("14");
      setSplitFilter("all");
      setRequiredOtherSeasons([]);
    } else if (preset === "onechar") {
      // S18 #6 当時の名前が「あ」のプレイヤー特定デモ
      setSelectedSeason(18);
      setRankInput("6");
      setSplitFilter("all");
    } else if (preset === "multi") {
      // 順位が見えなくても「S18 + S20 + S21」の複数バッジから絞り込むデモ
      setSelectedSeason("all");
      setRankInput("");
      setRequiredOtherSeasons([18, 20, 21]);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* トップナビゲーションバー */}
      <header className="sticky top-0 z-30 border-b border-red-950/60 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 p-0.5 shadow-lg shadow-red-600/25">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-red-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-wider bg-gradient-to-r from-white via-red-200 to-red-500 bg-clip-text text-transparent">
                  PRED FINDER
                </h1>
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                  S17-S24 Badge DB
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                バナー・デスボックスの「プレデターバッジ（シーズン・順位・両スプ発光・他枠バッジ）」から匿名プレイヤーを特定
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* DB接続ステータス */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                dataSource === "supabase"
                  ? "bg-emerald-950/50 border-emerald-700/50 text-emerald-300"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
              }`}
              title={
                dataSource === "supabase"
                  ? "Supabase PostgreSQL データベースとリアルタイム同期中"
                  : "初期シードデータ＋ブラウザ保存モードで動作中（Supabaseキー設定でクラウド同期化）"
              }
            >
              <Database className="w-3.5 h-3.5" />
              <span>
                {dataSource === "supabase" ? "Supabase DB 接続中" : "Local / Seed DB"}
              </span>
            </div>

            {/* 現役プレデター順位サイトへのショートカット */}
            <a
              href="https://apexlegendsstatus.com/live-ranked-leaderboards/Battle_Royale/PC"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition"
            >
              <Globe className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">現役順位表 (ALS)</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            {/* DB新規登録ボタン */}
            <button
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-amber-500 text-white shadow-md shadow-red-600/25 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>順位情報をDB登録</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8 flex-1">
        {/* クイックデモ・シナリオバー（授業発表＆テスト用） */}
        <section className="rounded-xl bg-gradient-to-r from-red-950/30 via-zinc-900/90 to-zinc-900 border border-red-900/40 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-white">ワンクリック特定デモ:</span>
            <span className="text-zinc-400 hidden md:inline">
              バナーやデスボで見かけた状況を再現してすぐ検索できます
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => applyDemoPreset("cheeky")}
              className="px-2.5 py-1 rounded-md text-xs bg-zinc-800/90 hover:bg-red-950/70 hover:text-red-200 border border-zinc-700/80 transition cursor-pointer"
            >
              ① S20 #2 両スプ＋S17/S18 (cheeky)
            </button>
            <button
              onClick={() => applyDemoPreset("collision")}
              className="px-2.5 py-1 rounded-md text-xs bg-zinc-800/90 hover:bg-red-950/70 hover:text-red-200 border border-zinc-700/80 transition cursor-pointer"
            >
              ② S20 #14 両スプvs片スプ判別デモ
            </button>
            <button
              onClick={() => applyDemoPreset("onechar")}
              className="px-2.5 py-1 rounded-md text-xs bg-zinc-800/90 hover:bg-red-950/70 hover:text-red-200 border border-zinc-700/80 transition cursor-pointer"
            >
              ③ S18 #6 当時の名前『あ』を特定
            </button>
            <button
              onClick={() => applyDemoPreset("multi")}
              className="px-2.5 py-1 rounded-md text-xs bg-zinc-800/90 hover:bg-red-950/70 hover:text-red-200 border border-zinc-700/80 transition cursor-pointer"
            >
              ④ 順位不明でS18+S20+S21所持から特定
            </button>
          </div>
        </section>

        {/* メイン照合コンソール：バナープレビュー ＆ バッジ・順位・両スプ・他シーズン選択 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左カラム (4列): 選択中バッジのリアルタイム・バナープレビュー */}
          <div className="lg:col-span-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-52 h-52 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Deathbox / Banner Preview
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                  {platformFilter}
                </span>
              </div>

              {/* 模擬デスボックス・バナー枠 */}
              <div className="rounded-xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-red-950/30 border border-zinc-800/90 p-5 flex flex-col items-center text-center shadow-inner">
                <div className="text-xs font-mono text-zinc-500 mb-2">
                  Anonymous_Player{rankInput || "750"}
                </div>

                {/* メインバッジ表示 + 残り2枠のサブバッジ */}
                <div className="flex items-center justify-center gap-3 my-2">
                  <PredatorBadgeSvg
                    season={selectedSeason === "all" ? 20 : selectedSeason}
                    rank={rankInput || "???"}
                    splitType={
                      splitFilter === "both"
                        ? "both"
                        : splitFilter === "single"
                        ? "split1"
                        : "both"
                    }
                    size="lg"
                  />
                  {requiredOtherSeasons.slice(0, 2).map((subSeason) => (
                    <div key={subSeason} className="opacity-90">
                      <PredatorBadgeSvg
                        season={subSeason}
                        rank={subSeason >= 17 ? "PRED" : undefined}
                        splitType="both"
                        size="md"
                      />
                    </div>
                  ))}
                </div>

                {/* 選択中シーズンの視覚特徴ガイド */}
                <div className="mt-3 pt-3 border-t border-zinc-800/80 w-full">
                  {currentSeasonMeta ? (
                    <>
                      <div className="text-sm font-bold text-white">
                        {currentSeasonMeta.jpTitle}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        🔍 見分け方: {currentSeasonMeta.visualFeature}
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-800 text-amber-300">
                        {currentSeasonMeta.hasSplits
                          ? "スプリット制あり（両スプ維持でアニメーション発光）"
                          : "スプリットなし（通期順位ナンバー刻印）"}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-bold text-amber-300">
                        全シーズン横断モード (S17〜S24)
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        バッジのデザインがどのシーズンか分からなくても、順位の数字や他枠のバッジから一括検索します。
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 検索ヒット件数サマリー */}
            <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-zinc-400">現在の条件での特定候補</div>
                <div className="text-2xl font-black text-white">
                  {matchedPlayers.length}{" "}
                  <span className="text-sm font-normal text-zinc-400">名ヒット</span>
                </div>
              </div>
              <button
                onClick={resetSearch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                条件クリア
              </button>
            </div>
          </div>

          {/* 右カラム (8列): STEP 1〜3 の視覚的検索フォーム */}
          <div className="lg:col-span-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 space-y-6">
            {/* STEP 1: バッジの絵柄からシーズンを選択 */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-mono">
                    1
                  </span>
                  バッジの見た目からシーズンを選択（S17以降が順位ナンバー刻印対象）
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedSeason("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    selectedSeason === "all"
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  🔍 シーズン不明（全シーズンから順位で探す）
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {NUMBERED_SEASONS.map((sMeta) => {
                  const isSelected = selectedSeason === sMeta.season;
                  return (
                    <button
                      key={sMeta.season}
                      type="button"
                      onClick={() => setSelectedSeason(sMeta.season)}
                      className={`group rounded-xl p-2.5 border text-left transition flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? "bg-red-950/50 border-red-500 ring-1 ring-red-500/50 shadow-lg shadow-red-950/50"
                          : "bg-zinc-950/70 border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <PredatorBadgeSvg
                        season={sMeta.season}
                        rank={rankInput || sMeta.season}
                        splitType={splitFilter === "single" ? "split1" : "both"}
                        size="sm"
                        selected={isSelected}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white group-hover:text-red-300 transition truncate">
                          {sMeta.jpTitle}
                        </div>
                        <div className="text-[10px] text-zinc-400 line-clamp-2 leading-tight mt-0.5">
                          {sMeta.visualFeature}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: 順位ナンバー (#1〜#750) ＆ 両スプ発光かどうか */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-zinc-800/80">
              {/* 順位入力 */}
              <div className="md:col-span-5">
                <label className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-mono">
                    2
                  </span>
                  バッジ下部の順位ナンバー (#1〜750)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400 font-mono font-bold">
                      #
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={750}
                      value={rankInput}
                      onChange={(e) => setRankInput(e.target.value)}
                      placeholder="例: 2, 14, 88 (空欄で全順位)"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <select
                    value={rankTolerance}
                    onChange={(e) => setRankTolerance(Number(e.target.value))}
                    className="px-2.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-red-500"
                    title="デスボの数字が潰れて読みにくい時は±誤差検索が使えます"
                  >
                    <option value={0}>完全一致</option>
                    <option value={3}>±3位許容</option>
                    <option value={10}>±10位許容</option>
                  </select>
                </div>
              </div>

              {/* 両スプ（アニメーション発光）か片スプか */}
              <div className="md:col-span-5">
                <label className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-mono">
                    3
                  </span>
                  両スプ維持（アニメーション発光）か
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setSplitFilter("all")}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      splitFilter === "all"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    すべて
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitFilter("both")}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer ${
                      splitFilter === "both"
                        ? "bg-red-600/30 border border-red-500/60 text-red-200"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    両スプ(光)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitFilter("single")}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      splitFilter === "single"
                        ? "bg-zinc-800 border border-zinc-600 text-zinc-200"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    片スプ(静止)
                  </button>
                </div>
              </div>

              {/* プラットフォーム (PC最優先) */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-zinc-400 block mb-2">
                  機種 (PC優先)
                </label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value as Platform)}
                  className="w-full px-2.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-semibold text-white focus:outline-none focus:border-red-500"
                >
                  <option value="PC">💻 PC</option>
                  <option value="PS">🎮 PS</option>
                  <option value="Xbox">🎮 Xbox</option>
                  <option value="Switch">🎮 Switch</option>
                </select>
              </div>
            </div>

            {/* STEP 4: 他にどのシーズンのプレデターバッジを付けているか（複数シーズン絞り込み） */}
            <div className="pt-4 border-t border-zinc-800/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 text-xs flex items-center justify-center font-mono font-black">
                    +
                  </span>
                  <span>
                    一緒に付けていた他シーズンのプレデターバッジで絞り込む（バナーの残り2枠照合）
                  </span>
                </label>
                {requiredOtherSeasons.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRequiredOtherSeasons([])}
                    className="text-xs text-red-400 hover:underline cursor-pointer"
                  >
                    選択解除 ({requiredOtherSeasons.length})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {FILTERABLE_ALL_SEASONS.map((sNum) => {
                  const active = requiredOtherSeasons.includes(sNum);
                  return (
                    <button
                      key={sNum}
                      type="button"
                      onClick={() => toggleOtherSeason(sNum)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition flex items-center gap-1 cursor-pointer ${
                        active
                          ? "bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <span>S{sNum}</span>
                      {active && <CheckCircle2 className="w-3 h-3 text-amber-400" />}
                    </button>
                  );
                })}
              </div>

              {/* キーワード・名前・レジェンド逆引き */}
              <div className="relative pt-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={keywordQuery}
                  onChange={(e) => setKeywordQuery(e.target.value)}
                  placeholder="プレイヤー名・当時のランキング名（『.』『あ』等）・使用キャラ（パスファインダー、ホライゾン等）でさらに絞り込み..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-950/90 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 特定結果プレイヤーカード一覧 */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-red-500" />
              <span>特定候補プレイヤー ({matchedPlayers.length}件)</span>
            </h2>
            <p className="text-xs text-zinc-400">
              バナーの残り2枠のバッジと「獲得プレデター履歴」を見比べると100%答え合わせできます
            </p>
          </div>

          {isLoading ? (
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-12 text-center text-zinc-400 text-sm">
              データベースを照合中...
            </div>
          ) : matchedPlayers.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-8 text-center space-y-4">
              <div className="text-base font-bold text-zinc-200">
                該当するプレデター情報がまだDBに登録されていません
              </div>
              <p className="text-xs text-zinc-400 max-w-xl mx-auto">
                下の掲示板に「このシーズン×順位の匿名プレデター誰？」と特定依頼を書き込むか、もし正体を知っている場合はDBへ新規登録して共有できます！
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    if (selectedSeason !== "all") setPostSeason(selectedSeason);
                    if (rankInput) setPostRank(rankInput);
                    setPostType("question");
                    setShowPostForm(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  この条件で掲示板に「特定依頼」を出す
                </button>
                <button
                  onClick={() => {
                    if (selectedSeason !== "all") setRegSeason(selectedSeason);
                    if (rankInput) setRegRank(rankInput);
                    setShowRegisterModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  この順位のプレイヤーを新規登録する
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedPlayers.map((player) => {
                const parsedRank =
                  rankInput.trim() !== "" ? parseInt(rankInput.trim(), 10) : null;
                const exactHit = player.achievements.find(
                  (a) =>
                    (selectedSeason === "all" || a.season === selectedSeason) &&
                    (parsedRank === null || a.rank === parsedRank)
                );

                return (
                  <div
                    key={player.id}
                    className="rounded-2xl bg-zinc-900/95 border border-zinc-800 hover:border-red-500/50 transition p-5 flex flex-col justify-between gap-4 shadow-lg"
                  >
                    <div className="space-y-3">
                      {/* 上段：プレイヤー名・デバイス・特定確度 */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-white">
                              {player.currentName}
                            </h3>
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1">
                              <Gamepad2 className="w-3 h-3 text-red-400" />
                              {player.inputDevice}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-red-950/60 text-red-300 border border-red-800/50">
                              👍 特定報告 {player.verifiedCount}
                            </span>
                          </div>
                          {player.aliases.length > 0 && (
                            <div className="text-xs text-zinc-400 mt-1">
                              当時の表記 / 別名義:{" "}
                              <span className="text-zinc-200 font-mono">
                                {player.aliases.join(" / ")}
                              </span>
                            </div>
                          )}
                        </div>

                        {exactHit && exactHit.rank !== undefined && (
                          <div className="shrink-0 text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                              S{exactHit.season} #{exactHit.rank}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 使用レジェンド＆特徴メモ */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {player.mainLegends.map((leg) => (
                          <span
                            key={leg}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300"
                          >
                            🎯 {leg}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                        {player.bioNote}
                      </p>

                      {/* 獲得プレデター履歴一覧（バナーの残り2枠との答え合わせ用！） */}
                      <div className="space-y-2 pt-1">
                        <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            獲得プレデター履歴（バナーの残り2枠バッジと答え合わせ）
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {player.achievements.map((ach, idx) => {
                            const isTargetSeason =
                              selectedSeason !== "all" &&
                              ach.season === selectedSeason;
                            const isRequiredSub = requiredOtherSeasons.includes(
                              ach.season
                            );
                            return (
                              <div
                                key={`${ach.season}-${idx}`}
                                className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
                                  isTargetSeason
                                    ? "bg-red-950/60 border-red-500 text-white"
                                    : isRequiredSub
                                    ? "bg-amber-950/40 border-amber-500/70 text-amber-200"
                                    : "bg-zinc-950 border-zinc-800 text-zinc-300"
                                }`}
                              >
                                <span className="font-mono font-black">
                                  S{ach.season}
                                </span>
                                {ach.rank !== undefined && (
                                  <span className="font-mono text-red-400 font-bold">
                                    #{ach.rank}
                                  </span>
                                )}
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300">
                                  {ach.splitType === "both"
                                    ? "✨両スプ"
                                    : ach.splitType === "full"
                                    ? "🏆通期"
                                    : ach.splitType === "split1"
                                    ? "片スプ(1)"
                                    : "片スプ(2)"}
                                </span>
                                <span
                                  className="text-[10px] text-zinc-400 font-mono truncate max-w-[90px]"
                                  title={`当時の表記名: ${ach.recordedIgn}`}
                                >
                                  ({ach.recordedIgn})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 下段：SNS・配信・トラッカーサイト直通リンク */}
                    <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {player.trackerUrl && (
                          <a
                            href={player.trackerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 transition"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Tracker / 戦績</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {player.xUrl && (
                          <a
                            href={player.xUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                          >
                            <span>𝕏 (Twitter)</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        )}
                        {player.twitchUrl && (
                          <a
                            href={player.twitchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-700/40 transition"
                          >
                            <Tv className="w-3.5 h-3.5" />
                            <span>Twitch配信</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        )}
                        {player.youtubeUrl && (
                          <a
                            href={player.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-red-300 transition"
                          >
                            <span>YouTube</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const firstAch = player.achievements[0];
                          if (firstAch) {
                            setPostSeason(firstAch.season);
                            setPostRank(
                              firstAch.rank ? String(firstAch.rank) : ""
                            );
                          }
                          setPostSuspectName(player.currentName);
                          setPostType("sighting");
                          setShowPostForm(true);
                        }}
                        className="text-xs text-zinc-400 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        <span>目撃・補足情報を書く</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 情報提供・目撃掲示板セクション */}
        <section className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-amber-400" />
                <span>匿名プレデター目撃・情報提供ボード（掲示板）</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                「さっき東京鯖にいたS22 #418の匿名レヴ誰？」「S18 #6の名前『あ』は〇〇さん」など自由に情報交換できます
              </p>
            </div>

            <button
              onClick={() => setShowPostForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>{showPostForm ? "フォームを閉じる" : "＋ 掲示板に書き込む"}</span>
            </button>
          </div>

          {/* 掲示板タブ切り替え */}
          <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
            <button
              onClick={() => setBoardTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                boardTab === "all"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              すべて ({posts.length})
            </button>
            <button
              onClick={() => setBoardTab("question")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                boardTab === "question"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              特定依頼（このバッジ誰？）
            </button>
            <button
              onClick={() => setBoardTab("identify")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                boardTab === "identify"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              正体・サブ垢情報提供
            </button>
            <button
              onClick={() => setBoardTab("sighting")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                boardTab === "sighting"
                  ? "bg-red-500/20 text-red-300 border border-red-500/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              マッチ目撃報告
            </button>
          </div>

          {/* 掲示板書き込みフォーム */}
          {showPostForm && (
            <form
              onSubmit={handleCreatePost}
              className="rounded-xl bg-zinc-950 border border-amber-500/40 p-4 space-y-4"
            >
              <div className="text-xs font-bold text-amber-300">
                📝 新規スレッド・目撃情報の投稿
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    投稿種別
                  </label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as PostType)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                  >
                    <option value="sighting">👀 目撃報告（マッチにいた）</option>
                    <option value="identify">💡 情報提供（正体・サブ垢特定）</option>
                    <option value="question">🕵️ 特定依頼（このバッジ誰？）</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    バッジのシーズン
                  </label>
                  <select
                    value={postSeason}
                    onChange={(e) => setPostSeason(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                  >
                    {NUMBERED_SEASONS.map((s) => (
                      <option key={s.season} value={s.season}>
                        {s.jpTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    バッジの順位 (#1〜750)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={750}
                    value={postRank}
                    onChange={(e) => setPostRank(e.target.value)}
                    placeholder="例: 418 (不明なら空欄)"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    光り方（両スプ/片スプ）
                  </label>
                  <select
                    value={postSplit}
                    onChange={(e) =>
                      setPostSplit(e.target.value as SplitType | "unknown")
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                  >
                    <option value="both">✨ 両スプ（発光）</option>
                    <option value="split1">🛡️ 片スプ（静止）</option>
                    <option value="unknown">❓ 不明</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    プレイヤー名（判明している場合）
                  </label>
                  <input
                    type="text"
                    value={postSuspectName}
                    onChange={(e) => setPostSuspectName(e.target.value)}
                    placeholder="例: cheeky / 不明（情報求む）"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    使用していたレジェンド
                  </label>
                  <input
                    type="text"
                    value={postLegend}
                    onChange={(e) => setPostLegend(e.target.value)}
                    placeholder="例: ホライゾン / パスファインダー"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    投稿者ネーム（省略可）
                  </label>
                  <input
                    type="text"
                    value={postAuthor}
                    onChange={(e) => setPostAuthor(e.target.value)}
                    placeholder="名無しのレジェンド"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  一緒に付けていた他シーズンのプレデターバッジ（複数選択可）
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FILTERABLE_ALL_SEASONS.map((s) => {
                    const active = postOtherBadges.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setPostOtherBadges((prev) =>
                            prev.includes(s)
                              ? prev.filter((item) => item !== s)
                              : [...prev, s]
                          )
                        }
                        className={`px-2 py-1 rounded text-[11px] font-mono border cursor-pointer ${
                          active
                            ? "bg-amber-500/20 border-amber-400 text-amber-200"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400"
                        }`}
                      >
                        S{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  コメント・目撃状況・根拠など（必須）
                </label>
                <textarea
                  rows={3}
                  required
                  value={postComment}
                  onChange={(e) => setPostComment(e.target.value)}
                  placeholder="例: 東京鯖の夜ランクで匿名ホライゾン（S20 #14 両スプ＋S14プレバッジ）に遭遇しました。配信見たら〇〇さんでした！"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPostForm(false)}
                  className="px-4 py-2 rounded-lg text-xs bg-zinc-800 text-zinc-300 cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPost}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer"
                >
                  {isSubmittingPost ? "送信中..." : "掲示板に投稿する"}
                </button>
              </div>
            </form>
          )}

          {/* 投稿リスト */}
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl bg-zinc-950/90 border border-zinc-800/90 p-4 flex flex-col sm:flex-row items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="shrink-0">
                    <PredatorBadgeSvg
                      season={post.season}
                      rank={post.rank}
                      splitType={post.splitType}
                      size="sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          post.postType === "question"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : post.postType === "identify"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {post.postType === "question"
                          ? "🕵️ 特定依頼"
                          : post.postType === "identify"
                          ? "💡 情報提供"
                          : "👀 目撃報告"}
                      </span>

                      <span className="text-xs font-mono font-bold text-white">
                        S{post.season} {post.rank ? `#${post.rank}` : "#順位不明"}
                      </span>

                      {post.suspectPlayerName && (
                        <span className="text-xs font-bold text-amber-300">
                          ➔ {post.suspectPlayerName}
                        </span>
                      )}

                      {post.legendUsed && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400">
                          使用: {post.legendUsed}
                        </span>
                      )}

                      {post.otherBadges.length > 0 && (
                        <span className="text-[11px] font-mono text-zinc-400">
                          他枠バッジ: {post.otherBadges.map((b) => `S${b}`).join(", ")}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-200 leading-relaxed">
                      {post.comment}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 pt-1">
                      <span>投稿: {post.authorName}</span>
                      <span>• {post.createdAt}</span>
                      {post.trackerUrl && (
                        <a
                          href={post.trackerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-400 hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Trackerリンク</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0 self-stretch sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setPosts((prev) =>
                        prev.map((item) =>
                          item.id === post.id
                            ? { ...item, likes: item.likes + 1 }
                            : item
                        )
                      );
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 cursor-pointer"
                  >
                    <ThumbsUp className="w-3 h-3 text-amber-400" />
                    <span>{post.likes}</span>
                  </button>

                  {post.rank && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSeason(post.season);
                        setRankInput(String(post.rank));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-[11px] text-red-400 hover:underline cursor-pointer"
                    >
                      この条件でDB照合 ↑
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 新規プレデター順位・プレイヤーDB登録モーダル */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-red-500" />
                <span>プレデター順位×プレイヤー情報をDBへ追加登録</span>
              </h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                ✕ 閉じる
              </button>
            </div>

            <form onSubmit={handleRegisterPlayer} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 font-bold block mb-1">
                    現在のプレイヤー名・活動名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="例: cheeky / YukaF"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 font-bold block mb-1">
                    当時のランキング表記名・サブ垢名
                  </label>
                  <input
                    type="text"
                    value={regRecordedIgn}
                    onChange={(e) => setRegRecordedIgn(e.target.value)}
                    placeholder="例: . / あ / FNC_YukaF"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 font-bold block mb-1">
                    シーズン *
                  </label>
                  <select
                    value={regSeason}
                    onChange={(e) => setRegSeason(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                  >
                    {NUMBERED_SEASONS.map((s) => (
                      <option key={s.season} value={s.season}>
                        S{s.season}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-300 font-bold block mb-1">
                    最終順位 (#1〜750) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={750}
                    value={regRank}
                    onChange={(e) => setRegRank(e.target.value)}
                    placeholder="例: 12"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 font-bold block mb-1">
                    両スプ / 片スプ
                  </label>
                  <select
                    value={regSplit}
                    onChange={(e) => setRegSplit(e.target.value as SplitType)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                  >
                    <option value="both">✨ 両スプ維持</option>
                    <option value="split1">片スプ (Split 1)</option>
                    <option value="split2">片スプ (Split 2)</option>
                    <option value="full">通期 (S17-19)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">機種</label>
                  <select
                    value={regPlatform}
                    onChange={(e) => setRegPlatform(e.target.value as Platform)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                  >
                    <option value="PC">PC</option>
                    <option value="PS">PS</option>
                    <option value="Xbox">Xbox</option>
                    <option value="Switch">Switch</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">
                    デバイス
                  </label>
                  <select
                    value={regDevice}
                    onChange={(e) =>
                      setRegDevice(e.target.value as "PAD" | "MnK" | "Unknown")
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                  >
                    <option value="PAD">PAD</option>
                    <option value="MnK">MnK (キーマウ)</option>
                    <option value="Unknown">不明</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">
                    主な使用キャラ
                  </label>
                  <input
                    type="text"
                    value={regLegends}
                    onChange={(e) => setRegLegends(e.target.value)}
                    placeholder="パス, ホライゾン"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-bold block mb-1">
                  他に獲得しているプレデターシーズン（バナーの他枠照合用）
                </label>
                <div className="flex flex-wrap gap-1.5">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="url"
                  value={regTrackerUrl}
                  onChange={(e) => setRegTrackerUrl(e.target.value)}
                  placeholder="Tracker URL (ALS等)"
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                />
                <input
                  type="url"
                  value={regXUrl}
                  onChange={(e) => setRegXUrl(e.target.value)}
                  placeholder="X (Twitter) URL"
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                />
                <input
                  type="url"
                  value={regTwitchUrl}
                  onChange={(e) => setRegTwitchUrl(e.target.value)}
                  placeholder="Twitch URL"
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  特徴メモ・バナーの傾向（任意）
                </label>
                <textarea
                  rows={2}
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                  placeholder="例: S20両スプ2桁＋S15プレバッジをよく並べているPADホライゾン専"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-lg text-xs bg-zinc-800 text-zinc-300 cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReg}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                >
                  {isSubmittingReg ? "登録中..." : "DBに登録する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* フッター */}
      <footer className="border-t border-zinc-900 py-5 px-6 text-center text-xs text-zinc-500 mt-12">
        PRED FINDER — Apex Legends 匿名プレデター特定データベース＆コミュニティ掲示板
      </footer>
    </div>
  );
}

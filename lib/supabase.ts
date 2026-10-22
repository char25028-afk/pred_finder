import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  INITIAL_PLAYERS,
  INITIAL_SIGHTINGS,
  Platform,
  PostType,
  PredatorPlayerEntry,
  SeasonAchievement,
  SightingPost,
  SplitType,
} from "./predator-data";

const rawUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://mxgwlktfjnijgpmfirux.supabase.co";
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_7AwCWs6tdYN8f-ihfn7-WQ_rXEpfLyr";

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseUrl.startsWith("http");

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const LOCAL_PLAYERS_KEY = "pred_finder_custom_players_v1";
const LOCAL_POSTS_KEY = "pred_finder_custom_posts_v1";

function loadLocalPlayers(): PredatorPlayerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_PLAYERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPlayers(players: PredatorPlayerEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_PLAYERS_KEY, JSON.stringify(players));
  } catch {
    // ignore storage errors
  }
}

function loadLocalPosts(): SightingPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPosts(posts: SightingPost[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
  } catch {
    // ignore storage errors
  }
}

export async function fetchAllPlayers(): Promise<{
  players: PredatorPlayerEntry[];
  source: "supabase" | "local";
}> {
  const localCustom = loadLocalPlayers();

  if (supabase) {
    try {
      const { data: playersRows, error: pErr } = await supabase
        .from("players")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: recordsRows, error: rErr } = await supabase
        .from("predator_records")
        .select("*");

      if (!pErr && !rErr && playersRows) {
        const dbPlayers: PredatorPlayerEntry[] = playersRows.map((p) => {
          const matchingRecords = (recordsRows || []).filter(
            (r) => r.player_id === p.id
          );
          return {
            id: p.id,
            currentName: p.current_name,
            aliases: p.aliases || [],
            platform: (p.platform as Platform) || "PC",
            inputDevice: p.input_device || "Unknown",
            mainLegends: p.main_legends || [],
            xUrl: p.x_url || undefined,
            twitchUrl: p.twitch_url || undefined,
            youtubeUrl: p.youtube_url || undefined,
            trackerUrl: p.tracker_url || undefined,
            bioNote: p.bio_note || "",
            verifiedCount:
              matchingRecords.reduce(
                (acc, r) => Math.max(acc, r.verified_count || 1),
                1
              ) || 1,
            achievements: matchingRecords.map((r) => ({
              season: r.season,
              rank: r.rank ?? undefined,
              splitType: (r.split_type as SplitType) || "both",
              recordedIgn: r.recorded_ign || p.current_name,
              rpScore: r.rp_score ?? undefined,
            })),
          };
        });

        const existingNames = new Set(
          dbPlayers.map((d) => d.currentName.toLowerCase())
        );
        const merged = [
          ...dbPlayers,
          ...localCustom,
          ...INITIAL_PLAYERS.filter(
            (init) => !existingNames.has(init.currentName.toLowerCase())
          ),
        ];
        return { players: merged, source: "supabase" };
      }
    } catch (err) {
      console.warn("Supabase fetchAllPlayers fallback:", err);
    }
  }

  return {
    players: [...localCustom, ...INITIAL_PLAYERS],
    source: "local",
  };
}

export async function registerPredatorEntry(input: {
  currentName: string;
  recordedIgn: string;
  season: number;
  rank: number;
  splitType: SplitType;
  platform: Platform;
  inputDevice: "PAD" | "MnK" | "Unknown";
  mainLegends: string[];
  otherSeasons: number[];
  xUrl?: string;
  twitchUrl?: string;
  trackerUrl?: string;
  bioNote?: string;
}): Promise<PredatorPlayerEntry> {
  const achievements: SeasonAchievement[] = [
    {
      season: input.season,
      rank: input.rank,
      splitType: input.splitType,
      recordedIgn: input.recordedIgn || input.currentName,
    },
    ...input.otherSeasons
      .filter((s) => s !== input.season)
      .map((s) => ({
        season: s,
        rank: undefined,
        splitType: "both" as SplitType,
        recordedIgn: input.recordedIgn || input.currentName,
      })),
  ];

  const newEntry: PredatorPlayerEntry = {
    id: `custom-${Date.now()}`,
    currentName: input.currentName,
    aliases:
      input.recordedIgn && input.recordedIgn !== input.currentName
        ? [input.recordedIgn]
        : [],
    platform: input.platform,
    inputDevice: input.inputDevice,
    mainLegends: input.mainLegends,
    xUrl: input.xUrl || undefined,
    twitchUrl: input.twitchUrl || undefined,
    trackerUrl: input.trackerUrl || undefined,
    bioNote: input.bioNote || "",
    verifiedCount: 1,
    achievements,
  };

  if (supabase) {
    try {
      const { data: insertedPlayer, error: pErr } = await supabase
        .from("players")
        .insert({
          current_name: newEntry.currentName,
          aliases: newEntry.aliases,
          platform: newEntry.platform,
          input_device: newEntry.inputDevice,
          main_legends: newEntry.mainLegends,
          x_url: newEntry.xUrl ?? null,
          twitch_url: newEntry.twitchUrl ?? null,
          tracker_url: newEntry.trackerUrl ?? null,
          bio_note: newEntry.bioNote,
        })
        .select()
        .single();

      if (!pErr && insertedPlayer) {
        newEntry.id = insertedPlayer.id;
        await supabase.from("predator_records").insert(
          achievements.map((a) => ({
            player_id: insertedPlayer.id,
            season: a.season,
            rank: a.rank ?? 500,
            split_type: a.splitType,
            recorded_ign: a.recordedIgn,
            platform: newEntry.platform,
            verified_count: 1,
          }))
        );
        return newEntry;
      }
    } catch (err) {
      console.warn("Supabase registerPredatorEntry fallback:", err);
    }
  }

  const currentLocal = loadLocalPlayers();
  saveLocalPlayers([newEntry, ...currentLocal]);
  return newEntry;
}

export async function fetchSightingsPosts(): Promise<SightingPost[]> {
  const localPosts = loadLocalPosts();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("sightings_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        const dbPosts: SightingPost[] = data.map((row) => ({
          id: row.id,
          season: row.season,
          rank: row.rank ?? undefined,
          splitType: (row.split_type as SplitType | "unknown") || "unknown",
          platform: (row.platform as Platform) || "PC",
          postType: (row.post_type as PostType) || "sighting",
          suspectPlayerName: row.suspect_player_name || undefined,
          otherBadges: row.other_badges || [],
          legendUsed: row.legend_used || undefined,
          comment: row.comment,
          authorName: row.author_name || "匿名",
          xUrl: row.x_url || undefined,
          trackerUrl: row.tracker_url || undefined,
          likes: row.likes || 0,
          createdAt: new Date(row.created_at).toLocaleString("ja-JP", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
        return [...dbPosts, ...localPosts, ...INITIAL_SIGHTINGS];
      }
    } catch (err) {
      console.warn("Supabase fetchSightingsPosts fallback:", err);
    }
  }

  return [...localPosts, ...INITIAL_SIGHTINGS];
}

export async function createSightingPost(input: {
  season: number;
  rank?: number;
  splitType: SplitType | "unknown";
  platform: Platform;
  postType: PostType;
  suspectPlayerName?: string;
  otherBadges: number[];
  legendUsed?: string;
  comment: string;
  authorName?: string;
  xUrl?: string;
  trackerUrl?: string;
}): Promise<SightingPost> {
  const nowStr = new Date().toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const newPost: SightingPost = {
    id: `post-${Date.now()}`,
    season: input.season,
    rank: input.rank,
    splitType: input.splitType,
    platform: input.platform,
    postType: input.postType,
    suspectPlayerName: input.suspectPlayerName || undefined,
    otherBadges: input.otherBadges,
    legendUsed: input.legendUsed || undefined,
    comment: input.comment,
    authorName: input.authorName?.trim() || "匿名",
    xUrl: input.xUrl || undefined,
    trackerUrl: input.trackerUrl || undefined,
    likes: 1,
    createdAt: nowStr,
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("sightings_posts")
        .insert({
          season: newPost.season,
          rank: newPost.rank ?? null,
          split_type: newPost.splitType,
          platform: newPost.platform,
          post_type: newPost.postType,
          suspect_player_name: newPost.suspectPlayerName ?? null,
          other_badges: newPost.otherBadges,
          legend_used: newPost.legendUsed ?? null,
          comment: newPost.comment,
          author_name: newPost.authorName,
          x_url: newPost.xUrl ?? null,
          tracker_url: newPost.trackerUrl ?? null,
          likes: 1,
        })
        .select()
        .single();

      if (!error && data) {
        newPost.id = data.id;
        return newPost;
      }
    } catch (err) {
      console.warn("Supabase createSightingPost fallback:", err);
    }
  }

  const currentLocal = loadLocalPosts();
  saveLocalPosts([newPost, ...currentLocal]);
  return newPost;
}

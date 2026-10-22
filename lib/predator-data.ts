export type Platform = "PC" | "PS" | "Xbox" | "Switch";
export type SplitType = "both" | "split1" | "split2" | "full";
export type PostType = "identify" | "sighting" | "question";

export interface SeasonBadgeMeta {
  season: number;
  name: string;
  jpTitle: string;
  hasSplits: boolean;
  hasRankNumber: boolean; // S17以降はtrue
  visualFeature: string;
  frameShape: "hex-fang" | "reaper-wing" | "flame-crown" | "cyber-wing" | "void-spike" | "shock-bolt" | "rift-halo" | "blade-crown" | "classic";
  accentColor: string;
  secondaryColor: string;
}

export interface SeasonAchievement {
  season: number;
  rank?: number; // S17以降は順位あり、S16以前はundefined可
  splitType: SplitType;
  recordedIgn: string;
  rpScore?: number;
}

export interface PredatorPlayerEntry {
  id: string;
  currentName: string;
  aliases: string[];
  platform: Platform;
  inputDevice: "PAD" | "MnK" | "Unknown";
  mainLegends: string[];
  xUrl?: string;
  twitchUrl?: string;
  youtubeUrl?: string;
  trackerUrl?: string;
  bioNote: string;
  verifiedCount: number;
  achievements: SeasonAchievement[]; // 獲得した全シーズンのプレデター履歴
}

export interface SightingPost {
  id: string;
  season: number;
  rank?: number;
  splitType: SplitType | "unknown";
  platform: Platform;
  postType: PostType;
  suspectPlayerName?: string;
  otherBadges: number[];
  legendUsed?: string;
  comment: string;
  authorName: string;
  xUrl?: string;
  trackerUrl?: string;
  likes: number;
  createdAt: string;
}

// S17〜S29（順位ナンバー刻印バッジ対象シーズン：現在S30のためS29まで対応）
export const NUMBERED_SEASONS: SeasonBadgeMeta[] = [
  29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17,
].map((season) => ({
  season,
  name: `Season ${season}`,
  jpTitle: `S${season}`,
  hasSplits: season >= 20,
  hasRankNumber: true,
  visualFeature: "",
  frameShape: "classic" as const,
  accentColor: "#ef4444",
  secondaryColor: "#f59e0b",
}));

// バナーの残り2枠などで「どのシーズンを他に持っているか」で絞り込むためのシーズンリスト (S12〜S29)
export const FILTERABLE_ALL_SEASONS: number[] = [
  29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12,
];

// 初期シードデータ（PC版中心・実在の有名プレデター構成イメージ＆バナー照合デモ用データ）
export const INITIAL_PLAYERS: PredatorPlayerEntry[] = [
  {
    id: "pred-cheeky",
    currentName: "cheeky (チーキー)",
    aliases: ["cheeky", "チキ", "SBI_cheeky", "Pathfinder4912"],
    platform: "PC",
    inputDevice: "PAD",
    mainLegends: ["パスファインダー", "ホライゾン", "バンガロール"],
    xUrl: "https://x.com/tttcheekyttt",
    twitchUrl: "https://www.twitch.tv/tttcheekyttt",
    youtubeUrl: "https://www.youtube.com/@tttcheekyttt",
    trackerUrl: "https://apexlegendsstatus.com/profile/PC/tttcheekyttt",
    bioNote:
      "日本を代表するPADプレデターストリーマー。複数シーズンで世界1桁〜上位プレデターを維持。匿名モード時はパスファインダーやホライゾンでS17/S18/S20の上位番号バッジを並べていることが多い。",
    verifiedCount: 48,
    achievements: [
      { season: 17, rank: 3, splitType: "full", recordedIgn: "tttcheekyttt", rpScore: 185400 },
      { season: 18, rank: 5, splitType: "full", recordedIgn: "cheeky", rpScore: 94200 },
      { season: 19, rank: 8, splitType: "full", recordedIgn: "cheeky", rpScore: 88100 },
      { season: 20, rank: 2, splitType: "both", recordedIgn: "tttcheekyttt", rpScore: 52300 },
      { season: 21, rank: 4, splitType: "both", recordedIgn: "cheeky", rpScore: 49800 },
      { season: 22, rank: 6, splitType: "both", recordedIgn: "cheeky", rpScore: 47100 },
      { season: 15, splitType: "both", recordedIgn: "cheeky" },
      { season: 16, splitType: "both", recordedIgn: "cheeky" },
    ],
  },
  {
    id: "pred-lykq",
    currentName: "Lykq (ライカ)",
    aliases: ["FNC_Lykq", "Lykq", "らいか", "Horizon_2910"],
    platform: "PC",
    inputDevice: "PAD",
    mainLegends: ["ホライゾン", "ヴァルキリー", "バンガロール"],
    xUrl: "https://x.com/Lykq_fps",
    twitchUrl: "https://www.twitch.tv/lykq_fps",
    trackerUrl: "https://apexlegendsstatus.com/profile/PC/FNC_Lykq",
    bioNote:
      "FNATIC所属のプロプレイヤー。ランクでも圧倒的な勝率を誇り、S18・S20・S21の両スプ発光1桁〜10番台バッジを装着しているケースが多い。",
    verifiedCount: 39,
    achievements: [
      { season: 18, rank: 2, splitType: "full", recordedIgn: "Lykq", rpScore: 102400 },
      { season: 19, rank: 4, splitType: "full", recordedIgn: "FNC_Lykq", rpScore: 92000 },
      { season: 20, rank: 7, splitType: "both", recordedIgn: "FNC_Lykq", rpScore: 48900 },
      { season: 21, rank: 11, splitType: "both", recordedIgn: "FNC_Lykq", rpScore: 44200 },
      { season: 23, rank: 9, splitType: "both", recordedIgn: "FNC_Lykq", rpScore: 46500 },
      { season: 14, splitType: "both", recordedIgn: "Lykq" },
      { season: 16, splitType: "both", recordedIgn: "Lykq" },
    ],
  },
  {
    id: "pred-yukaf",
    currentName: "YukaF (ユカエフ)",
    aliases: ["FNC_YukaF", "YukaF", "ゆかえふ"],
    platform: "PC",
    inputDevice: "MnK",
    mainLegends: ["パスファインダー", "バンガロール", "ワットソン"],
    xUrl: "https://x.com/IQ200YukaF",
    twitchUrl: "https://www.twitch.tv/iq200yukaf",
    youtubeUrl: "https://www.youtube.com/@IQ200YukaF",
    trackerUrl: "https://apexlegendsstatus.com/profile/PC/FNC_YukaF",
    bioNote:
      "世界最高峰のキャラコンを持つキーマウプロ（FNATIC）。匿名バナーでもS17・S20・S22の2桁前半プレデターバッジ＋古参S13/S14プレバッジの組み合わせで特定しやすい。",
    verifiedCount: 35,
    achievements: [
      { season: 17, rank: 18, splitType: "full", recordedIgn: "FNC_YukaF", rpScore: 142000 },
      { season: 20, rank: 14, splitType: "both", recordedIgn: "FNC_YukaF", rpScore: 45100 },
      { season: 21, rank: 23, splitType: "split1", recordedIgn: "YukaF", rpScore: 38900 },
      { season: 22, rank: 19, splitType: "both", recordedIgn: "FNC_YukaF", rpScore: 41200 },
      { season: 13, splitType: "both", recordedIgn: "FNC_YukaF" },
      { season: 14, splitType: "both", recordedIgn: "FNC_YukaF" },
    ],
  },
  {
    id: "pred-reyzygg",
    currentName: "ReyzyGG (レイジー)",
    aliases: ["ReyzyGG", "NTH_Reyzy", "レイジー", "."],
    platform: "PC",
    inputDevice: "PAD",
    mainLegends: ["バンガロール", "ホライゾン", "コンジット"],
    xUrl: "https://x.com/ReyzyGG",
    twitchUrl: "https://www.twitch.tv/reyzygg",
    trackerUrl: "https://apexlegendsstatus.com/profile/PC/ReyzyGG",
    bioNote:
      "インファイト最強クラスのPADプレイヤー。当時のリーダーボードでは『.』や短文字表記の時期もあり、順位バッジからの逆引き需要が非常に高い。",
    verifiedCount: 31,
    achievements: [
      { season: 17, rank: 9, splitType: "full", recordedIgn: ".", rpScore: 161000 },
      { season: 19, rank: 12, splitType: "full", recordedIgn: "ReyzyGG", rpScore: 81500 },
      { season: 20, rank: 5, splitType: "both", recordedIgn: "ReyzyGG", rpScore: 50100 },
      { season: 22, rank: 15, splitType: "both", recordedIgn: "ReyzyGG", rpScore: 42800 },
      { season: 24, rank: 8, splitType: "both", recordedIgn: "ReyzyGG", rpScore: 47900 },
      { season: 15, splitType: "both", recordedIgn: "ReyzyGG" },
    ],
  },
  {
    id: "pred-satuki",
    currentName: "satuki (サツキ)",
    aliases: ["satuki", "NTH_satuki", "FNC_satuki"],
    platform: "PC",
    inputDevice: "PAD",
    mainLegends: ["カタリスト", "バンガロール", "ブラッドハウンド"],
    xUrl: "https://x.com/satuki_apex",
    twitchUrl: "https://www.twitch.tv/satuki_apex",
    trackerUrl: "https://apexlegendsstatus.com/profile/PC/satuki",
    bioNote:
      "IGLもこなすトッププロ。S18〜S23にかけて安定して2桁前半の両スプ維持バッジを保有。",
    verifiedCount: 27,
    achievements: [
      { season: 18, rank: 15, splitType: "full", recordedIgn: "satuki", rpScore: 79400 },
      { season: 20, rank: 21, splitType: "both", recordedIgn: "satuki", rpScore: 42300 },
      { season: 21, rank: 16, splitType: "both", recordedIgn: "satuki", rpScore: 41800 },
      { season: 23, rank: 12, splitType: "both", recordedIgn: "satuki", rpScore: 44900 },
      { season: 14, splitType: "both", recordedIgn: "satuki" },
      { season: 16, splitType: "both", recordedIgn: "satuki" },
    ],
  },
  {
    id: "pred-sangjoon",
    currentName: "SangJoon (サンジュン)",
    aliases: ["RC_SangJoon", "SangJoon", "SJ"],
    platform: "PC",
    inputDevice: "MnK",
    mainLegends: ["クリプト", "ホライゾン", "レイス"],
    xUrl: "https://x.com/SangJoon1117",
    twitchUrl: "https://www.twitch.tv/sangjoon1117",
    trackerUrl: "https://apexlegendsstatus.com/profile/PC/RC_SangJoon",
    bioNote:
      "APAC Northを代表する韓国の超火力キーマウプレイヤー。東京サーバーのランクマッチにも高頻度で出現し、S19 #1 / S20 #11 などのバッジが目印。",
    verifiedCount: 42,
    achievements: [
      { season: 19, rank: 1, splitType: "full", recordedIgn: "RC_SangJoon", rpScore: 118000 },
      { season: 20, rank: 11, splitType: "both", recordedIgn: "RC_SangJoon", rpScore: 46700 },
      { season: 21, rank: 7, splitType: "both", recordedIgn: "SangJoon", rpScore: 47200 },
      { season: 23, rank: 4, splitType: "both", recordedIgn: "SangJoon", rpScore: 51000 },
      { season: 15, splitType: "both", recordedIgn: "SangJoon" },
    ],
  },
  {
    id: "pred-1tappy",
    currentName: "1tappy (ワンタッピー)",
    aliases: ["RID_1tappy", "1tappy", "わんたっぴー"],
    platform: "PC",
    inputDevice: "MnK",
    mainLegends: ["パスファインダー", "ジブラルタル", "ニューキャッスル"],
    xUrl: "https://x.com/1TAPPYTHEWORLD",
    twitchUrl: "https://www.twitch.tv/1tappytheworld",
    youtubeUrl: "https://www.youtube.com/@1tappy",
    trackerUrl: "https://apexlegendsstatus.com/profile/PC/1tappy",
    bioNote:
      "長時間ランク配信でも知られるキーマウプロ。S17〜S24までほぼ毎シーズン100位〜300位台のプレデターバッジを獲得しており、複数シーズン組み合わせ検索のヒット率が高い。",
    verifiedCount: 24,
    achievements: [
      { season: 17, rank: 88, splitType: "full", recordedIgn: "1tappy", rpScore: 108000 },
      { season: 18, rank: 112, splitType: "full", recordedIgn: "1tappy", rpScore: 52400 },
      { season: 20, rank: 64, splitType: "both", recordedIgn: "RID_1tappy", rpScore: 36800 },
      { season: 21, rank: 142, splitType: "split1", recordedIgn: "1tappy", rpScore: 31200 },
      { season: 22, rank: 95, splitType: "both", recordedIgn: "1tappy", rpScore: 34900 },
      { season: 24, rank: 73, splitType: "both", recordedIgn: "1tappy", rpScore: 37400 },
      { season: 13, splitType: "both", recordedIgn: "1tappy" },
    ],
  },
  {
    id: "pred-anon-hunter1",
    currentName: "Mia.K (ミアケー)",
    aliases: ["Mia.K", "KINOTROPE_MiaK", "あ"],
    platform: "PC",
    inputDevice: "PAD",
    mainLegends: ["ホライゾン", "レヴナント", "パスファインダー"],
    xUrl: "https://x.com/MiaKnightley",
    twitchUrl: "https://www.twitch.tv/miaknightley",
    trackerUrl: "https://apexlegendsstatus.com/profile/PC/MiaK",
    bioNote:
      "ランク番長としても名高い猛者。シーズン終了時に1文字ネーム（『あ』等）で集計されることがあり、バッジ順位DBでの照合が特に有効。",
    verifiedCount: 29,
    achievements: [
      { season: 18, rank: 6, splitType: "full", recordedIgn: "あ", rpScore: 91200 },
      { season: 20, rank: 3, splitType: "both", recordedIgn: "Mia.K", rpScore: 51400 },
      { season: 21, rank: 2, splitType: "both", recordedIgn: "Mia.K", rpScore: 53100 },
      { season: 22, rank: 11, splitType: "both", recordedIgn: "Mia.K", rpScore: 44600 },
      { season: 24, rank: 5, splitType: "both", recordedIgn: "Mia.K", rpScore: 49200 },
      { season: 16, splitType: "both", recordedIgn: "Mia.K" },
    ],
  },
  {
    id: "pred-split-collision-demo",
    currentName: "Kuroba_ Apex (クロバ / サブ垢検証用)",
    aliases: ["Kuroba_sub", "lIlIllIlI", "Wraith9912"],
    platform: "PC",
    inputDevice: "PAD",
    mainLegends: ["レイス", "アッシュ"],
    xUrl: "https://x.com/",
    trackerUrl: "https://apexlegendsstatus.com/",
    bioNote:
      "【同順位・片スプ/両スプ絞り込み検証用データ】S20のSplit 2のみ#14位でフィニッシュ（片スプ静止バッジ）。S20 #14で検索した際、両スプのYukaF選手と「光り方（両スプか片スプか）」「他シーズンバッジ」で判別できる例。",
    verifiedCount: 14,
    achievements: [
      { season: 20, rank: 14, splitType: "split2", recordedIgn: "lIlIllIlI", rpScore: 39100 },
      { season: 22, rank: 310, splitType: "split1", recordedIgn: "Kuroba_sub", rpScore: 28400 },
      { season: 19, rank: 245, splitType: "full", recordedIgn: "lIlIllIlI", rpScore: 58900 },
    ],
  },
];

// 初期掲示板・情報提供データ
export const INITIAL_SIGHTINGS: SightingPost[] = [
  {
    id: "post-1",
    season: 20,
    rank: 2,
    splitType: "both",
    platform: "PC",
    postType: "sighting",
    suspectPlayerName: "cheeky (チーキー)",
    otherBadges: [17, 18],
    legendUsed: "パスファインダー",
    comment:
      "さっき東京鯖のダイヤ〜プレ帯で匿名パスファインダー（Pathfinder4912）に秒で溶かされてデスボ見たら S20 #2（両スプ発光）＋ S17 #3 が付いてました。配信見に行ったら案の定ちーきーさんでしたｗ",
    authorName: "ワールズエッジの犠牲者",
    xUrl: "https://x.com/tttcheekyttt",
    likes: 19,
    createdAt: "2026-10-22 11:30",
  },
  {
    id: "post-2",
    season: 18,
    rank: 6,
    splitType: "full",
    platform: "PC",
    postType: "identify",
    suspectPlayerName: "Mia.K (ミアケー)",
    otherBadges: [20, 21],
    legendUsed: "ホライゾン",
    comment:
      "S18のリーダーボード最終結果だと名前が『あ』になってて誰か分からなかったんですが、S20 #3・S21 #2と一緒にバナーに付けていたのでMia.Kさん確定です！",
    authorName: "ランク調査班",
    trackerUrl: "https://apexlegendsstatus.com/profile/PC/MiaK",
    likes: 15,
    createdAt: "2026-10-22 10:15",
  },
  {
    id: "post-3",
    season: 22,
    rank: 418,
    splitType: "split1",
    platform: "PC",
    postType: "question",
    suspectPlayerName: "不明（情報求む）",
    otherBadges: [19, 21],
    legendUsed: "レヴナント",
    comment:
      "深夜2時の東京鯖でめちゃくちゃ強い匿名レヴナント（S22 #418 片スプバッジ ＋ S19プレ ＋ S21プレ）に遭遇しました。誰のサブ垢か知ってる方いませんか？",
    authorName: "名無しのマスター",
    likes: 7,
    createdAt: "2026-10-22 02:40",
  },
];

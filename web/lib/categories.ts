export const CATEGORIES = [
  "Sports",
  "Politics",
  "Crypto",
  "Economy",
  "Tech",
  "World",
  "Culture",
] as const;

export type Category = (typeof CATEGORIES)[number] | "Other";

// Checked in order; the first category with a matching keyword wins.
const RULES: [Category, string[]][] = [
  ["Crypto", ["bitcoin", "btc", "ethereum", "eth", "solana", "sol", "crypto", "xrp",
    "dogecoin", "doge", "token", "airdrop", "fdv", "memecoin", "stablecoin", "coinbase", "binance"]],
  ["Sports", ["vs", "nfl", "nba", "mlb", "nhl", "wnba", "ncaa", "premier league", "la liga",
    "serie a", "bundesliga", "ligue 1", "champions league", "world cup", "super bowl", "ufc",
    "grand prix", "f1", "formula 1", "tennis", "wimbledon", "us open", "golf", "masters",
    "olympics", "playoffs", "mvp", "fc", "boxing", "cricket"]],
  ["Economy", ["fed", "interest rate", "rates", "inflation", "cpi", "gdp", "recession",
    "unemployment", "jobs report", "tariff", "tariffs", "s&p", "nasdaq", "dow", "stock",
    "ipo", "earnings", "treasury", "oil", "gold"]],
  ["Politics", ["trump", "biden", "harris", "vance", "newsom", "election", "president",
    "presidential", "senate", "congress", "house", "democrat", "democrats", "republican",
    "republicans", "governor", "mayor", "prime minister", "parliament", "primary",
    "nominee", "impeach", "supreme court", "cabinet", "poll"]],
  ["World", ["ukraine", "russia", "putin", "zelensky", "israel", "gaza", "hamas", "iran",
    "china", "taiwan", "north korea", "war", "ceasefire", "nato", "invade", "invasion", "un"]],
  ["Tech", ["ai", "openai", "chatgpt", "gpt", "anthropic", "claude", "gemini", "google",
    "apple", "iphone", "microsoft", "nvidia", "tesla", "spacex", "starship", "meta",
    "tiktok", "x.com", "musk", "robotaxi", "launch"]],
  ["Culture", ["movie", "film", "oscar", "oscars", "grammy", "grammys", "emmy", "album",
    "song", "box office", "netflix", "spotify", "youtube", "mrbeast", "taylor swift",
    "celebrity", "tv", "show", "billboard", "eurovision"]],
];

const COMPILED = RULES.map(([category, words]) => {
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&"));
  return [category, new RegExp(`(^|[^a-z0-9])(${escaped.join("|")})([^a-z0-9]|$)`, "i")] as const;
});

export function categorize(...texts: (string | null | undefined)[]): Category {
  const text = texts.filter(Boolean).join(" ");
  for (const [category, pattern] of COMPILED) {
    if (pattern.test(text)) return category;
  }
  return "Other";
}

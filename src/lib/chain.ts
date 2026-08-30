/**
 * لایهٔ بلاکچین Abstract — امنیت در مرکز
 * ------------------------------------------------------------------
 * - ورود با Abstract Global Wallet (AGW): کیف پول هوشمند با Account
 *   Abstraction بومی — بدون نیاز به نصب هیچ افزونه‌ای (ایمیل/QR/اجتماعی)
 * - هیچ کلید خصوصی‌ای در مرورگر لمس نمی‌شود؛ امضا داخل AGW انجام می‌شود
 * - پرداخت = انتقال ERC-20 PENGU به خزانه با abstractClient.sendTransaction
 *   + راستی‌آزمایی رسید تراکنش روی‌زنجیره (receipt + لاگ Transfer +
 *   مهر زمانی بلوک) — قابل آدرس‌دهی عمومی در Abscan و مستقل از هر بک‌اند
 * - ذخیرهٔ دسترسی‌ها فقط روی دستگاه کاربر (localStorage)؛ مرجع حقیقت
 *   همیشه زنجیره است و با هش تراکنش بازخوانی می‌شود
 */
import {
  createPublicClient,
  decodeEventLog,
  encodeFunctionData,
  fallback,
  formatUnits,
  getAddress,
  http,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import { abstract } from "viem/chains";
import type { AbstractClient } from "@abstract-foundation/agw-client";
import { ABSTRACT, AUTO_SCAN, ECOSYSTEM, MIN_PAYMENT, PENGU, PLANS, TREASURY, type Plan, type PlanId } from "../config";

/** زنجیرهٔ استاندارد Abstract از viem — همان چیزی که AGW استفاده می‌کند */
export { abstract as abstractChain };

export const publicClient = createPublicClient({
  chain: abstract,
  transport: fallback(ABSTRACT.rpcUrls.map((u) => http(u, { batch: false }))),
});

export const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

export const treasuryAddress = getAddress(TREASURY);
export const tokenAddress = getAddress(PENGU.address);
export const explorerTx = (hash: string) => `${ABSTRACT.explorer}/tx/${hash}`;
export const explorerAddr = (addr: string) => `${ABSTRACT.explorer}/address/${addr}`;

/* ------------------------------ کیف پول AGW ---------------------------
 * ورود و امضا تماماً توسط Abstract Global Wallet انجام می‌شود؛ این لایه
 * فقط خواندن‌های عمومی (موجودی، بلوک، رسید) را با viem انجام می‌دهد.
 * هویت کاربر و کلیدهای نشست داخل خود AGW (Privy cross-app) مدیریت می‌شود
 * و هیچ‌گاه به این اپ نمی‌رسند.
 */
export async function fetchPenguBalance(address: Address): Promise<bigint> {
  const bal = (await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;
  return bal;
}

export const fetchBlockNumber = () => publicClient.getBlockNumber();

/* ------------------------- پرداخت و راستی‌آزمایی ---------------------- */
export interface AccessGrant {
  txHash: Hash;
  planId: PlanId;
  tier: 1 | 2;
  pricePaid: string; // PENGU
  grantedAt: number; // unix seconds
  expiresAt: number; // unix seconds
  verifiedAt: number; // ms
  subscription: boolean;
}

export type VerifyError =
  | "INVALID_HASH"
  | "NOT_FOUND"
  | "TX_FAILED"
  | "NOT_PENGU"
  | "WRONG_RECIPIENT"
  | "AMOUNT_TOO_LOW";

export class ChainError extends Error {
  code: VerifyError | "USER_REJECTED" | "NETWORK";
  constructor(code: VerifyError | "USER_REJECTED" | "NETWORK", msg?: string) {
    super(msg ?? code);
    this.code = code;
  }
}

const MIN_WEI = parseUnits(MIN_PAYMENT, PENGU.decimals);

/** انقضا = زمان پرداخت + مدت تعرفه؛ hours=0 یعنی دائمی (۱۰۰ سال) */
function expiresFor(plan: Plan, grantedAtSec: number): number {
  if (plan.hours === 0) return grantedAtSec + 100 * 365 * 24 * 3600;
  return grantedAtSec + plan.hours * 3600;
}

function inferPlan(amountWei: bigint): Plan | null {
  const sorted = [...PLANS].sort((a, b) => Number(parseUnits(b.price, PENGU.decimals) - parseUnits(a.price, PENGU.decimals)));
  for (const p of sorted) {
    if (amountWei >= parseUnits(p.price, PENGU.decimals)) return p;
  }
  return null;
}

/** ساخت کالیدیتای انتقال PENGU به خزانه */
export function buildPaymentData(amountPengu: string): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [treasuryAddress, parseUnits(amountPengu, PENGU.decimals)],
  });
}

/**
 * ارسال تراکنش پرداخت از طریق Abstract Global Wallet.
 * از abstractClient (ساخته‌شده با useAbstractClient) استفاده می‌شود؛
 * امضای تراکنش داخل خود AGW انجام می‌شود و ما فقط هش را دریافت می‌کنیم.
 */
export async function sendPaymentViaAgw(client: AbstractClient, plan: Plan): Promise<Hash> {
  try {
    const hash = await client.sendTransaction({
      to: tokenAddress,
      data: buildPaymentData(plan.price),
    });
    return hash;
  } catch (err) {
    const e = err as { code?: number | string; name?: string; message?: string };
    if (e.code === 4001 || e.code === "ACTION_REJECTED" || /user (denied|rejected)/i.test(e.message ?? ""))
      throw new ChainError("USER_REJECTED");
    throw new ChainError("NETWORK", e.message);
  }
}

interface TransferInfo {
  from: Address;
  to: Address;
  value: bigint;
}

/** رسید تراکنش — سازگار با قالب استاندارد و ZkSync (زنجیرهٔ Abstract) */
interface AnyReceipt {
  status: "success" | "reverted";
  blockNumber: bigint;
  logs: readonly { address: string; topics: readonly `0x${string}`[]; data: `0x${string}` }[];
}

/** استخراج و اعتبارسنجی لاگ Transfer PENGU به خزانه از رسید */
function extractValidTransfer(receipt: AnyReceipt): TransferInfo {
  if (receipt.status !== "success") throw new ChainError("TX_FAILED");
  let sawToken = false;
  let lastErr: ChainError | null = null;
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== tokenAddress) continue;
    sawToken = true;
    const decoded = decodeTransferLog(log.topics as [`0x${string}`, `0x${string}`, `0x${string}`], log.data);
    if (!decoded) continue;
    if (getAddress(decoded.to) !== treasuryAddress) {
      lastErr = new ChainError("WRONG_RECIPIENT");
      continue; // لاگ‌های بعدی را هم بررسی کن
    }
    if (decoded.value < MIN_WEI) {
      lastErr = new ChainError("AMOUNT_TOO_LOW");
      continue;
    }
    return decoded;
  }
  if (!sawToken) throw new ChainError("NOT_PENGU");
  throw lastErr ?? new ChainError("NOT_PENGU");
}

function decodeTransferLog(
  topics: [`0x${string}`, `0x${string}`, `0x${string}`],
  data: `0x${string}`,
): TransferInfo | null {
  try {
    const ev = decodeEventLog({ abi: ERC20_ABI, topics, data });
    if (ev.eventName !== "Transfer") return null;
    const args = ev.args as unknown as { from: Address; to: Address; value: bigint };
    return { from: getAddress(args.from), to: getAddress(args.to), value: args.value };
  } catch {
    return null;
  }
}

export interface VerifyResult {
  grant: AccessGrant;
  payer: Address;
}

async function grantFromHash(hash: Hash): Promise<VerifyResult> {
  let receipt: AnyReceipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash });
  } catch {
    throw new ChainError("NOT_FOUND");
  }
  const t = extractValidTransfer(receipt);
  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
  const grantedAt = Number(block.timestamp);
  const plan = inferPlan(t.value);
  if (!plan) throw new ChainError("AMOUNT_TOO_LOW");
  return {
    payer: t.from,
    grant: {
      txHash: hash,
      planId: plan.id,
      tier: plan.tier,
      pricePaid: formatUnits(t.value, PENGU.decimals),
      grantedAt,
      expiresAt: grantedAt + plan.hours * 3600,
      verifiedAt: Date.now(),
      subscription: !!plan.subscription,
    },
  };
}

/** صبر برای تأیید تراکنش و تبدیل آن به دسترسی معتبر */
export async function confirmAndGrant(hash: Hash): Promise<AccessGrant> {
  let receipt: AnyReceipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000, pollingInterval: 1500 });
  } catch {
    throw new ChainError("NOT_FOUND");
  }
  const t = extractValidTransfer(receipt);
  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
  const grantedAt = Number(block.timestamp);
  const plan = inferPlan(t.value)!;
  return {
    txHash: hash,
    planId: plan.id,
    tier: plan.tier,
    pricePaid: formatUnits(t.value, PENGU.decimals),
    grantedAt,
    expiresAt: grantedAt + plan.hours * 3600,
    verifiedAt: Date.now(),
    subscription: !!plan.subscription,
  };
}

/** راستی‌آزمایی عمومی: هر هش تراکنشی را روی زنجیره بررسی می‌کند */
export function verifyTxHash(raw: string): Promise<VerifyResult> {
  const hash = raw.trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) return Promise.reject(new ChainError("INVALID_HASH"));
  return grantFromHash(hash as Hash);
}

/* -------------------- کشف خودکار دسترسی از زنجیره ----------------------
 * بدون نیاز به هش یا ذخیرهٔ محلی: لاگ‌های Transfer(user → treasury) روی
 * توکن PENGU در بازهٔ بلوکی اخیر اسکن و مستقیم به AccessGrant تبدیل می‌شوند.
 */
import { parseAbiItem } from "viem";

const TRANSFER_EVENT = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

export type ScanState = "idle" | "scanning" | "done" | "error";

async function scanRange(user: Address, fromBlock: bigint): Promise<AccessGrant[]> {
  const logs = await publicClient.getLogs({
    address: tokenAddress,
    event: TRANSFER_EVENT,
    args: { from: user, to: treasuryAddress },
    fromBlock,
    toBlock: "latest",
  });
  const out: AccessGrant[] = [];
  for (const log of logs) {
    const value = log.args.value;
    if (!value || value < MIN_WEI) continue;
    const plan = inferPlan(value);
    if (!plan || !log.blockNumber || !log.transactionHash) continue;
    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
    const grantedAt = Number(block.timestamp);
    out.push({
      txHash: log.transactionHash,
      planId: plan.id,
      tier: plan.tier,
      pricePaid: formatUnits(value, PENGU.decimals),
      grantedAt,
      expiresAt: grantedAt + plan.hours * 3600,
      verifiedAt: Date.now(),
      subscription: !!plan.subscription,
    });
  }
  return out;
}

export async function discoverOnChainAccess(user: Address, onState?: (s: ScanState) => void): Promise<AccessGrant[]> {
  onState?.("scanning");
  try {
    const head = await publicClient.getBlockNumber();
    const full = head > BigInt(AUTO_SCAN.blocks) ? head - BigInt(AUTO_SCAN.blocks) : 0n;
    try {
      const grants = await scanRange(user, full);
      onState?.("done");
      return grants;
    } catch {
      // RPC محدودهٔ بزرگ را نپذیرفت — بازهٔ کوچک‌تر
      const small = head > BigInt(Math.floor(AUTO_SCAN.blocks / AUTO_SCAN.fallbackFactor))
        ? head - BigInt(Math.floor(AUTO_SCAN.blocks / AUTO_SCAN.fallbackFactor))
        : 0n;
      const grants = await scanRange(user, small);
      onState?.("done");
      return grants;
    }
  } catch {
    onState?.("error");
    return [];
  }
}

/* --------------------------- فید زندهٔ خزانه ----------------------------
 * اسکن عمومی لاگ‌های Transfer(→ خزانه) بدون فیلتر فرستنده؛ برای نمایش
 * شفاف پرداخت‌های اخیر — دادهٔ کاملاً عمومی و قابل راستی‌آزمایی.
 */
export interface TreasuryInflow {
  from: Address;
  value: bigint;
  txHash: Hash;
  blockNumber: bigint;
}

export async function fetchTreasuryFeed(limit = 8): Promise<TreasuryInflow[]> {
  const head = await publicClient.getBlockNumber();
  const from = head > BigInt(AUTO_SCAN.blocks) ? head - BigInt(AUTO_SCAN.blocks) : 0n;
  try {
    const logs = await publicClient.getLogs({
      address: tokenAddress,
      event: TRANSFER_EVENT,
      args: { to: treasuryAddress },
      fromBlock: from,
      toBlock: "latest",
    });
    return logs
      .filter((l) => l.args.from && l.args.value !== undefined)
      .slice(-limit)
      .reverse()
      .map((l) => ({
        from: l.args.from as Address,
        value: l.args.value as bigint,
        txHash: l.transactionHash as Hash,
        blockNumber: l.blockNumber ?? 0n,
      }));
  } catch {
    return [];
  }
}

/* --------------------------- پروفایل Portal ----------------------------
 * خواندن پروفایل عمومی کاربر از API رسمی Abstract Portal (اختیاری؛
 * اگر API در دسترس نبود، بدون خطا نادیده گرفته می‌شود).
 */
export interface PortalProfile {
  username?: string;
  image?: string;
  bio?: string;
}

const PROFILE_CACHE = "pp:portalProfile:v1";

export async function fetchPortalProfile(user: Address): Promise<PortalProfile | null> {
  const key = user.toLowerCase();
  try {
    const raw = localStorage.getItem(PROFILE_CACHE);
    if (raw) {
      const c = JSON.parse(raw) as { at: number; addr: string; p: PortalProfile };
      if (c.addr === key && Date.now() - c.at < 10 * 60_000) return c.p;
    }
  } catch {
    /* cache miss */
  }
  for (const buildUrl of ECOSYSTEM.profileApis) {
    try {
      const res = await fetch(buildUrl(user), { headers: { accept: "application/json" } });
      if (!res.ok) continue;
      const j = (await res.json()) as Record<string, unknown>;
      const data = (j.data ?? j.profile ?? j) as Record<string, unknown>;
      const p: PortalProfile = {
        username: (data.username ?? data.name ?? data.handle) as string | undefined,
        image: (data.image ?? data.avatar ?? data.pfp ?? data.profileImage) as string | undefined,
        bio: (data.bio ?? data.description) as string | undefined,
      };
      if (p.username || p.image) {
        try {
          localStorage.setItem(PROFILE_CACHE, JSON.stringify({ at: Date.now(), addr: key, p }));
        } catch {
          /* ignore */
        }
        return p;
      }
    } catch {
      /* endpoint بعدی */
    }
  }
  return null;
}

/* ----------------------------- ذخیرهٔ دسترسی -------------------------- */
const ACCESS_KEY = "pp:access:v2";
const RENEW_KEY = "pp:autorenew:v1";

type AccessMap = Record<string, AccessGrant[]>;

function readMap(): AccessMap {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_KEY) ?? "{}") as AccessMap;
  } catch {
    return {};
  }
}

export function saveGrantFor(address: Address, grant: AccessGrant): void {
  const map = readMap();
  const k = address.toLowerCase();
  map[k] = map[k] ?? [];
  if (!map[k].some((g) => g.txHash === grant.txHash)) map[k].push(grant);
  localStorage.setItem(ACCESS_KEY, JSON.stringify(map));
}

export function bestAccess(address: Address | null, nowSec: number): AccessGrant | null {
  if (!address) return null;
  const map = readMap();
  const grants = (map[address.toLowerCase()] ?? []).filter((g) => g.expiresAt > nowSec);
  if (!grants.length) return null;
  return grants.sort((a, b) => b.tier - a.tier || b.expiresAt - a.expiresAt)[0];
}

/* --------------------------- مدل دسترسی دولایه --------------------------
 * لایهٔ ۱: ثبت‌نام (پیش‌پرداخت الزامی) — بدون آن هیچ خدماتی فعال نیست
 * لایهٔ ۲: سیگنال (روزانه/هفتگی/ماهانه/سالانه/لایف‌تایم)
 */
export interface AccessState {
  signup: AccessGrant | null;
  signal: AccessGrant | null;
  tier: 0 | 1 | 2;
  /** سیگنال معتبر وجود دارد ولی ثبت‌نام ندارد */
  needsSignup: boolean;
}

export function accessState(address: Address | null, nowSec: number): AccessState {
  const map = address ? readMap() : {};
  const grants = ((address && map[address.toLowerCase()]) || []).filter((g) => g.expiresAt > nowSec);
  const pick = (test: (g: AccessGrant) => boolean) =>
    grants.filter(test).sort((a, b) => b.expiresAt - a.expiresAt)[0] ?? null;
  const signup = pick((g) => g.tier === 1);
  const signal = pick((g) => g.tier === 2);
  return {
    signup,
    signal,
    tier: signup && signal ? 2 : signup ? 1 : 0,
    needsSignup: !signup && !!signal,
  };
}

/* ----------------------------- تمدید خودکار --------------------------- */
export interface AutoRenewPref {
  enabled: boolean;
  planId: PlanId;
}
export function readAutoRenew(): AutoRenewPref | null {
  try {
    const raw = localStorage.getItem(RENEW_KEY);
    return raw ? (JSON.parse(raw) as AutoRenewPref) : null;
  } catch {
    return null;
  }
}
export function writeAutoRenew(pref: AutoRenewPref | null) {
  if (!pref) localStorage.removeItem(RENEW_KEY);
  else localStorage.setItem(RENEW_KEY, JSON.stringify(pref));
}

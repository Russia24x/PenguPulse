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
  isAddress,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import { abstract } from "viem/chains";
import type { AbstractClient } from "@abstract-foundation/agw-client";
import { ABSTRACT, MIN_PAYMENT, PENGU, PLANS, TREASURY, type Plan, type PlanId } from "../config";

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
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== tokenAddress) continue;
    try {
      const decoded = decodeTransferLog(log.topics as [`0x${string}`, `0x${string}`, `0x${string}`], log.data);
      if (!decoded) continue;
      if (getAddress(decoded.to) !== treasuryAddress) throw new ChainError("WRONG_RECIPIENT");
      if (decoded.value < MIN_WEI) throw new ChainError("AMOUNT_TOO_LOW");
      return decoded;
    } catch (e) {
      if (e instanceof ChainError) throw e;
    }
  }
  throw new ChainError("NOT_PENGU");
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

export function isAddressValid(a: string) {
  return isAddress(a);
}

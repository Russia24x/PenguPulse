/**
 * لایهٔ بلاکچین Abstract — امنیت در مرکز
 * ------------------------------------------------------------------
 * - هیچ کلید خصوصی‌ای در مرورگر لمس نمی‌شود؛ امضا فقط داخل کیف پول کاربر
 * - پرداخت = انتقال ERC-20 PENGU به خزانه + راستی‌آزمایی رسید تراکنش
 *   روی‌زنجیره (receipt + لاگ Transfer + مهر زمانی بلوک) — قابل آدرس‌دهی
 *   عمومی در Abscan و مستقل از هر بک‌اند
 * - کشف کیف پول با EIP-6963 (چندکیفی) + fallback به window.ethereum
 * - ذخیرهٔ دسترسی‌ها فقط روی دستگاه کاربر (localStorage)؛ مرجع حقیقت
 *   همیشه زنجیره است و با هش تراکنش بازخوانی می‌شود
 */
import {
  createPublicClient,
  decodeEventLog,
  defineChain,
  encodeFunctionData,
  fallback,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseUnits,
  type Address,
  type Hash,
  type PublicClient,
} from "viem";
import { ABSTRACT, MIN_PAYMENT, PENGU, PLANS, TREASURY, type Plan, type PlanId } from "../config";

export const abstractChain = defineChain({
  id: ABSTRACT.id,
  name: ABSTRACT.name,
  nativeCurrency: ABSTRACT.nativeCurrency,
  rpcUrls: { default: { http: [...ABSTRACT.rpcUrls], webSocket: [...ABSTRACT.wsUrls] } },
  blockExplorers: { default: { name: ABSTRACT.explorerName, url: ABSTRACT.explorer } },
});

export const publicClient: PublicClient = createPublicClient({
  chain: abstractChain,
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

/* ------------------------------ کیف پول ------------------------------ */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

interface Eip6963Info {
  rdns: string;
  name: string;
  icon: string;
}

let discovered: { info: Eip6963Info; provider: Eip1193Provider }[] = [];

export function discoverWallets(timeoutMs = 550): Promise<{ info: Eip6963Info; provider: Eip1193Provider }[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve([]);
    const onAnnounce = (e: Event) => {
      const detail = (e as CustomEvent).detail as { info: Eip6963Info; provider: Eip1193Provider } | undefined;
      if (detail?.info?.rdns && detail.provider) {
        if (!discovered.some((d) => d.info.rdns === detail.info.rdns)) discovered.push(detail);
      }
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve(discovered);
    }, timeoutMs);
  });
}

function injected(): Eip1193Provider | null {
  const w = window as unknown as { ethereum?: Eip1193Provider };
  return w.ethereum ?? null;
}

export async function pickProvider(): Promise<Eip1193Provider | null> {
  const list = await discoverWallets();
  if (list.length === 1) return list[0].provider;
  if (list.length > 1) {
    // ترجیح با کیف پول Abstract / شناخته‌شده‌تر
    const preferred = list.find((d) => /abstract|agw/i.test(d.info.rdns + d.info.name));
    return (preferred ?? list[0]).provider;
  }
  return injected();
}

export async function connectWallet(provider: Eip1193Provider): Promise<{ address: Address; chainId: number }> {
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("NO_ACCOUNT");
  const chainHex = (await provider.request({ method: "eth_chainId" })) as string;
  return { address: getAddress(accounts[0]), chainId: parseInt(chainHex, 16) };
}

export async function ensureAbstractNetwork(provider: Eip1193Provider): Promise<void> {
  const chainHex = (await provider.request({ method: "eth_chainId" })) as string;
  if (parseInt(chainHex, 16) === ABSTRACT.id) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ABSTRACT.hexId }] });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 4902 || code === -32603) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: ABSTRACT.hexId,
            chainName: ABSTRACT.name,
            nativeCurrency: ABSTRACT.nativeCurrency,
            rpcUrls: ABSTRACT.rpcUrls,
            blockExplorerUrls: [ABSTRACT.explorer],
          },
        ],
      });
    } else throw err;
  }
}

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

/** ارسال تراکنش پرداخت از طریق کیف پول کاربر */
export async function sendPayment(provider: Eip1193Provider, from: Address, plan: Plan): Promise<Hash> {
  try {
    const hash = (await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to: tokenAddress,
          data: buildPaymentData(plan.price),
        },
      ],
    })) as Hash;
    return hash;
  } catch (err) {
    const code = (err as { code?: number | string }).code;
    if (code === 4001 || code === "ACTION_REJECTED") throw new ChainError("USER_REJECTED");
    throw new ChainError("NETWORK", (err as Error).message);
  }
}

interface TransferInfo {
  from: Address;
  to: Address;
  value: bigint;
}

/** استخراج و اعتبارسنجی لاگ Transfer PENGU به خزانه از رسید */
function extractValidTransfer(receipt: { status: "success" | "reverted"; logs: { address: string; topics: readonly `0x${string}`[]; data: `0x${string}` }[] }): TransferInfo {
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
  let receipt: Awaited<ReturnType<PublicClient["getTransactionReceipt"]>>;
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
  let receipt: Awaited<ReturnType<PublicClient["waitForTransactionReceipt"]>>;
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

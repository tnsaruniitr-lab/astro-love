/**
 * Pull ad performance from the Meta Marketing API.
 *
 * This is the INBOUND half of the measurement loop. The site already pushes
 * conversions to Meta (pixel + CAPI); this reads back what Meta did with the
 * money — spend, impressions, clicks, and the conversions Meta believes it
 * caused — so it can be reconciled against our own purchase ledger.
 *
 * The reconciliation is the point. Meta's conversion count is always a claim:
 * it includes view-through attribution and modelled conversions, and it misses
 * whatever the pixel never saw. Our ledger is the cash. Comparing them is the
 * only way to know how much to trust the optimiser.
 *
 * Auth: needs a token with ads_read on the ad account — NOT the CAPI token,
 * which is scoped to the dataset and can only write events.
 *
 *   META_ADS_TOKEN     token with ads_read
 *   META_AD_ACCOUNT_ID numeric id, no "act_" prefix
 *
 * Usage:
 *   META_ADS_TOKEN=... npx tsx scripts/meta-insights.ts [days]
 *   ... --json out.json     also write the raw rows
 */

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v21.0"}`;
const ACCOUNT = (process.env.META_AD_ACCOUNT_ID || "2586832868413931").replace(/^act_/, "");
const TOKEN = process.env.META_ADS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN || "";
const DAYS = Number(process.argv.find((a) => /^\d+$/.test(a)) || 30);
const JSON_OUT = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;

if (!TOKEN) {
  console.error("No token. Set META_ADS_TOKEN.");
  process.exit(1);
}

async function get(path: string, params: Record<string, string> = {}): Promise<any> {
  const qs = new URLSearchParams({ ...params, access_token: TOKEN }).toString();
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const body = await res.json().catch(() => ({}));
  if (body?.error) {
    const e = body.error;
    throw new Error(`${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""}: ${e.message}`);
  }
  return body;
}

/** Meta returns conversions as an untyped array of {action_type, value}. */
function action(row: any, type: string): number {
  const hit = (row.actions ?? []).find((a: any) => a.action_type === type);
  return hit ? Number(hit.value) : 0;
}
function actionValue(row: any, type: string): number {
  const hit = (row.action_values ?? []).find((a: any) => a.action_type === type);
  return hit ? Number(hit.value) : 0;
}

const money = (n: number, cur: string) => `${cur} ${n.toFixed(2)}`;
const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n));

async function main() {
  console.log(`\nMeta Marketing API — account act_${ACCOUNT}, last ${DAYS} days\n${"─".repeat(78)}`);

  const acct = await get(`act_${ACCOUNT}`, {
    fields: "name,currency,account_status,amount_spent,balance,spend_cap",
  });
  const cur = acct.currency ?? "USD";
  console.log(`Account      ${acct.name}`);
  console.log(`Status       ${acct.account_status === 1 ? "ACTIVE" : acct.account_status}`);
  console.log(`Lifetime     ${money(Number(acct.amount_spent ?? 0) / 100, cur)}`);

  const campaigns = await get(`act_${ACCOUNT}/campaigns`, {
    fields: "name,status,objective,daily_budget",
    limit: "50",
  });
  console.log(`Campaigns    ${campaigns.data?.length ?? 0}`);
  for (const c of campaigns.data ?? []) {
    console.log(`  · ${pad(c.name, 34)} ${pad(c.status, 10)} ${c.objective ?? ""}`);
  }

  // Ad-level, one row per day: the grain everything else can be rolled up from.
  const insights = await get(`act_${ACCOUNT}/insights`, {
    level: "ad",
    time_increment: "1",
    date_preset: DAYS <= 7 ? "last_7d" : DAYS <= 14 ? "last_14d" : "last_30d",
    fields: [
      "date_start", "campaign_id", "campaign_name", "adset_name", "ad_id", "ad_name",
      "spend", "impressions", "clicks", "cpc", "cpm", "ctr", "reach", "frequency",
      "actions", "action_values",
    ].join(","),
    limit: "500",
  });

  const rows = insights.data ?? [];
  console.log(`\nInsight rows ${rows.length}`);

  if (!rows.length) {
    console.log(`\n  No delivery in this window — nothing has run yet.`);
    console.log(`  The connection is proven regardless: the account, campaign`);
    console.log(`  and insights endpoints all authenticated and returned 200.\n`);
  } else {
    console.log(`\n${pad("date", 11)}${pad("campaign", 24)}${pad("spend", 11)}${pad("impr", 8)}${pad("clicks", 8)}${pad("VC", 6)}${pad("IC", 6)}${pad("purch", 7)}rev`);
    console.log("─".repeat(90));
    let spend = 0, purch = 0, rev = 0;
    for (const r of rows) {
      const vc = action(r, "view_content");
      const ic = action(r, "initiate_checkout");
      const pu = action(r, "purchase");
      const pv = actionValue(r, "purchase");
      spend += Number(r.spend ?? 0); purch += pu; rev += pv;
      console.log(
        pad(r.date_start, 11) + pad(r.campaign_name ?? "", 24) +
        pad(money(Number(r.spend ?? 0), cur), 11) + pad(String(r.impressions ?? 0), 8) +
        pad(String(r.clicks ?? 0), 8) + pad(String(vc), 6) + pad(String(ic), 6) +
        pad(String(pu), 7) + pv.toFixed(2),
      );
    }
    console.log("─".repeat(90));
    console.log(`TOTAL spend ${money(spend, cur)} · purchases ${purch} · revenue ${money(rev, cur)}`);
    console.log(`CAC ${purch ? money(spend / purch, cur) : "—"} · ROAS ${spend ? (rev / spend).toFixed(2) + "x" : "—"}`);
    console.log(`\nNOTE: "purchases" here is META'S claim (view-through + modelled).`);
    console.log(`Reconcile against the purchases table before believing it.\n`);
  }

  if (JSON_OUT) {
    const { writeFileSync } = await import("fs");
    writeFileSync(JSON_OUT, JSON.stringify({ account: acct, campaigns: campaigns.data, insights: rows }, null, 2));
    console.log(`Raw rows written to ${JSON_OUT}`);
  }
}

main().catch((e) => {
  console.error(`\nFAILED: ${e.message}\n`);
  if (/#200|ads_read|ads_management/.test(e.message)) {
    console.error("That token can't read this ad account. In Business Settings →");
    console.error("System users → your user → Add assets → Ad accounts → select");
    console.error("'Dreamport – AstroMatch' → enable 'View performance', then");
    console.error("Generate new token with the ads_read permission ticked.\n");
  }
  process.exit(1);
});

// Where prior opt-in is legally required before an advertising pixel may load.
//
// Detected from the browser's IANA time zone, not its IP. That is deliberate:
// the check is about which law covers the visitor, and a time zone is a stable,
// local, zero-latency signal that needs no geo-IP service and no request to a
// third party. It is also honest about its own limits — an unrecognised or
// unreadable zone is treated as "consent required", so the failure mode is the
// conservative one.
//
// Covered: EU 27 (including the outermost regions, where the GDPR applies),
// the rest of the EEA (Iceland, Liechtenstein, Norway), the UK and its Crown
// dependencies, and Switzerland (FADP — not the GDPR, but close enough that
// asking is the cheaper mistake).
//
// Deliberately NOT covered, i.e. no banner: Ukraine (Europe/Kyiv), Kazakhstan,
// Georgia, Moldova, Serbia, Turkey, Israel, the Gulf, and the Americas.

const CONSENT_REQUIRED_ZONES = new Set([
  // EU 27
  "Europe/Vienna",
  "Europe/Brussels",
  "Europe/Sofia",
  "Europe/Zagreb",
  "Asia/Nicosia", "Asia/Famagusta",
  "Europe/Prague",
  "Europe/Copenhagen",
  "Europe/Tallinn",
  "Europe/Helsinki",
  "Europe/Paris",
  "Europe/Berlin", "Europe/Busingen",
  "Europe/Athens",
  "Europe/Budapest",
  "Europe/Dublin",
  "Europe/Rome",
  "Europe/Riga",
  "Europe/Vilnius",
  "Europe/Luxembourg",
  "Europe/Malta",
  "Europe/Amsterdam",
  "Europe/Warsaw",
  "Europe/Lisbon", "Atlantic/Madeira", "Atlantic/Azores",
  "Europe/Bucharest",
  "Europe/Bratislava",
  "Europe/Ljubljana",
  "Europe/Madrid", "Africa/Ceuta", "Atlantic/Canary",
  "Europe/Stockholm",
  // French outermost regions — EU territory, so the GDPR travels with them.
  "America/Guadeloupe", "America/Martinique", "America/Cayenne",
  "Indian/Reunion", "Indian/Mayotte",
  // EEA beyond the EU
  "Atlantic/Reykjavik",
  "Europe/Vaduz",
  "Europe/Oslo",
  // UK + Crown dependencies
  "Europe/London", "Europe/Belfast", "Europe/Guernsey", "Europe/Jersey", "Europe/Isle_of_Man",
  // Switzerland (FADP)
  "Europe/Zurich",
]);

/** True when this visitor must opt in before any advertising tag may load.
 *  Unknown or unreadable time zone → true (ask rather than assume). */
export function consentRequired(): boolean {
  if (typeof Intl === "undefined") return true;
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return true;
    return CONSENT_REQUIRED_ZONES.has(zone);
  } catch {
    return true;
  }
}

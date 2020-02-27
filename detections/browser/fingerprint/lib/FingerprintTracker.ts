export default class FingerprintTracker {
  constructor() {}
  private fingerprints: { [fingerprint: string]: Date[] } = {};
  private uniqueFingerprints: { [fingerprint: string]: { key: string; value: object }[] } = {};

  public count(fingerprint: string) {
    return this.fingerprints[fingerprint]?.length || 0;
  }

  public toProfile(includeDetails = false) {
    const breakdown = Object.values(this.fingerprints).map(x => x.length);
    let total = 0;
    for (const entry of breakdown) total += entry;
    const mostFrequentProfile = Math.max(...breakdown.map(x => x / total));

    const frequency = Math.round(100 * mostFrequentProfile);

    return {
      fingerprints: Object.keys(this.fingerprints).length,
      fingerprintsMaxSeenPct: frequency,
      fingerprintDetails: includeDetails
        ? Object.entries(this.uniqueFingerprints).map(([key, value]) => {
            return {
              fingerprint: key,
              components: value.reduce((all, entry) => {
                all[entry.key] = entry.value;
                return all;
              }, {}),
            };
          })
        : null,
    };
  }

  public hit(fingerprint: string, components: { key: string; value: object }[]) {
    if (!this.fingerprints[fingerprint]) this.fingerprints[fingerprint] = [];
    this.fingerprints[fingerprint].push(new Date());

    if (!this.uniqueFingerprints[fingerprint]) this.uniqueFingerprints[fingerprint] = components;

    return this.fingerprints[fingerprint].length;
  }

  public reset() {
    this.fingerprints = {};
  }
}

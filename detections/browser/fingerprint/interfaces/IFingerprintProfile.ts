export default interface IFingerprintProfile {
  stableHash: string;
  fullHash: string;
  browserHash: string;
  components: { key: string; value: object }[];
  useragent: string;
}

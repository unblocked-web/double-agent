export default interface IFingerprintProfile {
  sessionHash: string;
  browserHash: string;
  components: { key: string; value: object }[];
  useragent: string;
}

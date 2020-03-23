export default interface IUserBucketAverages {
  [bucket: string]: { values: number; maxReusePct: number; avgReusePct; category: string };
}

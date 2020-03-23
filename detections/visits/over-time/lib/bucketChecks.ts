import UserBucket from '@double-agent/runner/interfaces/UserBucket';

export function getActiveBucketChecks(activeBuckets: string[]) {
  return bucketChecks.filter(x => x.buckets.every(y => activeBuckets.includes(y.toString())));
}

const bucketChecks = [
  { buckets: [UserBucket.IpAndPortRange], title: 'IP Address' },
  { buckets: [UserBucket.UserCookie], title: 'User Cookie' },
  { buckets: [UserBucket.Browser], title: 'Browser Fingerprint' },
  {
    buckets: [UserBucket.IpAndPortRange, UserBucket.Useragent],
    title: 'IP Address/Port Range and Useragent',
    extras: ' Outbound requests will often follow a series of ports when from the same client.',
  },
];
export default bucketChecks;

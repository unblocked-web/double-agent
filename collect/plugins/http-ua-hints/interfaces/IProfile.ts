import IBaseProfile from '@double-agent/collect/interfaces/IBaseProfile';

type IProfile = IBaseProfile<IProfileData>;

export default IProfile;

export type IProfileData = {
  httpsRawHeaders: string[][];
  http2RawHeaders: string[][];
  jsHighEntropyHints: object;
}



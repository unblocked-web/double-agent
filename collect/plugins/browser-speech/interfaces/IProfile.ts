import IBaseProfile from '@double-agent/collect/interfaces/IBaseProfile';
import IHeaderDataPage from '@double-agent/collect/interfaces/IHeaderDataPage';

type IProfile = IBaseProfile<IProfileData>;

export default IProfile;

export type IProfileData = {
  http?: IVoice[];
  https?: IVoice[];
};

export interface IVoice {
  default: boolean;
  lang: string;
  localService: boolean;
  name: string;
  voiceURI: string;
}

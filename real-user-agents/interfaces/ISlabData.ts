export default interface ISlabData {
  userAgentStrings: string[];
  chromiumBuildVersions: string[];
  browserReleaseDates: IReleaseDates;
  osReleaseDates: IReleaseDates;
  marketshare: {
    byOsId: { [osId: string]: number };
    byBrowserId: { [browserId: string]: number };
  };
}

export interface IReleaseDates {
  [key: string]: string;
}

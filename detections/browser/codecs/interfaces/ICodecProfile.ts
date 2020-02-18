import IWebRTCCodec from './IWebRTCCodec';
import ICodecSupport from './ICodecSupport';

export default interface ICodecProfile {
  useragent: string;
  audioSupport: ICodecSupport;
  videoSupport: ICodecSupport;
  webRtcVideoCodecs: IWebRTCCodec[];
  webRtcAudioCodecs: IWebRTCCodec[];
}

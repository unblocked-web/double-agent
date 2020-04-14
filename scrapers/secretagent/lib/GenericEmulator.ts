import { Emulator } from 'secret-agent/emulators';
import IUserAgent from 'secret-agent/emulators/interfaces/IUserAgent';
import IHttpRequestModifierDelegate from 'secret-agent/shared/commons/interfaces/IHttpRequestModifierDelegate';

export default class GenericEmulator extends Emulator {
  public delegate: IHttpRequestModifierDelegate;

  constructor(userAgent: IUserAgent) {
    super(userAgent);
    this.delegate = {};
  }

  async generatePageOverrides(): Promise<
    {
      script: string;
      callback?: (json: any) => void;
      callbackWindowName?: string;
    }[]
  > {
    return [];
  }
}

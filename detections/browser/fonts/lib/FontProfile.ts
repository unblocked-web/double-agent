import IFontProfile from '../interfaces/IFontProfile';
import { Agent, lookup } from 'useragent';
import ProfilerData from '@double-agent/profiler/data';

const fontGroupings: IFontGrouping[] = [];

export default class FontProfile {
  public static readAll() {
    const profiles: IFontProfile[] = ProfilerData.getByPluginId('browser/fonts');

    return profiles;
  }

  public static async save(useragent: string, fonts: string[]) {
    const profile = { fonts, useragent };
    if (process.env.GENERATE_PROFILES) {
      await ProfilerData.saveProfile('browser/fonts', useragent, profile);
    }
    return profile;
  }

  public static analyze(useDefaultFontsOnly = true, print = true) {
    if (fontGroupings.length) return fontGroupings;
    const profiles = this.readAll();
    const byFont: { [font: string]: { browsers: string[]; operatingSystems: string[] } } = {};
    for (const profile of profiles) {
      const ua = lookup(profile.useragent);
      const browser = `${ua.family} ${ua.major}.${ua.minor}`;
      const os = `${ua.os.family} ${ua.os.major}.${ua.os.minor}`;

      if (useDefaultFontsOnly) {
        profile.fonts = profile.fonts.filter(x => defaultFonts.includes(x));
      }

      const fontList = profile.fonts.toString();
      const existing = fontGroupings.find(x => x.fonts.toString() === fontList);
      if (existing) {
        if (!existing.browsers.includes(browser)) existing.browsers.push(browser);
        if (!existing.operatingSystems.includes(os)) existing.operatingSystems.push(os);
      } else {
        fontGroupings.push({
          fonts: profile.fonts,
          operatingSystems: [os],
          browsers: [browser],
        });
      }
      for (const font of profile.fonts) {
        if (!byFont[font]) byFont[font] = { browsers: [], operatingSystems: [] };
        const existing = byFont[font];
        if (!existing.browsers.includes(browser)) existing.browsers.push(browser);
        if (!existing.operatingSystems.includes(os)) existing.operatingSystems.push(os);
      }
    }
    if (print) {
      console.log(fontGroupings);
      console.log(byFont);
    }
    return fontGroupings;
  }

  public static async export() {
    const groupings = this.analyze(false, false);
  }

  public static findMatch(useDefaultFontsOnly = true, ua: Agent) {
    const groupings = this.analyze(useDefaultFontsOnly, false);
    const browser = `${ua.family} ${ua.major}.${ua.minor}`;
    const os = `${ua.os.family} ${ua.os.major}.${ua.os.minor}`;
    return groupings.find(x => x.browsers.includes(browser) && x.operatingSystems.includes(os));
  }
}

interface IFontGrouping {
  fonts: string[];
  browsers: string[];
  operatingSystems: string[];
}

const defaultFonts = [
  'Andale Mono',
  'Arial',
  'Arial Black',
  'Arial Hebrew',
  'Arial MT',
  'Arial Narrow',
  'Arial Rounded MT Bold',
  'Arial Unicode MS',
  'Bitstream Vera Sans Mono',
  'Book Antiqua',
  'Bookman Old Style',
  'Calibri',
  'Cambria',
  'Cambria Math',
  'Century',
  'Century Gothic',
  'Century Schoolbook',
  'Comic Sans',
  'Comic Sans MS',
  'Consolas',
  'Courier',
  'Courier New',
  'Geneva',
  'Georgia',
  'Helvetica',
  'Helvetica Neue',
  'Impact',
  'Lucida Bright',
  'Lucida Calligraphy',
  'Lucida Console',
  'Lucida Fax',
  'LUCIDA GRANDE',
  'Lucida Handwriting',
  'Lucida Sans',
  'Lucida Sans Typewriter',
  'Lucida Sans Unicode',
  'Microsoft Sans Serif',
  'Monaco',
  'Monotype Corsiva',
  'MS Gothic',
  'MS Outlook',
  'MS PGothic',
  'MS Reference Sans Serif',
  'MS Sans Serif',
  'MS Serif',
  'MYRIAD',
  'MYRIAD PRO',
  'Palatino',
  'Palatino Linotype',
  'Segoe Print',
  'Segoe Script',
  'Segoe UI',
  'Segoe UI Light',
  'Segoe UI Semibold',
  'Segoe UI Symbol',
  'Tahoma',
  'Times',
  'Times New Roman',
  'Times New Roman PS',
  'Trebuchet MS',
  'Verdana',
  'Wingdings',
  'Wingdings 2',
  'Wingdings 3',
];

export function analyze() {
  return FontProfile.analyze();
}

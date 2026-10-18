import { describe, expect, it } from 'vitest';
import { pickMandarinVoice } from './speech';

const voice = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice;

const cantonese = [
  voice('Microsoft HiuGaai Online (Natural) - Chinese (Cantonese Traditional, Hong Kong)', 'zh-HK'),
  voice('Google 粤語（香港）', 'zh-HK'),
  voice('Sin-ji', 'zh_HK'),
  voice('yue voice', 'yue-HK'),
  voice('Macau', 'zh-MO'),
];
const taiwan = voice('Microsoft HsiaoChen Online (Natural) - Chinese (Taiwan)', 'zh-TW');
const mainland = voice('Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)', 'zh-CN');
const mainlandPlain = voice('Microsoft Huihui - Chinese (Simplified, PRC)', 'zh-CN');
const liaoning = voice('Microsoft Xiaobei Online (Natural) - Chinese (Northeastern Mandarin)', 'zh-CN-liaoning');

describe('pickMandarinVoice', () => {
  it('never picks a Cantonese voice', () => {
    expect(pickMandarinVoice(cantonese)).toBeUndefined();
    expect(pickMandarinVoice([...cantonese, taiwan])).toBe(taiwan);
  });

  it('prefers mainland Mandarin, then other Mandarin', () => {
    expect(pickMandarinVoice([taiwan, liaoning, mainlandPlain, ...cantonese])).toBe(mainlandPlain);
    expect(pickMandarinVoice([voice('cmn', 'cmn-TW'), voice('Japanese', 'ja-JP')])?.lang).toBe('cmn-TW');
    expect(pickMandarinVoice([voice('Android', 'cmn_CN'), taiwan])?.lang).toBe('cmn_CN');
  });

  it('prefers neural voices within the same region', () => {
    expect(pickMandarinVoice([mainlandPlain, mainland])).toBe(mainland);
  });

  it('ignores other languages', () => {
    expect(pickMandarinVoice([voice('Vietnamese', 'vi-VN'), voice('Japanese', 'ja-JP')])).toBeUndefined();
  });
});

import { it, expect } from 'vitest';
import { analyze, reviewText } from '../domain/pipeline';
import { defaultPack } from '../domain/knowledge';
it('コピーにもAIの問い・出典・一部参照の制限を残す',()=>{
 const r=analyze('本人は自宅で暮らしたい。',defaultPack);
 r.aiInsights=[{title:'暮らしの希望',focus:'大切にしたいこと',reason:'本人の希望を具体的に確認するため',target:'本人',question:'自宅で大切にしたいことは何でしょうか。',nextStep:'回答を踏まえて支援者と相談する。',supportIds:['basic-共通-15'],observationIds:['O1'],partialContext:true}];
 const copied=reviewText(r,defaultPack);
 expect(copied).toContain('AIによる検討案');
 expect(copied).toContain(r.aiInsights[0].question);
 expect(copied).toContain('支援15');
 expect(copied).toContain('原文の一部');
});

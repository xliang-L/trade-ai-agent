import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('offline packaging removes complete font import with semicolons and preserves theme',()=>{
 execFileSync(process.execPath,['scripts/build-demo.mjs']);
 const html=readFileSync('artifacts/TradeFlow-demo.html','utf8');
 const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
 assert.match(css,/^\s*:root\{/);
 assert.match(css,/--green:#24634c/);
 assert.doesNotMatch(css,/fonts\.googleapis\.com/);
});

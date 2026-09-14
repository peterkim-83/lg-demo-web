import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [firebaseConfigText, workbenchHtml, workbenchApp] = await Promise.all([
  readFile(new URL('../firebase.json', import.meta.url), 'utf8'),
  readFile(new URL('../public/agent-playground/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../public/agent-playground/app.js', import.meta.url), 'utf8')
]);
const firebaseConfig = JSON.parse(firebaseConfigText.replace(/^\uFEFF/, ''));

test('Agent Workbench deploys with a coherent no-store asset graph', () => {
  const hostingTargets = Array.isArray(firebaseConfig.hosting)
    ? firebaseConfig.hosting
    : [firebaseConfig.hosting];
  const workbenchHosting = hostingTargets.find((target) => target.target === 'peter-demo-web');
  assert.ok(workbenchHosting, 'peter-demo-web Hosting target must exist');

  const expectedSources = [
    '/agent-playground',
    '/agent-playground/**',
    '/firebase-auth-client.mjs'
  ];
  const cacheRules = (workbenchHosting.headers || []).filter((rule) =>
    expectedSources.includes(rule.source)
  );

  assert.deepEqual(
    cacheRules.map((rule) => rule.source),
    expectedSources,
    'the Workbench document, local asset subtree, and shared auth dependency must all be covered'
  );
  for (const rule of cacheRules) {
    assert.deepEqual(rule.headers, [
      { key: 'Cache-Control', value: 'no-cache, no-store' }
    ]);
  }

  const workbenchBaseUrl = 'https://hosting.test/agent-playground/index.html';
  const htmlDependencies = [...workbenchHtml.matchAll(/(?:href|src)="([^"]+\.(?:css|m?js))"/g)]
    .map((match) => new URL(match[1], workbenchBaseUrl).pathname);
  const moduleDependencies = [...workbenchApp.matchAll(/from\s+['"]([^'"]+\.m?js)['"]/g)]
    .map((match) => new URL(match[1], workbenchBaseUrl).pathname);
  const localAssetGraph = [...new Set([...htmlDependencies, ...moduleDependencies])].sort();

  assert.deepEqual(localAssetGraph, [
    '/agent-playground/app.js',
    '/agent-playground/runtime-client.mjs',
    '/agent-playground/styles.css',
    '/agent-playground/workbench.css',
    '/firebase-auth-client.mjs'
  ]);
  for (const assetPath of localAssetGraph) {
    assert.equal(
      cacheRules.some((rule) => rule.source === assetPath
        || (rule.source.endsWith('/**') && assetPath.startsWith(rule.source.slice(0, -2)))),
      true,
      `${assetPath} must be covered by a no-store rule`
    );
  }
});

test('Workbench cache rules do not alter the unrelated voice-poc target', () => {
  const voiceHosting = firebaseConfig.hosting.find((target) => target.target === 'voice-poc');
  assert.ok(voiceHosting, 'voice-poc Hosting target must exist');
  assert.equal(Object.hasOwn(voiceHosting, 'headers'), false);
});

/**
 * Map & Data Integrity Regression Test Suite (ISSUE-10 / ISSUE-11 / Constitutional Audit)
 * Run via: npm test  (or node tests/map-integrity.test.js)
 */
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const REPO_NAME = path.basename(ROOT);
const PARENT = path.resolve(ROOT, '..');

function md5File(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

function readUtf8(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

console.log(`\n🔎 Running map & data integrity suite in [${REPO_NAME}]...`);

// 1. package.json & lock file consistency (ISSUE-06)
const pkg = JSON.parse(readUtf8('package.json'));
const expectedPkgName = REPO_NAME === 'planner' ? 'taipei-detective-rpg' : REPO_NAME;
assert.strictEqual(pkg.name, expectedPkgName, `package.json name (${pkg.name}) must match repo directory (${expectedPkgName})`);
assert(pkg.repository && String(pkg.repository.url || '').includes(expectedPkgName), `package.json repository URL must reference ${expectedPkgName}`);
if (fs.existsSync(path.join(ROOT, 'package-lock.json'))) {
  const lock = JSON.parse(readUtf8('package-lock.json'));
  assert.strictEqual(lock.name, expectedPkgName, `package-lock.json name must match ${expectedPkgName}`);
}
console.log('✅ [1] package.json / package-lock.json metadata verified');

// 2. Local HTML asset references exist (ISSUE-04)
for (const htmlFile of ['index.html', 'cyber-realmap.html', 'cases.html', 'proposal.html']) {
  const html = readUtf8(htmlFile);
  const refs = [
    ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]),
    ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map(m => m[1])
  ].filter(u => !/^https?:|^data:|^#/i.test(u));
  for (const rel of refs) {
    assert(fs.existsSync(path.join(ROOT, rel)), `[${htmlFile}] Missing referenced local asset: ${rel}`);
  }
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].filter(m => !/\bsrc=/.test(m[0]));
  inlineScripts.forEach((m, i) => {
    assert.doesNotThrow(() => new vm.Script(m[1], { filename: `${htmlFile}#script${i}` }), `[${htmlFile}] Inline script syntax error (check unescaped <\\/script>)`);
  });
}
console.log('✅ [2] All local script & stylesheet assets verified on disk');

// 3. JavaScript syntax & SSOT data loading (ISSUE-01 / ISSUE-02 / ISSUE-10)
for (const jsFile of ['shared-data.js', 'transit-data.js', 'ebus-directory.js', 'cyber-realmap.js', 'game.js', 'server.js']) {
  const code = readUtf8(jsFile);
  assert.doesNotThrow(() => new vm.Script(code, { filename: jsFile }), `SyntaxError in ${jsFile}`);
}
const casesFile = process.env.MAP_TEST_CASES_JSON ? path.resolve(process.env.MAP_TEST_CASES_JSON) : path.join(ROOT, 'cases.json');
const cases = JSON.parse(fs.readFileSync(casesFile, 'utf8'));
assert(Array.isArray(cases) && cases.length === 50, `Expected 50 cases in cases.json, got ${cases.length}`);
cases.forEach((c, idx) => {
  assert(c.id && c.title, `Case #${idx + 1} missing id/title`);
  assert(c.chapter, `${c.id} missing chapter field (ISSUE-01)`);
  assert(c.diy_experiment, `${c.id} missing diy_experiment field (ISSUE-01)`);
  assert(c.cross_case_clue, `${c.id} missing cross_case_clue field (ISSUE-01)`);
});

const shared = require(path.join(ROOT, 'shared-data.js'));
assert.strictEqual(shared.SHUANGBEI_41_SECTORS.length, 41, 'Expected 41 sectors in shared-data.js');
assert.strictEqual(shared.REAL_WORLD_STORES.length, 377, 'Expected 377 stores in shared-data.js');
assert.strictEqual(shared.DEMO_10_CASES.length, 10, 'Expected 10 demo cases in shared-data.js');
for (const st of shared.REAL_WORLD_STORES) {
  assert(st.lat > 24.6 && st.lat < 25.4 && st.lon > 121.2 && st.lon < 122.1, `Store coords out of Greater Taipei bounds: ${st.name}`);
}

const ebus = require(path.join(ROOT, 'ebus-directory.js'));
assert.strictEqual(ebus.SHUANGBEI_EBUS_FULL_DIRECTORY.length, 1036, 'Expected 1036 routes in ebus-directory.js');
console.log('✅ [3] JS syntax, 50 cases schema, 41 sectors, 377 stores bounds, 1036 bus routes verified');

// 4. Transit station codes & Taiwan bus plate rules (ISSUE-10 + Instinct)
const transit = require(path.join(ROOT, 'transit-data.js'));
assert(Array.isArray(transit.SHUANGBEI_MRT_NETWORK) && transit.SHUANGBEI_MRT_NETWORK.length >= 9, 'Expected 9+ MRT lines');
const codeRegex = /^(BL|R|G|O|BR|Y|A|V|K)\d{1,2}[A-Z]?$/;
let totalMrtStations = 0;
for (const line of transit.SHUANGBEI_MRT_NETWORK) {
  const stationGroups = Array.isArray(line.branches) && line.branches.length
    ? line.branches.map(b => b.stations || [])
    : [line.stations || []];
  for (const list of stationGroups) {
    for (const st of list) {
      totalMrtStations++;
      assert(st.code && codeRegex.test(st.code), `Invalid MRT station code "${st.code}" on line ${line.lineCode}`);
    }
  }
}
assert(totalMrtStations >= 130, `Expected >= 130 MRT stations, got ${totalMrtStations}`);

const realmapJs = readUtf8('cyber-realmap.js');
const plateFnMatch = realmapJs.match(/function generateTaiwanBusPlate[\s\S]*?function sanitizeBusPlate[\s\S]*?\n\}/);
assert(plateFnMatch, 'Missing sanitizeBusPlate in cyber-realmap.js');
const plateCtx = vm.createContext({});
vm.runInContext(plateFnMatch[0], plateCtx);
assert.strictEqual(plateCtx.sanitizeBusPlate('0377'), 'EAA-337', '0377 must normalize to EAA-337');
assert.strictEqual(plateCtx.sanitizeBusPlate('EAA-0377'), 'EAA-337', 'EAA-0377 must normalize to EAA-337');
assert.notStrictEqual(plateCtx.sanitizeBusPlate('KKB-3304', '99'), 'KKB-3304', 'KKB-3304 must not pair with route 99');
assert.strictEqual(plateCtx.sanitizeBusPlate('KKB-90061', '9006'), 'KKB-9006', '5-digit plate suffix must be truncated');
assert(realmapJs.includes('sourceLastOkMs'), 'cyber-realmap.js must track per-source sourceLastOkMs freshness');
assert(realmapJs.includes('map-zoom-mid') && realmapJs.includes('updateMrtLODVisibility'), 'cyber-realmap.js must toggle map-zoom-mid LOD');
assert(!/即將到第\s*\$\{|即將抵達下一站/.test(realmapJs), 'cyber-realmap.js must not reintroduce unverified bus next-stop popup guesses');
console.log(`✅ [4] Transit station codes (${totalMrtStations} entries), sanitizeBusPlate, & Instinct LOD/plate guards verified`);

// 5. UI, LaTeX, mojibake & Proposal integrity (ISSUE-18 / ISSUE-21 / ISSUE-25 / P-01..P-16)
const realmapHtml = readUtf8('cyber-realmap.html');
const realmapCss = readUtf8('cyber-realmap.css');
assert(!realmapHtml.includes('?'), 'Mojibake string detected in cyber-realmap.html (ISSUE-21)');
assert(!realmapHtml.includes('1037') && !realmapJs.includes('1037 條'), 'cyber-realmap UI must show 1,036 routes, not 1037 (P-14)');
assert(realmapJs.includes('IS_STATIC_HOST') && realmapJs.includes('openDetectiveWorkbench'), 'cyber-realmap.js must guard /api and /detective calls on static hosts');
assert(realmapCss.includes('min-width: 0'), '.jump-scroll-wrap min-width: 0 safeguard missing in CSS');
assert(!/\.compass-rose-hud\s*\{[^}]*top:\s*192px/.test(realmapCss), '.compass-rose-hud top must clear #streetFocusPill (232px+)');

for (const f of ['cases.json', 'shared-data.js', 'cyber-realmap.js', 'cases.html']) {
  const txt = readUtf8(f);
  assert(!/\$\\Delta|\$\\text\{|\$Delta h/.test(txt), `Raw LaTeX expression detected in ${f} (ISSUE-18)`);
  assert(!/\$\s*[，。；;\uFF1B]|（\s*\$\s*）|\(\s*\$\s*\)/.test(txt), `Dangling single dollar sign detected in ${f} (ISSUE-18)`);
  assert(!/（\s*）/.test(txt), `Empty parentheses from broken formula removal in ${f} (ISSUE-18)`);
  assert(!/：\s*=\s*/.test(txt), `Orphaned equality sign with missing formula variable in ${f} (ISSUE-18)`);
}

const proposalHtml = readUtf8('proposal.html');
const proposalVisible = proposalHtml.replace(/<script[\s\S]*?<\/script>/gi, '');
assert(!/\$\\(?:ge|times|text)|\$D=M\/V\$|\$isoX|\$340\$/.test(proposalVisible), 'Raw LaTeX leaked into visible proposal.html HTML');
assert(proposalHtml.includes('93 項') && !proposalHtml.includes('85 項'), 'proposal.html header must show 93 items, not 85 (P-12)');
assert(proposalHtml.includes('Zoom 20.5') && proposalHtml.includes('REALMAP_VIEWPORT_CONFIG'), 'proposal.html missing items 92/93 (ISSUE-25)');
assert(!proposalHtml.includes('缺陷清零') && !proposalHtml.includes('d = 3.39'), 'proposal.html still contains falsified/stale claim (P-07/P-13)');
const sec00Html = proposalHtml.slice(proposalHtml.indexOf('id="sec-00"'), proposalHtml.indexOf('id="sec-01"'));
for (const rowId of ['12', '14', '29', '39', '43', '44']) {
  const rowRe = new RegExp(`<tr>\\s*<td[^>]*>${rowId}<\\/td>[\\s\\S]*?<\\/tr>`);
  const rowMatch = sec00Html.match(rowRe);
  assert(rowMatch, `Missing row ${rowId} in proposal.html #sec-00`);
  assert(!rowMatch[0].includes('✅ 100%'), `proposal.html #sec-00 row ${rowId} must not claim ✅ 100% (P-08/P-10/P-11/P-16)`);
}

const proposalMd = readUtf8('PROPOSAL.md');
assert(!proposalMd.includes('缺陷清零') && !proposalMd.includes('N=56') && !proposalMd.includes('d = 3.39'), 'PROPOSAL.md contains falsified/stale claim (P-07/P-13)');
assert(proposalMd.includes('1,036') && !proposalMd.includes('1037'), 'PROPOSAL.md bus route count must be 1,036 (P-14)');
console.log('✅ [5] UI encoding, LaTeX removal, and Proposal P-01..P-16 checks verified');

// 6. Constitutional redlines scan
const bannedPatterns = [
  new RegExp('\u5c11\u5e74\u5075\u63a2'),
  new RegExp('\u85dd\u78a9'),
  new RegExp('\u76ca\u78a9'),
  new RegExp('\u5de5\u8b80\u751f'),
  new RegExp('\u5be6\u7fd2\u751f'),
  new RegExp('\u5c0f\u5e6b\u624b')
];
for (const f of ['cases.json', 'shared-data.js', 'cyber-realmap.js', 'cyber-realmap.html', 'game.js', 'index.html', 'PROPOSAL.md', 'proposal.html', 'cases.html']) {
  const content = readUtf8(f);
  for (const pat of bannedPatterns) {
    assert(!pat.test(content), `Constitutional redline violation (${pat}) in ${f}`);
  }
}
console.log('✅ [6] Zero constitutional redline violations');

// 7. Cross-repo mirror MD5 parity when sibling repos exist (ISSUE-01 / ISSUE-02 / ISSUE-11 / ISSUE-25)
const webSiblings = ['city-pulse-detective', 'taipei-metro-detective-rpg', 'taipei-detective-rpg']
  .filter(r => r !== REPO_NAME && fs.existsSync(path.join(PARENT, r)));

const webSharedFiles = [
  'cases.json', 'shared-data.js', 'cases.html', 'CASES_50_FULL_SPEC.md',
  'PROPOSAL.md', 'PROJECT_PROPOSAL.md', 'proposal.html',
  'cyber-realmap.html', 'cyber-realmap.css', 'cyber-realmap.js',
  'game.js', 'index.html', 'transit-data.js', 'ebus-directory.js',
  'AI_HANDOFF_PROJECT_SPEC.md', 'MAP_ISSUE_BOARD_PROTOCOL.md',
  'TECH_IMPLEMENTATION_PLAN.md', 'COMPLETE_CONVERSATION_CHRONICLE.md',
  'tests/map-integrity.test.js'
];

if (webSiblings.length === 0) {
  console.log('ℹ️ [7] No sibling web repos in parent directory (single-repo CI mode); cross-repo parity skipped.');
} else {
  for (const sib of webSiblings) {
    for (const rel of webSharedFiles) {
      const localPath = path.join(ROOT, rel);
      const sibPath = path.join(PARENT, sib, rel);
      assert(fs.existsSync(localPath), `Missing local shared file: ${rel}`);
      assert(fs.existsSync(sibPath), `Missing sibling shared file in ${sib}: ${rel}`);
      assert.strictEqual(md5File(localPath), md5File(sibPath), `Cross-repo MD5 drift detected for ${rel} between ${REPO_NAME} and ${sib}`);
    }
  }
  const coreDir = path.join(PARENT, 'taipei-detective-core');
  if (fs.existsSync(coreDir)) {
    for (const rel of ['cyber-realmap.html', 'cyber-realmap.css', 'cyber-realmap.js', 'shared-data.js', 'transit-data.js', 'ebus-directory.js', 'AI_HANDOFF_PROJECT_SPEC.md', 'MAP_ISSUE_BOARD_PROTOCOL.md']) {
      const localPath = path.join(ROOT, rel);
      const corePath = path.join(coreDir, rel);
      assert(fs.existsSync(corePath), `Missing mirror file in taipei-detective-core: ${rel}`);
      assert.strictEqual(md5File(localPath), md5File(corePath), `Cross-repo MD5 drift for ${rel} between ${REPO_NAME} and taipei-detective-core`);
    }
  }
  console.log(`✅ [7] Cross-repo MD5 parity verified across siblings: ${webSiblings.join(', ')} (+ core where applicable)`);
}

console.log('\n🎉 ALL MAP & DATA INTEGRITY CHECKS PASSED!\n');

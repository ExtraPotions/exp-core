'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, text) => fs.writeFileSync(path.join(root, p), text);
const replaceOnce = (text, from, to) => {
  if (text.split(from).length !== 2) throw new Error('Expected exactly one source anchor: ' + from.slice(0, 80));
  return text.replace(from, to);
};
if (JSON.parse(read('package.json')).version !== '3.4.10') throw new Error('Expected Core 3.4.10 base');
let foundation = read('src/foundation.js');
const start = foundation.indexOf('      .support-wrap { position:static; }');
const end = foundation.indexOf('      .header-brand {', start);
if (start < 0 || end <= start) throw new Error('Support style boundaries missing');
const closeRule = `      [data-exp-part="close"] {
        width:30px; height:30px; min-width:30px; padding:0;
        border:1px solid #3a3a42; border-radius:8px; background:#151519; color:#b8b8c0;
        cursor:pointer;
      }
`;
let supportCss = foundation.slice(start, end);
supportCss = replaceOnce(supportCss, '.support-button,\n      [data-exp-part="close"]', '.support-button');
supportCss = replaceOnce(supportCss, '.support-button { display:grid; place-items:center; }', '.support-button { box-sizing:border-box; display:grid; place-items:center; }');
// Native mounts replace style nodes with CSP-safe canonical sheets. Keep the same
// support rules there as well as in the standalone control, with one source.
foundation = foundation.slice(0, start) + closeRule + '      ${supportControlCss()}\n' + foundation.slice(end);
foundation = replaceOnce(foundation, 'function css() {', '// A support control carries these styles into native and custom Shadow DOM shells.\nfunction supportControlCss() {\n    return `\n' + supportCss + '    `;\n}\n\nfunction css() {');
foundation = replaceOnce(foundation, 'SHARED_UI_THEMES, css, protectLauncherHost', 'SHARED_UI_THEMES, css, supportControlCss, protectLauncherHost');
write('src/foundation.js', foundation);
let runtime = read('src/runtime.js');
runtime = replaceOnce(runtime, "    wrapper.className = 'support-wrap';", "    wrapper.className = 'support-wrap';\n    const style = document.createElement('style');\n    style.dataset.expSupportControl = '1';\n    style.dataset.expOwned = '1';\n    style.textContent = CoreFoundation.supportControlCss();");
runtime = replaceOnce(runtime, '    wrapper.append(button, popover);', '    wrapper.append(style, button, popover);');
write('src/runtime.js', runtime);
let suite = read('tests/suite-menu-layout.test.cjs');
suite = replaceOnce(suite, "      const headers = await host.evaluate", `      const supportStyle = await host.evaluate(node => {
        const control = node.shadowRoot.querySelector('.support-button');
        const icon = control?.querySelector('svg');
        const buttonRect = control?.getBoundingClientRect();
        const iconRect = icon?.getBoundingClientRect();
        return { width: buttonRect?.width, height: buttonRect?.height, iconWidth: iconRect?.width, iconHeight: iconRect?.height, display: control && getComputedStyle(control).display };
      });
      assert.deepEqual(supportStyle, { width: 30, height: 30, iconWidth: 15, iconHeight: 15, display: 'grid' }, product.name + ': support control has canonical rendered styles');
      const headers = await host.evaluate`);
write('tests/suite-menu-layout.test.cjs', suite);
for (const file of ['package.json', 'package-lock.json']) {
  const pkg = JSON.parse(read(file));
  pkg.version = '3.4.11';
  if (pkg.packages?.['']) pkg.packages[''].version = '3.4.11';
  write(file, JSON.stringify(pkg, null, 2) + '\n');
}
write('CHANGELOG.md', '## 3.4.11 - 2026-10-01\n\n- Makes the shared support control carry its own canonical stylesheet, including the heart icon and donation panel, into custom product menus.\n- Restores support-button presentation in Dropper without reintroducing private product CSS. Native Core menus use the same styling source.\n- Adds computed-style checks for all four product menus and standalone custom shells at full, compact and narrow widths.\n\n' + read('CHANGELOG.md'));
for (const file of ['src/foundation.js', 'src/runtime.js', 'tests/suite-menu-layout.test.cjs']) console.log(file, crypto.createHash('sha256').update(read(file)).digest('hex'));

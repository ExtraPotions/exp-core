// Stand-in for a product menu that shows sections as tabs. The tabs, and the
// visually hidden section headers, are built 600ms after the launcher is clicked.
(() => {
  const host = document.createElement('div');
  host.id = 'fixture-root';
  document.body.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const lines = (word, count) => Array.from({ length: count }, (_, i) => `<p>${word} line ${i + 1}: sample content for a real-looking capture.</p>`).join('');
  shadow.innerHTML = `<style>
    .launcher{position:fixed;right:16px;bottom:16px;width:48px;height:48px}
    [data-exp-part="dock"]{position:fixed;right:80px;top:16px;width:340px;padding:12px;font:15px system-ui;background:#1b2030;color:#eef}
    [data-exp-part="dock"][hidden],.panel[hidden]{display:none}
    [data-exp-section-tabs]{display:flex;gap:8px;margin-bottom:8px}
    [data-exp-section-tabs] [role="tab"]{padding:6px 10px;background:#334;color:#eef;border:0}
    .fl-tool-header{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
    .alpha{background:linear-gradient(90deg,#c33,#36c)}
    .beta{background:linear-gradient(90deg,#3c6,#c9c)}
  </style>
  <button class="launcher" data-exp-part="launcher" aria-label="Open Fixture">F</button>
  <aside data-exp-part="dock" hidden></aside>`;
  const dock = shadow.querySelector('[data-exp-part="dock"]');
  let built = false;
  shadow.querySelector('.launcher').addEventListener('click', () => {
    dock.hidden = !dock.hidden;
    if (built) return;
    built = true;
    setTimeout(() => {
      dock.insertAdjacentHTML('beforeend', `
        <div data-exp-section-tabs role="tablist">
          <button role="tab" aria-label="Alpha" data-exp-section-tab="alpha" aria-selected="true">Alpha</button>
          <button role="tab" aria-label="Beta" data-exp-section-tab="beta" aria-selected="false">Beta</button>
        </div>
        <div class="fl-tool-header" aria-expanded="false" data-panel="one">Alpha</div>
        <div class="panel alpha" id="one" hidden>${lines('Alpha', 14)}</div>
        <div class="fl-tool-header" aria-expanded="false" data-panel="two">Beta</div>
        <div class="panel beta" id="two" hidden>${lines('Beta', 14)}</div>`);
    }, 600);
  });
  dock.addEventListener('click', event => {
    const tab = event.target.closest('[data-exp-section-tabs] [role="tab"]');
    const header = event.target.closest('.fl-tool-header');
    const panelId = tab ? { alpha: 'one', beta: 'two' }[tab.dataset.expSectionTab] : header?.dataset.panel;
    if (!panelId) return;
    for (const other of shadow.querySelectorAll('.fl-tool-header')) {
      const open = other.dataset.panel === panelId;
      other.setAttribute('aria-expanded', String(open));
    }
    for (const panel of shadow.querySelectorAll('.panel')) panel.hidden = panel.id !== panelId;
    for (const other of shadow.querySelectorAll('[data-exp-section-tabs] [role="tab"]')) {
      other.setAttribute('aria-selected', String(other.dataset.expSectionTab === { one: 'alpha', two: 'beta' }[panelId]));
    }
  });
  fetch('https://example.com/should-be-blocked').then(() => { document.body.dataset.fetch = 'ok'; }, () => { document.body.dataset.fetch = 'blocked'; });
})();

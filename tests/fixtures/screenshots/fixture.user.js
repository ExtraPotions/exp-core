// Minimal stand-in for an ExtraPotions menu: a launcher, a dock, two sections, and tabs.
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
    .alpha{background:linear-gradient(90deg,#c33,#36c)}
    .beta{background:linear-gradient(90deg,#3c6,#c9c)}
    .toast{position:fixed;top:0;left:0;background:#f00;color:#fff}
  </style>
  <button class="launcher" data-exp-part="launcher" aria-label="Open Fixture">F</button>
  <div class="toast">Toast that must be hidden</div>
  <aside data-exp-part="dock" hidden>
    <div class="fl-tool-header" aria-expanded="false" data-panel="one">Alpha</div>
    <div class="panel alpha" id="one" hidden><div role="tablist"><button role="tab">First</button><button role="tab">Second</button></div>${lines('Alpha', 14)}</div>
    <div class="fl-tool-header" aria-expanded="false" data-panel="two">Beta</div>
    <div class="panel beta" id="two" hidden>${lines('Beta', 14)}</div>
  </aside>`;
  const dock = shadow.querySelector('[data-exp-part="dock"]');
  shadow.querySelector('.launcher').addEventListener('click', () => { dock.hidden = !dock.hidden; });
  for (const header of shadow.querySelectorAll('.fl-tool-header')) {
    header.addEventListener('click', () => {
      for (const other of shadow.querySelectorAll('.fl-tool-header')) {
        const open = other === header;
        other.setAttribute('aria-expanded', String(open));
        shadow.getElementById(other.dataset.panel).hidden = !open;
      }
    });
  }
  fetch('https://example.com/should-be-blocked').then(() => { document.body.dataset.fetch = 'ok'; }, () => { document.body.dataset.fetch = 'blocked'; });
})();

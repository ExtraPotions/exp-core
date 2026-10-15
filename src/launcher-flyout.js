// Flyout launcher rules shared by every Core copy on a page. Each copy computes the same answer from the
// launcher hosts' attributes alone, so products agree on one launcher without messaging each other.
const ExpLauncherFlyout = (() => {
  const PROTOCOL = '1';
  const SUITE_ORDER = Object.freeze(['dropper','shift','prisma','ward']);
  // Products that only run on their own sites (Dropper on Twitch, WARD on retailers) lead there.
  const SITE_PRODUCTS = Object.freeze(['dropper','ward']);
  const idOf = host => String(host?.dataset?.productId || '');
  const rank = id => { const index = SUITE_ORDER.indexOf(id); return index < 0 ? SUITE_ORDER.length : index; };
  function isSiteProduct(productId) { return SITE_PRODUCTS.includes(String(productId || '')); }
  function flyoutOrder(hosts = []) {
    return [...new Set([...hosts].map(idOf).filter(Boolean))].sort((a,b) => rank(a) - rank(b) || a.localeCompare(b));
  }
  // An older Core on the page cannot draw tiles, so one launcher without the protocol keeps the grid for everyone.
  function flyoutActive(hosts = []) {
    const list = [...hosts];
    return list.length >= 2 && list.every(host => host?.dataset?.expFlyout === PROTOCOL);
  }
  function leadProduct(hosts = []) {
    const list = [...hosts];
    const site = flyoutOrder(list.filter(host => host?.dataset?.expSiteProduct === '1'));
    return site[0] || flyoutOrder(list)[0] || '';
  }
  return Object.freeze({ PROTOCOL, SUITE_ORDER, SITE_PRODUCTS, isSiteProduct, flyoutOrder, flyoutActive, leadProduct });
})();

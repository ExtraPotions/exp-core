# Suite menu and compatibility audit

Date: 2026-10-03. Scope: active menu source, settings consumers, lifecycle cleanup, and candidate regression tests. Static wiring evidence is distinct from browser behavior evidence; this inventory does not claim every possible site has been exercised.

| Control/path | Owner | Setting or caller | Effect/evidence | Migration dependency | Outcome |
|---|---|---|---|---|---|
| System status | Core and four products | systemHealthSnapshot/createHealthControls | Four state mapping; guarded, single-flight recovery browser regressions | None | Keep |
| Menu size | Core | exp:suite:menu-size | 13/15/17px body, 11/13/15px captions, 260/300/340px widths; peer and focus tests | Same-origin preference | Keep |
| Recent progress / Resume | Dropper | account-scoped session timeline/recovery records | 30 event bound; fourth recovery navigation blocked within five minutes; intentional pause respected | Existing account-scoped session helpers | Keep |
| Retailer Coverage | WARD | Retailer.coverage + pattern capabilities | Complete/conservative/uncovered sets; structural safety and coupon quarantine retained | Retailer patterns and persisted category choices | Keep |
| Highlight preview | PRISMA | Renderer.createPreview / Settings | Actual renderer styles, motion, two backgrounds; page match count stable | Existing style and identity preferences | Keep |
| Amazon theme pages | SHIFT | Theme controller/live resolver | Four synthetic pages in Ember/custom light; contrast and art/control checks | Existing themes/site overrides | Keep; no speculative engine rewrite |
| Unused catalog local | PRISMA renderAdvanced | No active caller | No read after removal; health obtains catalog status in its own snapshot | None | Removed |
| Update notification help | SHIFT | Shared version-scoped updater | Removed incorrect once-daily promise; updater tests retain request bounds | Existing update preference | Corrected |
| exp:v3 storage keys and schemas | All | Settings/migration and launcher coordination | Existing settings import, profile, route and account regression suites | Required saved user preferences | Retained |
| Historical release notes | All | Changelog/version history | User-facing historical record | Existing notice/version lookup | Retained |

## Source control inventory

Each row records the active call site and its inline handler/setting expression. Dynamically generated controls retain their factory and collection wiring; product regression suites exercise settings, rendering and restoration separately.

| Product | Source line | Control wiring |
|---|---|---|
| WARD | WARD/src/ui.js:134 | function switchControl(value, label, handler) { |
| WARD | WARD/src/ui.js:144 | function selectControl(value, label, choices, handler) { |
| WARD | WARD/src/ui.js:323 | switchControl(settings.enabled,'WARD protection', |
| WARD | WARD/src/ui.js:329 | selectControl( |
| WARD | WARD/src/ui.js:337 | selectControl(settings.contentAction,'Content action',[['automatic','Automatic'],['hide','Hide'],['dim','Dim']], |
| WARD | WARD/src/ui.js:345 | fragment.append(general,ExtraPotionsCore.createDisclosure('Page activity',summary),protectionReview()); |
| WARD | WARD/src/ui.js:350 | const card=ExtraPotionsCore.createDisclosure('Protection Review'); |
| WARD | WARD/src/ui.js:359 | card.append(row('Missed protection type','',selectControl(missed,'Missed protection type',choices,value=>{missed=value;})),action('Record missed content',()=>{if(missed)record('missed',missed);})); |
| WARD | WARD/src/ui.js:370 | selectControl( |
| WARD | WARD/src/ui.js:379 | switchControl( |
| WARD | WARD/src/ui.js:394 | const coverage=EXP.Retailer.coverage(),coverageCard=ExtraPotionsCore.createDisclosure('Coverage'); |
| WARD | WARD/src/ui.js:403 | switchControl( |
| WARD | WARD/src/ui.js:412 | switchControl( |
| WARD | WARD/src/ui.js:421 | switchControl( |
| WARD | WARD/src/ui.js:430 | switchControl( |
| WARD | WARD/src/ui.js:455 | selectControl( |
| WARD | WARD/src/ui.js:470 | row('Default action','Used when Content action is Automatic and the pattern supports it.',selectControl(settings.defaultAction,'Default action', [['hide','Hide'],['dim','Dim'],['collapse','Collapse'],['annotate','Annotate'],['allow','Allow']], value => update({defaultAction:value},'default-action'))), |
| WARD | WARD/src/ui.js:471 | row('Confidence policy','Controls whether supported detections may be acted on.',selectControl(settings.confidencePolicy,'Confidence policy', [['confirmed','Confirmed only'],['confirmed-supported','Confirmed + supported'],['custom','Custom overrides']], value => update({confidencePolicy:value},'confidence-policy'))), |
| WARD | WARD/src/ui.js:472 | row('Explanation detail','Controls how much decision context appears in Activity.',selectControl(settings.explanationDetail,'Explanation detail', [['concise','Concise'],['detailed','Detailed']], value => update({explanationDetail:value},'explanation-detail'))) |
| WARD | WARD/src/ui.js:475 | for (const [id,label] of categoryControls) categories.append(row(label,'',selectControl(overrideMode(settings.categories,id),label,[['inherit','Inherit'],['on','On'],['off','Off']],value => updateCategoryMode(id,value)))); |
| WARD | WARD/src/ui.js:483 | const stores=ExtraPotionsCore.createDisclosure('Retailer modules'); |
| WARD | WARD/src/ui.js:484 | for(const adapter of EXP.Retailers.all())stores.append(row(adapter.label,${adapter.patternIds.length} protection types,switchControl(settings.retailers[adapter.key]!==false,Protect ${adapter.label},value=>update({retailers:{...EXP.Settings.snapshot().retailers,[adapter.key]:value}},'retailer-module')))); |
| WARD | WARD/src/ui.js:487 | const advanced = ExtraPotionsCore.createDisclosure(Advanced ${EXP.Retailer.label()}); |
| WARD | WARD/src/ui.js:507 | const preferences = ExtraPotionsCore.createDisclosure('Menu preferences'); |
| WARD | WARD/src/ui.js:508 | preferences.append(ExtraPotionsCore.createMenuSizeControls()); |
| WARD | WARD/src/ui.js:510 | preferences.append(row(label,'',switchControl(settings[key],label,value=>{ |
| WARD | WARD/src/ui.js:515 | healthControl?.dispose();healthControl=ExtraPotionsCore.createHealthControls(systemHealthSnapshot,notify);box.append(healthControl.element); |
| WARD | WARD/src/ui.js:557 | const data = ExtraPotionsCore.createDisclosure('Settings',transfers); |
| WARD | WARD/src/ui.js:561 | const safeMode = switchControl(settings.safeMode,'Safe Mode',value=>update({safeMode:value},'safe-mode')); |
| WARD | WARD/src/ui.js:564 | const recovery = ExtraPotionsCore.createDisclosure('Page exceptions'); |
| PRISMA | PRISMA/src/ui.js:26 | function switchControl(label, help, value, change, disabled = false) { const node = row(label, help); const control = el('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(Boolean(value)), 'aria-label': label }); control.disabled = disabled; control.append(el('span', { 'aria-hidden': 'true' })); control.addEventListener('click', () => { const next = control.getAttribute('aria-checked') !== 'true'; control.setAttribute('aria-checked', String(next)); change(next); }); node.append(control); return node; } |
| PRISMA | PRISMA/src/ui.js:27 | function selectControl(label, help, value, choices, change, disabled = false) { const node = row(label, help); const select = el('select', { 'aria-label': label }); select.disabled = disabled; for (const [id, name] of choices) { const option = el('option', { value: id }, name); option.selected = id === value; select.append(option); } select.addEventListener('change', () => change(select.value)); node.append(select); return node; } |
| PRISMA | PRISMA/src/ui.js:28 | function actionRow(label, help, action, actionLabel = label, disabled = false) { const node = row(label, help); const control = button(actionLabel, action); if (['Reset','Reset site','Restore'].includes(actionLabel)) control.classList.add('warn'); control.disabled = disabled; node.append(control); return node; } |
| PRISMA | PRISMA/src/ui.js:38 | section.append(selectControl('Style', 'Uses the same eligible match set.', state.style, [['gradient', 'Gradient'], ['underline', 'Underline'], ['soft-fill', 'Soft Fill']], (style) => update({ style }, 'style'))); |
| PRISMA | PRISMA/src/ui.js:39 | section.append(selectControl('Intensity', 'Changes rendering only.', state.intensity, [['subtle', 'Subtle'], ['balanced', 'Balanced'], ['vivid', 'Vivid']], (intensity) => update({ intensity }, 'intensity'))); |
| PRISMA | PRISMA/src/ui.js:40 | section.append(switchControl('Animation', 'Disabled whenever reduced motion is active.', state.animation, (animation) => update({ animation }, 'animation'))); |
| PRISMA | PRISMA/src/ui.js:41 | section.append(selectControl('Animation style', '', state.animationStyle, [['pulse', 'Pulse'], ['shimmer', 'Shimmer'], ['glow', 'Glow']], (animationStyle) => update({ animationStyle }, 'animation-style'), !state.animation)); |
| PRISMA | PRISMA/src/ui.js:42 | section.append(switchControl('Identity labels', 'Available by pointer and keyboard focus when enabled.', state.labels, (labels) => update({ labels }, 'labels'))); |
| PRISMA | PRISMA/src/ui.js:48 | a11y.append(selectControl('Reduce motion', 'Follow system, always reduce, or allow configured animation.', state.reducedMotion, [['system', 'Follow system'], ['reduce', 'Reduce'], ['allow', 'Allow']], (reducedMotion) => update({ reducedMotion }, 'reduced-motion'))); |
| PRISMA | PRISMA/src/ui.js:49 | a11y.append(switchControl('High contrast', 'Uses a strong local outline and system colors where required.', state.highContrast, (highContrast) => update({ highContrast }, 'high-contrast'))); |
| PRISMA | PRISMA/src/ui.js:50 | a11y.append(selectControl('Non-color indicator', 'Visible even when hue differences are unavailable.', state.nonColorIndicator, [['underline', 'Underline'], ['outline', 'Outline'], ['off', 'Off']], (nonColorIndicator) => update({ nonColorIndicator }, 'non-color-indicator'))); |
| PRISMA | PRISMA/src/ui.js:51 | a11y.append(selectControl('Screen-reader behavior', 'Original text is the quiet default; announcements occur only on explicit navigation.', state.screenReaderBehavior, [['original-text', 'Original text'], ['announce-on-focus', 'Announce on focus']], (screenReaderBehavior) => update({ screenReaderBehavior }, 'screen-reader-behavior'))); |
| PRISMA | PRISMA/src/ui.js:75 | const details = button('Details', () => { detail.hidden = !detail.hidden; details.setAttribute('aria-expanded', String(!detail.hidden)); product?.refresh(); }, 'compact'); |
| PRISMA | PRISMA/src/ui.js:86 | section.append(switchControl('Romantic identities', '', state.includeRomantic, (includeRomantic) => update({ includeRomantic }, 'romantic-identities'))); |
| PRISMA | PRISMA/src/ui.js:91 | section.append(selectControl('Evidence review','',reviewFilter,[['all','All entries'],['definition','Definition reference needed'],['flag','Flag reference needed'],['palette','Exact palette not verified']],value=>{reviewFilter=value;offset=0;paint();})); |
| PRISMA | PRISMA/src/ui.js:92 | const previous = button('Previous results', () => { offset = Math.max(0, offset - 3); paint(); }); |
| PRISMA | PRISMA/src/ui.js:93 | const next = button('Next results', () => { offset += 3; paint(); }); |
| PRISMA | PRISMA/src/ui.js:110 | section.append(selectControl('Matching mode', 'Strict accepts explicit terms; Balanced also accepts supported aliases; Inclusive permits explicitly reviewed opt-ins.', state.matcherMode, [['strict', 'Strict'], ['balanced', 'Balanced'], ['inclusive', 'Inclusive']], (matcherMode) => update({ matcherMode }, 'matcher-mode'))); |
| PRISMA | PRISMA/src/ui.js:111 | section.append(switchControl('Ambiguity Protection', 'Blocks tested competing meanings. Hard collisions remain blocked.', state.ambiguityProtection, (ambiguityProtection) => update({ ambiguityProtection }, 'ambiguity-protection'))); |
| PRISMA | PRISMA/src/ui.js:112 | section.append(switchControl('Surrounding context', 'Required-context terms fail closed when this is off.', state.surroundingContext, (surroundingContext) => update({ surroundingContext }, 'surrounding-context'))); |
| PRISMA | PRISMA/src/ui.js:122 | section.append(switchControl('Enable PRISMA', 'Stop and fully restore PRISMA highlights while retaining settings.', state.enabled, (enabled) => update({ enabled }, 'enablement'))); |
| PRISMA | PRISMA/src/ui.js:125 | const controls = el('div', { class: 'button-grid' }); controls.append(button('Previous Match', () => { const result = EXP.Engine.navigatePrevious(); announce(result ? Match ${result.position} of ${result.total}. : 'No match to navigate.'); }), button('Next Match', () => { const result = EXP.Engine.navigateNext(); announce(result ? Match ${result.position} of ${result.total}. : 'No match to navigate.'); }), button('Highlight All', () => { EXP.Engine.highlightAll(); announce('All eligible highlights are visible.'); })); controls.append(button('Explain Next Match',()=>{const result=EXP.Engine.nav |
| PRISMA | PRISMA/src/ui.js:127 | if(explanation){const card=el('details',{class:'match-explanation',open:'true'});card.open=true;card.append(el('summary',{},Why “${explanation.text.slice(0,80)}” was highlighted));card.append(el('p',{},${explanation.identity.label} · ${explanation.decisionBand==='eligible-explicit'?'Explicit term':'Supported by surrounding context'}),el('p',{},explanation.identity.definition//'Definition review pending.'),el('p',{},Recognition term: ${explanation.term?.text//explanation.text}),el('p',{},Rules: ${explanation.ruleIds.map(rule=>rule.replaceAll('_',' ').toLowerCase()).join(' · ')}));for(const url  |
| PRISMA | PRISMA/src/ui.js:130 | corrections.append(phrase,button('Ignore phrase on this site',()=>{const text=phrase.value.trim();if(!text)return;const state=EXP.Settings.snapshot(),site={...(state.siteOverrides[location.hostname]//{})};site.ignoredPhrases=[...new Set([...(site.ignoredPhrases//[]),text])];update({siteOverrides:{...state.siteOverrides,[location.hostname]:site}},'local-correction');announce('Text containing this phrase will be left unchanged on this site.');})); |
| PRISMA | PRISMA/src/ui.js:131 | for(const text of state.ignoredPhrases//[])corrections.append(button('Remove global exception: '+text,()=>update({ignoredPhrases:state.ignoredPhrases.filter(v=>v!==text)},'remove-correction'))); |
| PRISMA | PRISMA/src/ui.js:132 | for(const text of state.siteOverrides[location.hostname]?.ignoredPhrases//[])corrections.append(button('Remove site exception: '+text,()=>{const site={...state.siteOverrides[location.hostname]};site.ignoredPhrases=site.ignoredPhrases.filter(v=>v!==text);update({siteOverrides:{...state.siteOverrides,[location.hostname]:site}},'remove-correction');})); |
| PRISMA | PRISMA/src/ui.js:134 | section.append(switchControl('Temporarily Hide Highlights', 'Session-only; matching and counts remain active.', engineState.temporarilyHidden, (value) => EXP.Engine.setTemporaryHidden(value))); |
| PRISMA | PRISMA/src/ui.js:139 | section.append(switchControl('Enable on this site', 'Exclusion stops work and restores wrappers for this origin.', !effective.excluded, (enabled) => { const exclusions = state.exclusions.filter((host) => host !== location.hostname); if (!enabled) exclusions.push(location.hostname); update({ exclusions }, 'site-exclusion'); })); |
| PRISMA | PRISMA/src/ui.js:140 | section.append(switchControl('Use site overrides', 'Creates or removes a current-origin override layer.', Boolean(state.siteOverrides[location.hostname]), (enabled) => { const siteOverrides = { ...state.siteOverrides }; if (enabled) siteOverrides[location.hostname] = { matcherMode: state.matcherMode }; else delete siteOverrides[location.hostname]; update({ siteOverrides }, 'site-override-layer'); })); |
| PRISMA | PRISMA/src/ui.js:141 | section.append(selectControl('Matching mode override', 'Inherit or override the current origin.', site.matcherMode // 'inherit', [['inherit', 'Inherit global'], ['strict', 'Strict'], ['balanced', 'Balanced'], ['inclusive', 'Inclusive']], (matcherMode) => { const siteOverrides = { ...state.siteOverrides, [location.hostname]: { ...site } }; if (matcherMode === 'inherit') delete siteOverrides[location.hostname].matcherMode; else siteOverrides[location.hostname].matcherMode = matcherMode; update({ siteOverrides }, 'site-matcher-mode'); }, !state.siteOverrides[location.hostname])); |
| PRISMA | PRISMA/src/ui.js:145 | const paintOverrides = () => { overrideList.replaceChildren(...EXP.Catalog.search(overrideSearch.value).slice(0,3).map((identity) => { const value = site.identityOverrides?.[identity.id] // 'inherit'; return selectControl(identity.label, 'Current-origin behavior.', value, [['inherit', 'Inherit'], ['on', 'On'], ['off', 'Off']], (mode) => { const current = EXP.Settings.snapshot(); const siteOverrides = { ...current.siteOverrides, [location.hostname]: { ...(current.siteOverrides[location.hostname] // {}) } }; const identityOverrides = { ...(siteOverrides[location.hostname].identityOverrides // {} |
| PRISMA | PRISMA/src/ui.js:153 | fragment.append(renderLook(), ExtraPotionsCore.createDisclosure('Highlight style', renderHighlightStyle())); |
| PRISMA | PRISMA/src/ui.js:159 | ExtraPotionsCore.createDisclosure('Language', renderTools()), |
| PRISMA | PRISMA/src/ui.js:160 | ExtraPotionsCore.createDisclosure('Sites', renderSites()) |
| PRISMA | PRISMA/src/ui.js:167 | healthControl?.dispose();healthControl=ExtraPotionsCore.createHealthControls(systemHealthSnapshot,announce); |
| PRISMA | PRISMA/src/ui.js:169 | section.append(switchControl('Safe Mode', 'Immediately restores the page and keeps this recovery menu available.', state.safeMode, (safeMode) => update({ safeMode }, 'safe-mode'))); |
| PRISMA | PRISMA/src/ui.js:175 | const preferences = ExtraPotionsCore.createDisclosure('Menu preferences'); |
| PRISMA | PRISMA/src/ui.js:176 | preferences.append(ExtraPotionsCore.createMenuSizeControls()); |
| PRISMA | PRISMA/src/ui.js:177 | const data = ExtraPotionsCore.createDisclosure('Settings'); |
| PRISMA | PRISMA/src/ui.js:181 | preferences.append(switchControl('Auto-close menu', 'Closes after 15 seconds without interaction.', state.menuAutoClose, (menuAutoClose) => update({ menuAutoClose }, 'menu-auto-close'))); |
| PRISMA | PRISMA/src/ui.js:182 | preferences.append(switchControl('Update notifications', 'Off by default. Opt-in checks request release metadata only.', state.updateNotifications, (updateNotifications) => { update({ updateNotifications }, 'update-notifications'); if (updateNotifications) EXP.Updates.check(true).then((result) => announce(result.available ? Version ${result.latest} is available. : result.state === 'failed' ? 'Update check failed quietly.' : 'PRISMA is up to date.')); })); |
| PRISMA | PRISMA/src/ui.js:183 | const transfer = el('div', { class: 'button-grid' }); transfer.append(button('Export settings', () => download('prisma-settings.json', JSON.stringify(EXP.Settings.exportData(), null, 2)))); |
| PRISMA | PRISMA/src/ui.js:184 | const importRow = row('Import PRISMA settings', 'Validation creates a draft. Apply commits atomically; Cancel changes nothing.'); const file = el('input', { type: 'file', accept: 'application/json,.json', 'aria-label': 'Import PRISMA settings' }); file.addEventListener('change', async () => { try { importDraft = EXP.Settings.prepareImport(JSON.parse(await file.files[0].text())); render(); announce('Import validated. Review and apply or cancel.'); } catch (error) { importDraft = null; announce(error.message, 'error'); } }); file.hidden = true; transfer.append(button('Import settings', () => fil |
| PRISMA | PRISMA/src/ui.js:185 | if (importDraft) { const actions = el('div', { class: 'button-grid' }); actions.append(button('Cancel import', () => { importDraft = null; render(); announce('Import cancelled.'); }, 'secondary'), button('Apply import', () => { EXP.Settings.replace(importDraft, 'import'); importDraft = null; render(); announce('Imported settings applied.'); }, 'primary')); data.append(actions); } |
| SHIFT | SHIFT/src/ui.js:47 | function button(label, action, className = '') { |
| SHIFT | SHIFT/src/ui.js:103 | function switchControl(label, help, value, change) { |
| SHIFT | SHIFT/src/ui.js:111 | function selectControl(label, help, value, values, change) { |
| SHIFT | SHIFT/src/ui.js:125 | function actionRow(label, help, action, actionLabel = label) { const node = row(label, help); node.append(button(actionLabel, action, ['Reset','Reset site'].includes(actionLabel) ? 'action warn' : 'action')); return node; } |
| SHIFT | SHIFT/src/ui.js:165 | const original = button('Hold to Show Original', () => {}, 'secondary'); |
| SHIFT | SHIFT/src/ui.js:215 | line.append(button('View source', () => { |
| SHIFT | SHIFT/src/ui.js:233 | content.append(more, button('Refresh explanation', refresh, 'secondary')); |
| SHIFT | SHIFT/src/ui.js:243 | themes.append(selectControl('Theme Strength', 'Soft narrows depth differences; Strong increases raised-surface depth.', saved.themeStrength, [['soft', 'Soft'], ['normal', 'Normal'], ['strong', 'Strong']], (themeStrength) => commit({ themeStrength }, 'theme-strength', Theme strength set to ${themeStrength}.))); |
| SHIFT | SHIFT/src/ui.js:247 | surfaces.append(selectControl('Surface Intelligence', 'Live repair depth after the base theme and stylesheet pass. Off still themes the page and component roles.', saved.surfaceLevel, [['off', 'Off'], ['conservative', 'Conservative'], ['balanced', 'Balanced'], ['aggressive', 'Aggressive']], (surfaceLevel) => commit({ surfaceLevel }, 'surface-level', Surface intelligence set to ${surfaceLevel}.))); |
| SHIFT | SHIFT/src/ui.js:248 | surfaces.append(switchControl('Preserve artwork and charts', 'Never classify images, video, canvas, or SVG.', saved.preserveArt, (preserveArt) => commit({ preserveArt }, 'preserve-art', preserveArt ? 'Artwork preservation on.' : 'Artwork preservation off.'))); |
| SHIFT | SHIFT/src/ui.js:249 | surfaces.append(switchControl('Repair unreadable surfaces', 'Repair leftover neutral boxes after host CSS paints the page.', saved.repairSurfaces, (repairSurfaces) => commit({ repairSurfaces }, 'repair-surfaces', repairSurfaces ? 'Surface repair on.' : 'Surface repair off.'))); |
| SHIFT | SHIFT/src/ui.js:251 | motion.append(selectControl('Reduce motion', 'Follow the system preference or override it.', saved.reduceMotion, [['off', 'Off'], ['system', 'Follow system'], ['on', 'On']], (reduceMotion) => commit({ reduceMotion }, 'reduce-motion', Reduce motion set to ${reduceMotion}.))); |
| SHIFT | SHIFT/src/ui.js:256 | fragment.append(ExtraPotionsCore.createDisclosure('Readability', renderReadability())); |
| SHIFT | SHIFT/src/ui.js:264 | readability.append(selectControl('Link visibility', 'Increase link distinction without changing status colors.', saved.linkVisibility, [['site', 'Site default'], ['enhanced', 'Enhanced'], ['high', 'High']], (linkVisibility) => commit({ linkVisibility }, 'link-visibility', Link visibility set to ${linkVisibility}.))); |
| SHIFT | SHIFT/src/ui.js:265 | readability.append(selectControl('Text contrast', 'Increase neutral text contrast.', saved.textContrast, [['normal', 'Normal'], ['enhanced', 'Enhanced']], (textContrast) => commit({ textContrast }, 'text-contrast', Text contrast set to ${textContrast}.))); |
| SHIFT | SHIFT/src/ui.js:266 | readability.append(switchControl('Muted text recovery', 'Repair muted text only when contrast is insufficient.', saved.mutedRecovery, (mutedRecovery) => commit({ mutedRecovery }, 'muted-recovery', mutedRecovery ? 'Muted text recovery on.' : 'Muted text recovery off.'))); |
| SHIFT | SHIFT/src/ui.js:267 | readability.append(switchControl('Form readability', 'Improve fields and placeholder contrast.', saved.formReadability, (formReadability) => commit({ formReadability }, 'form-readability', formReadability ? 'Form readability on.' : 'Form readability off.'))); |
| SHIFT | SHIFT/src/ui.js:268 | readability.append(selectControl('Focus visibility', 'Visible keyboard focus without mouse-only effects.', saved.focusVisibility, [['site', 'Site default'], ['enhanced', 'Enhanced'], ['high', 'High']], (focusVisibility) => commit({ focusVisibility }, 'focus-visibility', Focus visibility set to ${focusVisibility}.))); |
| SHIFT | SHIFT/src/ui.js:276 | for (const [key, label] of [['reduceShadows', 'Reduce shadows'], ['reduceTransparency', 'Reduce transparency'], ['simplifyGradients', 'Simplify gradients'], ['reduceBlur', 'Reduce blur']]) effects.append(switchControl(label, 'Applies only to SHIFT-classified surfaces.', saved[key], (value) => commit({ [key]: value }, key, ${label} ${value ? 'on' : 'off'}.))); |
| SHIFT | SHIFT/src/ui.js:283 | for (const [id, label] of EXP.Adapters.options()) adapterGroup.append(switchControl(label, Site adapter control · ${id}, Boolean(adapterValues[id]), (value) => { EXP.Adapters.setOption(id, value); setMessage(${label} ${value ? 'enabled' : 'disabled'}.); })); |
| SHIFT | SHIFT/src/ui.js:294 | current.append(switchControl('Enable SHIFT on this site', 'Disabling restores only SHIFT-owned page changes.', !effective.excluded, (enabled) => { |
| SHIFT | SHIFT/src/ui.js:300 | current.append(selectControl('Site profile', 'Inherit the global profile or assign one to this hostname.', siteProfile, [['inherit', 'Inherit global'], ...state.profiles.map((profile) => [profile.id, profile.name])], (profileId) => { |
| SHIFT | SHIFT/src/ui.js:319 | group.append(selectControl('Current profile', 'Site overrides remain intact. Original resets global appearance.', state.currentProfile, state.profiles.map((profile) => [profile.id, profile.name]), (currentProfile) => { const reset = currentProfile === 'original' ? { theme: 'original', accent: 'site-default' } : {}; onSettings({ ...state, ...reset, currentProfile }, 'profile-select'); setMessage('Profile applied.'); })); |
| SHIFT | SHIFT/src/ui.js:344 | importRow.append(button('Import', () => importInput.click(), 'action'), importInput); group.append(importRow); |
| SHIFT | SHIFT/src/ui.js:360 | ExtraPotionsCore.createDisclosure('Effects & integrations', renderEffects()), |
| SHIFT | SHIFT/src/ui.js:361 | ExtraPotionsCore.createDisclosure('Profiles & sites', renderProfilesSites()) |
| SHIFT | SHIFT/src/ui.js:369 | const chromeGroup = ExtraPotionsCore.createDisclosure('Menu preferences');chromeGroup.append(ExtraPotionsCore.createMenuSizeControls()); |
| SHIFT | SHIFT/src/ui.js:370 | chromeGroup.append(switchControl('Auto-close menu', 'Close after 15 seconds without menu activity.', state.menuAutoClose, (menuAutoClose) => { onSettings({ ...state, menuAutoClose }, 'menu-auto-close'); product?.refresh(); setMessage(menuAutoClose ? 'Automatic close enabled.' : 'Automatic close disabled.'); })); |
| SHIFT | SHIFT/src/ui.js:374 | about.append(switchControl('Update notifications', 'Off by default. When enabled, checks GitHub release metadata when needed and never installs automatically.', state.updateNotifications, (updateNotifications) => { onSettings({ ...state, updateNotifications }, 'update-notifications'); if (updateNotifications) EXP.Updates.check(true).then((result) => setMessage(result.available ? SHIFT ${result.latest} is available. : result.state === 'failed' ? 'Update check failed quietly.' : 'SHIFT is up to date.')); else setMessage('Update notifications disabled.'); })); |
| SHIFT | SHIFT/src/ui.js:385 | healthControl?.dispose();healthControl=ExtraPotionsCore.createHealthControls(systemHealthSnapshot,setMessage);group.append(healthControl.element); |
| SHIFT | SHIFT/src/ui.js:386 | const repairs = ExtraPotionsCore.createDisclosure('Maintenance'); |
| SHIFT | SHIFT/src/ui.js:393 | group.append(switchControl('Safe Mode', 'Suspend transformations and adapters while preserving configuration.', state.safeMode, (safeMode) => { onSettings({ ...state, safeMode }, 'safe-mode'); setMessage(safeMode ? 'Safe Mode active.' : 'Safe Mode disabled.'); })); |
| SHIFT | SHIFT/src/ui.js:395 | const data = ExtraPotionsCore.createDisclosure('Settings'); |
| SHIFT | SHIFT/src/ui.js:401 | importRow.append(button('Import', () => input.click(), 'action'), input); data.append(importRow); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:281 | ui.launcher.addEventListener("click", () => setRailOpen(!railOpen)); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:282 | shadow.getElementById("tdh-header-version")?.addEventListener("click", (event) => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:293 | shadow.getElementById("tdh-rail-close").addEventListener("click", () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:297 | document.addEventListener("keydown", (event) => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:919 | up.addEventListener('click', () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:926 | down.addEventListener('click', () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:945 | check.addEventListener("click", () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1586 | ui.healthControl=ExtraPotionsCore.createHealthControls(systemHealthSnapshot); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1588 | const sizePreferences=ExtraPotionsCore.createDisclosure('Menu preferences',ExtraPotionsCore.createMenuSizeControls()); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1591 | const timeline=ExtraPotionsCore.createDisclosure('Recent progress'); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1593 | timeline.addEventListener('toggle',()=>{if(!timeline.open)return;timelineRows.replaceChildren();const rows=progressTimelineSnapshot();if(!rows.length)timelineRows.textContent='No recent progress or recovery events in this session.';for(const entry of rows.slice().reverse()){const line=document.createElement('p');line.textContent=${new Date(entry.at).toLocaleTimeString()} · ${entry.reason}${entry.minutes!==null? · ${entry.minutes} credited min:''};timelineRows.append(line);}}); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1601 | details.addEventListener('toggle',()=>{if(details.open)explain();});refresh.addEventListener('click',explain);details.append(title,text,refresh); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1607 | history.addEventListener('toggle',()=>{if(history.open)showHistory();});const update=document.createElement('button');update.type='button';update.className='life-btn';update.textContent='Refresh history';update.addEventListener('click',showHistory);history.append(heading,entries,update); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1618 | s.getElementById('tdh-restore-channel-player-now')?.addEventListener('click',()=>{ const requested=restoreChannelPlayer(true);setStatus(requested?'Channel player restore requested':'No compatible Twitch mini-player found on this channel page'); }); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1619 | s.getElementById('tdh-resume-playback')?.addEventListener('click', () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1622 | s.getElementById('tdh-allow-switching')?.addEventListener('click', () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1627 | s.getElementById('tdh-stream-lock')?.addEventListener('click', () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1632 | s.getElementById('tdh-recovery-action')?.addEventListener('click', (event) => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1664 | s.getElementById('tdh-claim-history-panel')?.addEventListener('toggle', renderClaimHistory); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1665 | s.getElementById('tdh-routing-history-panel')?.addEventListener('toggle', renderRoutingHistory); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1669 | s.getElementById("tdh-open-campaigns")?.addEventListener("toggle", (event) => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1674 | s.getElementById("tdh-twitch-login")?.addEventListener("click", () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1683 | s.getElementById("tdh-account-link-open")?.addEventListener("click", () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1691 | s.getElementById("tdh-toggle-inventory")?.addEventListener("click", (event) => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1700 | s.getElementById("tdh-skip-streamer")?.addEventListener("click", (event) => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1705 | s.getElementById("tdh-refresh-now")?.addEventListener("click", () => requestGqlPoll("manual-refresh", true)); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1706 | s.getElementById("tdh-refresh-campaign-data")?.addEventListener("click", async (event) => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1742 | s.getElementById("tdh-clear-skipped-streamers")?.addEventListener("click", (event) => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1759 | s.getElementById("tdh-clear-activity")?.addEventListener("click", (event) => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1765 | s.getElementById("tdh-check-updates")?.addEventListener("click", (event) => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1780 | s.getElementById("tdh-reset-session")?.addEventListener("click", (event) => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1787 | for(const [id,key] of [['tdh-quiet-start','quietHoursStart'],['tdh-quiet-end','quietHoursEnd'],['tdh-switch-policy','switchPolicy']]){const input=s.getElementById(id);input.value=settings[key];input.addEventListener('change',()=>{settings[key]=input.value;saveSettings();refreshViewingControls();});} |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1788 | for(const [id,key] of [['tdh-protected-channels','protectedChannels'],['tdh-excluded-channels','excludedChannels']]){const input=s.getElementById(id);input.value=(settings[key]//[]).join(', ');input.addEventListener('change',()=>{settings[key]=[...new Set(input.value.toLowerCase().split(/[\s,]+/).filter(value=>/^[a-z0-9_]{1,25}$/.test(value)))].slice(0,100);input.value=settings[key].join(', ');saveSettings();refreshQueueList();refreshViewingControls();});} |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1790 | strategy.addEventListener("change", () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1804 | notificationCooldown.addEventListener("change", () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1808 | const queueCount = s.getElementById("tdh-queue-count"); queueCount.value = String(settings.queueCount); queueCount.addEventListener("change", () => { settings.queueCount = Number(queueCount.value); saveSettings(); refreshQueueList(); }); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1809 | const pref = s.getElementById("tdh-queue-preference"); pref.value = settings.queuePreference; pref.addEventListener("change", () => { settings.queuePreference = pref.value; saveSettings(); refreshQueueList(); }); |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1816 | pause.addEventListener("change", () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1826 | opacityRange.addEventListener("input", () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1832 | opacityRange.addEventListener("change", () => { |
| Dropper | Dropper/src/parts/07-markup-lists-and-appearance.js:1837 | s.getElementById("tdh-update-dismiss")?.addEventListener("click", hideUpdateNotice); |

## Geometry scope

Combined-product gate covers two injection orders and all three sizes. A 640 by 500 CSS-pixel viewport exercises the space available at 200% zoom on a 1280 by 1000 display; this is viewport emulation, not a claim of native browser zoom automation. Existing suite gates additionally cover stacked notices, once-per-version persistence, long status text, menu focus and lifecycle coordination.

## Limits

Amazon fixtures are explicitly synthetic and contain no account data. Passing them does not prove every live Amazon widget. Twitch credited progress must still be confirmed against a real session after installation. Conservative retailer patterns remain conservative; coverage disclosure does not add undocumented detection promises.

## Final review corrections

- Blocked Dropper recovery creates no navigation flight, mute request, switch notification, viewing intent, or general-guard update.
- SHIFT site adapter failures are bounded separately from generic theme repair; retry observes effective Safe Mode, exclusion, and suite pause.
- Health mappings reflect coupon confirmation failure, deliberate disablement, effective Original appearance, excluded pages, and adapter degradation.
- Open System cards refresh through existing product state-change paths without polling.
- Shared menu placement clears every horizontally intersecting launcher row, including Extra Large menus at 360px.

Two minor follow-ups remain: include ordinary stream verification success/rejection events in Dropper's timeline, and expand Amazon fixture assertions beyond the selected text/button contrast and image-filter checks. No claim is made that the fixture verifies every purchasing control or every owned surface.

Remote release checks stop at the unpublished Core 3.6.0 tag. Local canonical bytes and builds are checked independently. Remote pin verification is required during the separately approved publication step.

Final candidate verification: 813 tests pass across all five repositories (Core 184, Dropper 303, WARD 121, SHIFT 122, PRISMA 83). Build reproducibility, canonical Core synchronization and duplicate checks pass. The enhanced coexistence gate also checks active SHIFT theme preservation of PRISMA page annotations in both injection orders, all three menu sizes and a 360px viewport. These are local candidates; remote Core v3.6.0 pin validation remains pending publication.

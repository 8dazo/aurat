# Aurat design reference research

Researched 2026-09-28. These are temporary study materials, not production source. Do not ship their HTML, CSS, branding, copy, customer names/logos, or images.

## Sources and evidence

All three sites are listed on Seesaw. Seesaw pages verified through web search/open and separately downloaded as HTML:
- Linear: https://www.seesaw.website/websites/linear-v2 ; source https://linear.app/
- Browserbase: https://www.seesaw.website/websites/browserbase ; source https://www.browserbase.com/
- Raindrop: https://www.seesaw.website/websites/raindrop ; source https://www.raindrop.ai/

Downloaded full current public home HTML to linear.html (1,287,158 bytes), browserbase.html (261,152 bytes), raindrop.html (240,669 bytes), plus seesaw.html and seesaw-{linear,browserbase,raindrop}.html. Inspected headings, section classes, stylesheet links, and actual styles. Browserbase CSS chunks browserbase-0.css through browserbase-11.css were downloaded (~200KB total); Raindrop CSS chunks raindrop-0.css through raindrop-6.css downloaded (~383KB). Linear CSS CDN returned bare HTTP 403, so Linear style claims below are visual observations, not measured stylesheet values. No retry/bypass used.

Viewed live desktop browser screenshots at ~1350×930 for each home page, plus Browserbase feature section and Raindrop workflow section. Screenshot observations are described below; no screenshot files were saved. Raindrop's hero artwork did not visibly render in observed screenshot; its HTML/CSS includes an artwork layer. Do not infer the artwork's appearance from code alone.

## Linear: product-first editorial staging

Observed:
- Near-black background with restrained gray navigation, white wordmark at left, small pill sign-up at right; header roughly 72px tall with fine bottom border.
- Large left-aligned two-line sans headline, white on charcoal, with substantial open space between header and title. At desktop, left gutter roughly 76px and hero headline roughly 62px. These are screenshot estimates.
- Supporting sentence lives below hero title. A small product-announcement link occupies the same lower row at the far right.
- Wide live-style app illustration begins below the copy and extends beyond the viewport. Visible internal structure: sidebar, title toolbar, content detail, auxiliary agent panel. Border lines and subtly varying charcoal surfaces do most of the grouping.
- DOM exposes actual interactive controls inside the product demonstration, including issue navigation, favorites, feature disclosure buttons, and editable example diff. It is not one flat screenshot.
- Section progression in HTML: opening product UI → customer strip → three principles with FIG 0.1/0.2/0.3 labels → intake/integrations → planning/monitoring → AI/automations → build/review/ship → changelog → customer proof → closing CTA.
- Seesaw lists Inter and Berkeley Mono.

Borrowable patterns:
- Use one oversized tangible product view immediately after the hero to establish product reality.
- Give large headline and tiny operational metadata different visual scales.
- Keep fine borders and tonal panels consistent from marketing illustration into functional dashboard.
- Break up large feature stories using small numeric captions, never every section as an equal card grid.

Aurat adaptation (recommendation, not source observation): feature an actual baseline/candidate run comparison at the fold, with scenario list at left and selected trace details at right. Use a compact status row and CI metadata as the small-scale visual counterpoint.

## Browserbase: structural grid and shared feature stage

Observed:
- White/pearl page with visible fine vertical rails near 48px left/right gutters. A compact sticky white nav uses dark type and a black pill CTA.
- Hero is a large inset art surface, centered headline, paired CTAs, and expressive pixel/pointillist mountains. Source branding uses red/orange; do not borrow palette or artwork.
- Logo strip is framed as a measured grid.
- Subsequent feature section has a large editorial heading, then three stacked benefit descriptions in approximately one-third width at left and one shared demo stage in approximately two-thirds width at right. The left descriptions use horizontal top rules. CTA micro-labels are monospaced uppercase.
- The shared demo stage shows sequential product steps/search result/browser frames rather than three disconnected decorative cards.
- DOM contains selectable example tabs with one corresponding panel; later content explains three setup steps.
- CSS confirms GT Planar, GT Standard, GT Standard Mono, Plain. .hero uses display:grid, position:relative, overflow:hidden; media is grid-overlaid; .hero--media max-height is clamp(800px,100vh,1000px). CSS contains video/poster layers and a hero etch trail.

Borrowable patterns:
- Align long-page content to an explicit outer rail and use thin dividers to organize density.
- Let adjacent descriptive controls operate one shared visual area.
- Use mono for command snippets, tiny labels, IDs, and metadata; keep narrative text sans.
- Pair an immediately useful developer CTA with a lower-commitment demo CTA.

Aurat adaptation: left Capture / Replay / Compare steps change the right hand run-comparison illustration. A short command strip can show an original npm install example with working copy control. Use pearl rails inside the otherwise charcoal page and a full-width light technical section as a purposeful rhythm change if desired.

## Raindrop: workflow narration + credible diagnostic UI

Observed:
- Dark charcoal frame, small quiet nav, left hero, subdued body copy, pale rectangular primary button and outlined secondary button with small corner radii. Very sparse surface effects.
- Hero announcement sits above the large title; two CTAs beneath; a small reassurance line and in-page workflow link below.
- Workflow section uses a roughly 30% left column containing heading and five vertical tabs; selected tab gets bright type, a thin vertical active line, and its own two-line description. A roughly 70% oversized real UI pane sits alongside and is slightly clipped by the viewport.
- Observed active Investigate pane contains icon rail, case list, top title strip and chat-like diagnostic detail with tool code evidence. Different charcoal levels, tiny borders and sparse desaturated cyan accents separate layers.
- DOM exposes Trace/Detect/Investigate/Simulate/Verify tabs and actual preview panels. The active tab changed over time; timing/animation mechanism was not inspected, so autoplay is an inference rather than confirmed implementation.
- Later HTML section progression: measured customer outcome → developer quotes → product features → security → pricing → final CTA.
- CSS directly confirms current heading family var(--font-alpha-lyrae), weight 500. Main container width:min(100% - 104px,1280px), so 52px desktop gutters. Hero heading clamp(36px,4.1vw,58px), line-height 1.1, letter-spacing -.038em. Body max-width 45ch, 17px/1.65, #b1b1b1. Description top margin 23px; actions margin-top 29px; footnote 12px with 17px top margin. Smaller breakpoint containers step to 64px/48px/40px total gutters.
- Downloaded CSS includes Inter, Barlow, JetBrains Mono and Alpha Lyrae. Seesaw records Barlow/UI Monospace/Alpha Lyrae; current CSS and older listing differ.

Borrowable patterns:
- Explain a workflow by showing its stages and keeping the current stage's evidence visible.
- Use a narrow list, middle context, and large detail area for a diagnostic dashboard.
- Make tiny colored status cues semantically useful, not decorative.
- Choose readable summary language above trace evidence rather than exposing raw JSON as the only output.

Aurat adaptation: independently written scenario names and a different regression example. Selected row can show tool-call drift, score deltas and baseline-versus-candidate output. Use cyan for active selection and successful verification, muted coral for a regression, with labels/icons so color is never the only cue.

## Cohesive original Aurat direction

Recommendations (original synthesis):
- Palette: charcoal #101214, deeper canvas #0B0D0F, raised surfaces #171B1E, pearl #ECEEEB, muted #8B969B, ice cyan #B9F3F4. Borders rgba(220,240,245,.12). Use coral only for actual failed cases.
- Type: accessible modern sans with a compact mono companion. Big headline 72–88px desktop, ~44px mobile; 16–18px body; 11–12px mono metadata with modest tracking. Keep max body line length ~48ch.
- Layout: 1240px max content, 40–64px desktop gutter, 20px mobile; 120–160px between major stories, 24–32px within dense product sections. Header 72–80px. Hero left aligned with right art; product preview overlaps its lower edge or follows directly.
- Original art concept: a frosted translucent continuous replay loop / split prism sculpture with icy cyan edge light floating against charcoal, subtle film grain and no text. Place mass on right with left half clear. Make it an atmospheric brand object, not the only product explanation.
- Landing sequence: restrained nav → asymmetrical hero + CTA/command → run-comparison preview → short integration/support strip without invented customer proof → numbered vertical workflow + shared panel → large baseline/candidate detail story → quickstart code + CI result → honest pricing/demo CTA → compact footer.
- Dashboard: 224px dark sidebar; slim breadcrumb/environment toolbar; header with date/run trigger; compact summary metrics; one main run table with search/status filters; selected row opens a right detail drawer with Summary / Trace / Output tabs. Preserve page width instead of adding many separate charts.
- Motion: slow one-time art entrance, 160–220ms button/tab/selection transitions, tiny active progress line; honor reduced motion. Do not hide large readable content behind scroll-dependent animation, because Raindrop's observed intermediate scroll state appeared mostly blank before direct workflow navigation.
- Functional behaviors should be explicit: CTA opens runnable demo dashboard, run simulation produces visible queued→running→complete state, search/filter changes rows, row selection changes details, tabs change content, command copy visibly confirms, mobile nav opens/closes.
- Originality: reproduce the reasoning behind patterns, never copy HTML/CSS or exact layouts verbatim. No sourced customer logos, unsupported customer counts, or claims of real integrations. Mark generated demo data where appropriate.

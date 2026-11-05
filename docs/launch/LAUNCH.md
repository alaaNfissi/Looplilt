# Launch materials — review only

Prepared from primary platform guidance checked 26–28 October 2026. Nothing here has been posted, scheduled, submitted, or sent. The remixer is included from v0.2.0. The canonical looplilt.com site, redirects, and enforced HTTPS are live; verify every destination immediately before posting.

## Phases and audiences

1. **Readiness:** finish engineering checks, watch both full exports, listen on headphones and a phone, and approve the PR. Confirm the public remix and setup routes work after any approved deployment.
2. **First creations:** offer the browser remix to creative coders and the setup prompt to equipped coding-agent users. Ask consenting participants to make one change and a working preview. Use the [measurement guide](MEASUREMENT.md).
3. **Technical launch:** share the actual result and a useful implementation detail. Be present for questions. Educators should see the circle-to-wave example and its editable equation, not just the brand film.
4. **Follow-through:** fix repeated blockers, publish only verified community links with permission, and evaluate ten independent completed films before expanding the product.

One useful post and thoughtful replies beat an automatic cross-post campaign. There is no purchased engagement, vote exchange, mass messaging, or star requirement.

## X — lead with the result

Audience: creative coders and JavaScript developers. Attach the 26-second wide film.

Draft:
> One dot, three little worlds. Looplilt makes editable films from JavaScript: a drawing, a timeline, and a player you can share. Try a greenhouse remix, then keep the source.
>
> https://looplilt.com/remix/

Suggested follow-up only if useful: show the actual petal value and the changed flower side by side; link the source. Do not post a long promotional thread by default. X's [authenticity policy](https://help.x.com/en/rules-and-policies/authenticity) prohibits spam and artificial engagement.

## Bluesky — invite a creative variation

Audience: artists who share process. Attach the wide film, with a descriptive video caption.

Draft:
> A dot becomes a flower, an orbit, and a kite. All drawn with Canvas, with the source left open.
>
> Looplilt's first browser remix lets you change the greenhouse's colors, words, and pace. What would you make it grow into?
>
> https://looplilt.com/remix/

Alt-text suggestion: “A small dot grows paper petals, follows an orbit that traces a wave, and becomes the center of a kite. An editable-code label accompanies each scene.”

Use relevant conversation rather than repeated mentions. Bluesky's [community guidelines](https://bsky.social/about/support/community-guidelines) prohibit spam and manipulation of social signals.

## Hacker News / Show HN — author writing brief, not a generated post

HN's [guidelines](https://news.ycombinator.com/newsguidelines.html) prohibit generated and AI-edited post text. **Do not copy text from this launch kit into HN.** The maintainer must write the submission and replies personally.

The [Show HN guidance](https://news.ycombinator.com/showhn.html) asks for something people can actually try, ideally without signup. Use the working remixer as the destination after deployment. The author should choose a factual title beginning “Show HN”, then explain in their own words:

- Why a small, two-file Canvas format was worth building.
- How absolute time enables seeking and frame capture.
- How the browser remixer shares the real drawing and tests export parity.
- Why HTML needs only Node while MP4 requires Chromium and FFmpeg.
- What remains deliberately small and what feedback would help.

Do not solicit votes or comments, automate posting, or imply that an ordinary feature release automatically qualifies as a new Show HN. Check for an earlier submission before choosing a format.

## Reddit — useful technique first, conditional drafts

Candidate communities: [r/creativecoding](https://www.reddit.com/r/creativecoding/) for visual process and [r/opensource](https://www.reddit.com/r/opensource/) for an understandable, maintained tool. Their rule-page responses did not expose substantive rules during this review. **Community-specific eligibility, flair, account requirements, and rules on generated text remain unverified. Do not submit until the maintainer reads the live sidebar/wiki and checks those conditions.** No assumption of moderator approval is made.

Working draft for creative coding, only if current rules permit:
> **One time variable, three little worlds: the source behind a Canvas short**
>
> This 26-second film follows one dot through a flower, a circle-to-wave diagram, and a kite. Each frame is a function of time, so seeking backward does not depend on which frames played before it. The flower's color label is driven by the same value as the drawing. I built Looplilt to keep that source small enough to change.
>
> The source is MIT licensed. I'd be interested in discussing how you structure time and transitions in small procedural films.

Attach the actual wide film. Put the source link where the community permits it. Rewrite personally if its rules require author-written text.

Working angle for open source: show the two project files and discuss the practical choice to make an HTML preview dependency-free while keeping MP4 export local. Ask for feedback on a concrete installation obstacle; avoid “please star” language. Do not send both communities the same post or repeatedly repost after removal. Reddit's [spam policy](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam) makes community context and frequency material.

## Product Hunt — a maker-led listing

Name: **Looplilt**

Tagline draft: **Small animated films. Editable JavaScript.**

Description draft:
> Create short Canvas films with editable source, original procedural sound, and a portable HTML player. Try a greenhouse remix in your browser, then build previews or export MP4s locally. Open source under MIT.

Maker-comment draft:
> I wanted a small creative tool where the drawing stays understandable. Looplilt projects use a timeline file and a drawing file. The browser greenhouse is a starting point: change it, download the source, and keep working locally. I'd like to learn which part of that first-film journey needs the most help.

Use the homepage as the main link and the repository as source/download context. Use a square original mark thumbnail and two genuine gallery images: the remixer and the source-to-player workflow. The [posting guide](https://help.producthunt.com/en/articles/479557-how-to-post-a-product) specifies a personal maker account and currently supports YouTube links for video. Do not invent a hosted video URL; publishing the film to YouTube is a separate approval step. The [sharing guidance](https://help.producthunt.com/en/articles/2690626-how-do-i-share-my-post) rejects mass vote requests, incentives, and coordinated voting.

## GitHub awesome lists — wait for evidence

Candidate: [awesome-creative-coding](https://github.com/terkelg/awesome-creative-coding). Its [contribution guidance](https://github.com/terkelg/awesome-creative-coding/blob/main/contributing.md) asks contributors to check duplicates, use the resource, wait at least a couple of weeks for newly created projects, and submit one suggestion per PR.

Proposed line for later review:
> [Looplilt](https://github.com/alaaNfissi/Looplilt) - Small JavaScript Canvas films with editable source, standalone HTML players, and local MP4 export.

Check the actual category, maturity, and previous suggestions before preparing an external PR. No submission has been opened.

## Compatible skill directories — accuracy before reach

The repository contains a compatible instruction skill; the portable bundle also contains the runtime. A skill-only installer is not a full Node/Chromium/FFmpeg install.

The [skills CLI documentation](https://github.com/vercel-labs/skills/blob/main/docs/commands.md) supports discovery with `--list`. Its [directory documentation](https://skills.sh/docs) describes ranking based on installation telemetry. Do not manufacture installs, add a fabricated popularity badge, or claim official endorsement. Keep evaluation telemetry disabled; installing for a test is not an adoption event.

For Codex, follow [official skill guidance](https://learn.chatgpt.com/docs/build-skills). Local instruction compatibility is the scope of this PR. A directory listing, plugin publication, or registry package requires a separate decision and approval.

## YouTube Shorts — tell the little story

Upload candidate: the complete 26-second portrait film. No extra cut is needed to meet the story's purpose.

Title draft: **A dot with other plans | A little idea**

Description draft:
> A flower, an orbit, and a kite, all drawn with JavaScript in Looplilt. The artwork, motion, and procedural score stay editable.
>
> Make your own: https://looplilt.com/
> Source: https://github.com/alaaNfissi/Looplilt/tree/main/examples/little-idea

Use an opening-dot or flower frame as the cover. The video contains no speech; its short phrases are drawn into the picture. Check mobile overlays and the uploaded audio before publishing. YouTube's [Shorts guidance](https://support.google.com/youtube/answer/15424877) accepts square or vertical videos up to three minutes; the proposed file is substantially shorter. Do not turn a thumbnail or unverified upload into an autoplay success claim.

## Instagram Reels — emphasize craft

Upload candidate: the portrait film. Suggested cover: the lilac flower, with a short caption in the post rather than extra film text.

Caption draft:
> A very small idea refused to stay a dot.
>
> Paper petals, a circle remembering its height, and a kite finding some room. Made with Looplilt: editable JavaScript, original sound, and a little patience.
>
> The greenhouse remix and source are on the project page.

Use a profile link only if the account actually has one configured. Do not imply that a caption URL is always clickable. The [official Reel specification page](https://help.instagram.com/1038071743007909) returned HTTP 429 during verification, so current upload limits and account-specific presentation require a final manual check. The supplied candidate is 720 × 1280 at 30 fps; no claim about the platform's current maximum is made.

## TikTok — begin with the character

Upload candidate: the portrait film. Opening caption draft:
> This dot had other plans.

Post text draft:
> From a dot to a whole little world. The drawing, timing, and score are all editable in Looplilt. What should the dot become next? #CreativeCoding #CanvasArt

Use original audio from the delivered file; do not substitute a trending track without appropriate rights. Check the account's current link capabilities and disclosure controls. TikTok's [integrity guidance](https://www.tiktok.com/community-guidelines/en/integrity-authenticity/) covers original content, edited-media labels, and manipulation. The specific commercial-disclosure help page was blocked during research, so the maker must verify whether promoting their own tool requires a disclosure toggle in the current posting flow. This is a stylized procedural film, not footage of a real event; describe the process honestly.

## Release-day checks

The maintainer approves the final copy, rights, upload destinations, and any account-specific disclosures. Resolve the platform-specific unknowns above. Recheck community rules at posting time. Confirm the remixer URL, source link, stable download, and setup prompt; watch the uploaded transcode and listen to its audio. Keep a record of where a post went and answer relevant questions personally. Do not publish all drafts merely because they are prepared.

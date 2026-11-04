# Measure working creations

The first experiment targets **ten independent people producing a working Looplilt film**. This is an experimental target, not a forecast. No independent-user count or engagement result is claimed here.

## What can be observed

| Question | Available evidence | Limitation |
| --- | --- | --- |
| Are people finding the repository? | Owner-visible GitHub traffic/referrer aggregates and stars | Window-limited, incomplete, and not proof of creation. Do not combine overlapping windows into an invented unique total. |
| Are people downloading a release? | GitHub release-asset download counts | Downloads include repeats and automation. Browser remix ZIPs are generated locally and are not counted by GitHub. |
| Are people understanding the site? | Voluntary five-minute observation: ask what they think it does before giving instructions | This is qualitative research, not automatic telemetry. |
| Are people watching or remixing? | Voluntary observation or self-report | No site events are collected. A browser action is not currently an automatic metric. |
| Did a preview work? | Participant shares the playable HTML and editable source, or demonstrates it privately | Do not require publication or private source disclosure. Record the result with consent. |
| Did local MP4 export work? | A playable MP4 and the participant's reported toolchain/steps | A maintainer's own render is engineering validation, not independent adoption. |
| Did someone return or share? | A voluntary follow-up and a second creation or public showcase link | No cookies, fingerprinting, or cross-site identity matching. |
| Is a community forming? | Reviewed independent showcase issues and accepted source contributions | Separate maintainer examples from independent creations; do not count duplicates as new creators. |

## Small first-film study

Invite people through existing, appropriate relationships only after the maintainer approves outreach. There is no automatic invitation or messaging system.

Ask participants to try the homepage unaided. Let them choose browser remix or coding-agent setup. Measure their reported time to a first visible change, a downloaded project, a working preview, and (optionally) an MP4. Ask what they expected to happen at each transition.

Keep a simple local table: anonymous participant code, route, OS/tool versions volunteered, milestones achieved, blocker, and whether a later film was made. Do not collect emails, IP addresses, prompts, or private file paths in the study table. Agree on a short retention period with participants and delete unnecessary notes after synthesis. Publish aggregate findings only with consent.

Count success when an independent participant demonstrates a working film they changed. Count one creator once, and distinguish a browser remix from an original drawing. Report the denominator: ten completions out of how many consenting attempts, with missing follow-ups visible.

## Decisions tied to evidence

- If people cannot explain the toolkit after seeing the hero, test clearer supporting copy before changing the brand.
- If they customize but cannot use the ZIP, improve the download README and agent prompt before adding more controls.
- If HTML succeeds but MP4 repeatedly fails, prioritize a concrete dependency diagnosis or installation fix.
- If creators return with a second film, consider a second remixer or richer starter. Do not infer retention from stars.
- If showcase review becomes a real workload, consider a curated gallery; do not build one to imply activity.

Capture a dated baseline and compare cohorts or time windows with the same definitions. Avoid false precision from small samples.

## Optional analytics proposal, not enabled

If voluntary studies are too limited, consider aggregate counts for remixer-open, first valid change, and source-download. Review a privacy-respecting provider, retention, hosting, consent needs, and cost with the maintainer before implementation. Do not record titles, colors, source, IP-derived identifiers, or full URLs containing user data. Even with these events, local preview/export success still needs voluntary evidence.

The current site and generated players contain no added analytics. There is no external analytics account, cookie banner workaround, tracking pixel, or remote event collector.

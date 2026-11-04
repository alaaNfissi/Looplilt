# Official website: looplilt.com

Looplilt's canonical website is **https://looplilt.com/**. GitHub Pages remains the host. The repository provides the metadata, links, and deployment instructions. DNS and the live Pages custom-domain setting must be configured together at cutover.

## Before the cutover

The maintainer approves the PR and the production transition separately. Check the existing Namecheap records first and save them for rollback. Preserve mail records (MX, SPF, DKIM, DMARC) and unrelated subdomains.

1. In personal GitHub **Settings → Pages → Add a domain**, add `looplilt.com`. GitHub supplies a unique TXT value. In Namecheap **Domain List → looplilt.com → Manage → Advanced DNS → Host Records**, create TXT host `_github-pages-challenge-alaaNfissi` with that exact value. Return to GitHub and verify. Keep this record afterward. [GitHub verification instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).
2. At the approved cutover, open **Looplilt repository → Settings → Pages**, set **Custom domain** to `looplilt.com`, and save **before** pointing web DNS at Pages.
3. Enter the web records below at the authoritative DNS provider. Namecheap's Advanced DNS controls apply when the domain uses its BasicDNS, PremiumDNS, or FreeDNS. If nameservers point elsewhere, edit records there instead. [Namecheap record instructions](https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/).

## Namecheap web records

Use Automatic TTL. Replace conflicting parking/URL-redirect/web records for these hosts; do not add a wildcard.

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | alaanfissi.github.io |

Optional IPv6: four AAAA records at `@`: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`. Do not keep AAAA records pointing to another host.

These are the [GitHub Pages addresses and domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), rechecked 3 November 2026. The CNAME value has no protocol or repository path. With apex and www configured, Pages redirects www to the configured apex.

## HTTPS and deployment

Wait for GitHub's DNS check and certificate issuance; DNS and the HTTPS option can take up to 24 hours. Enable **Enforce HTTPS** when available. GitHub supplies the certificate; a separately purchased certificate is unnecessary. If issuance fails, inspect conflicting DNS and any restrictive CAA records using [GitHub's HTTPS troubleshooting](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

The existing Pages workflow continues to build `.site` and deploy through GitHub Actions. With this publishing mode, a CNAME file is ignored by GitHub; the repository's Pages setting is the operative configuration. `site/CNAME` records the intended hostname and supports a possible future branch-based publish, but cannot activate the domain by itself.

Relative assets, players, remixer modules, and ZIP downloads work at both the domain root and the former repository subpath. Canonical, social-image, and sitemap URLs use the new domain. No client-side host redirect runs in development or offline players.

## Verify after the approved cutover

Check DNS with `Resolve-DnsName looplilt.com -Type A` and `Resolve-DnsName www.looplilt.com -Type CNAME` (or `dig` on macOS/Linux). Then confirm:

- HTTPS has a valid certificate on apex and www; HTTP upgrades to HTTPS.
- www redirects to apex; the previous https://alaanfissi.github.io/Looplilt/ URL redirects to the correct home page.
- Old deep links such as `/Looplilt/remix/` and `/Looplilt/play/paper-garden.html` reach the equivalent new paths. Test actual redirect responses; do not assume path behavior.
- Home, all nine films in both formats (18 videos), standalone players, remixer download, and setup-prompt copying work on desktop and mobile.
- Social-card, favicon, robots.txt, sitemap.xml, and release-download links load successfully.
- No mixed-content errors, missing modules, redirect loops, or unexpected external requests occur.

Run `node scripts/verify-domain.mjs` after activation for public HTTP/redirect checks. It checks seven canonical/redirect routes and the availability and content types of 53 assets across the nine films, using HEAD requests for large files. It is read-only and deliberately fails while the domain is unconfigured. Automated fixtures exercise successful routing, incorrect redirects, missing videos, and HTML responses masquerading as video; these do not replace live checks after activation.

If the cutover fails, restore the saved web DNS and Pages setting together, retain domain verification, and restore prior canonical metadata through a normal revert PR if needed. Avoid leaving web DNS pointed at an unclaimed Pages hostname. Production activation and these live checks remain pending.

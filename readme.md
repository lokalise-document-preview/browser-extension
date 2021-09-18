<p align="center" style="text-align: center">
<h1>Lokalise document preview<br/> browser extension<br/> [EXPERIMENTAL & UNOFFICIAL]</h1>

[Add to Chrome](https://chrome.google.com/webstore/detail/lokalise-document-preview/egnkinnacilaeckhljnbkaeahioacgba)

<a href="https://youtu.be/F-BfvoxQGQ4" target="_blank" rel="noopener noreferrer">
<img src="https://github.com/terales/lokalise-html-document-preview/blob/master/media/preview.png?raw=true"
		height="329px" width="311px" alt="Screenshot of Lokalise file preview UI adjusted by extension" /> 
</p>
</a>

## How to use ([video demo](https://youtu.be/F-BfvoxQGQ4))

- Install the extension for Chrome (pending) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/lokalise-document-preview/).
- Create a Document type project at [Lokalise.com](https://lokalise.com/).
- Upload an HTML document (file extension should be `.html`).
- Translate the document.
- Go to "Download" section.
- Hit "Preview" and find the preview at the bottom of the page.

If your document in bigger than a preview then a scrolling is available for checking all the document contents.

## Previews are local and secure

This extension is generating previews locally in a secure sandboxed enviroment which is separate from the Lokalise
(using `<iframe sandbox...>`).

| Available                                                                                                                                     | Blocked                                             |
|-----------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------|
| All HTML tags,<br> All links are clickable,<br> CSS styles (inline and from absolute links),<br> Images are loaded from absolute links. | JavaScript,<br> Forms won't be submitted,<br> Popups are blocked. |

Source code is open and available for audit:
- [`source/preview_content_script.ts`](source/preview_content_script.ts)
- [`source/manifest.json`](source/manifest.json)

## Privacy policy

This browser extension does not collect, send or store any information at all.<br/>
<br/>
For the document live preview feature this browser extension:
* collects an API token from user and stores it locally in a browser,
* collects project params (project ID, filename and target language ID) from the project URL and removes after the tab is closed,
* sends a request via proxy hosted on Cloudflare Webworker to get a language ISO code from the ID,
* sends a request via proxy hosted on Cloudflare Webworker to fetch a document preview.

All data is sent to proxy via HTTPS and stored inside the requrest body only.<br>
All data is received from proxy via HTTPS.

No data is stored or cached on the proxy web worker level, [see the source code](https://github.com/terales/lokalise-html-document-preview-worker).

[Cloudflare's policies about privacy and data protection](https://www.cloudflare.com/en-gb/trust-hub/privacy-and-data-protection/) are published separately.

<br/>
It's not affiliated with Lokalise.com and is just a personal project.

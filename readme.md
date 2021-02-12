<p align="center" style="text-align: center">
<h1>Lokalise document preview<br/> browser extension<br/> [EXPERIMENTAL & UNOFFICIAL]</h1>

<img src="https://github.com/terales/lokalise-html-document-preview/blob/master/media/preview.png?raw=true"
		height="329px" width="311px" alt="Screenshot of Lokalise file preview UI adjusted by extension" /> 
</p>

## How to use

- Install extension.
- Create a Document project at [Lokalise.com](https://lokalise.com/).
- Upload an HTML document (file extension should be `.html`).
- Translate the document.
- Go to "Download" section.
- Hit "Preview" and find the preview at the bottom of the page.

If your document in bigger than a preview then a scrolling is available for checkink all the document contents.

## Previews are local and secure

This extension is generating previews locally in a secure sandboxed enviroment which is separate from the Lokalise
(using `<iframe sandbox...>`).

| Available                                                                                                                                     | Blocked                                             |
|-----------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------|
| All HTML tags,<br> All links are clickable,<br> CSS styles (inline and from absolute links),<br> Images would be loaded from absolute links). | JavaScript,<br> Forms won't be submitted,<br> Popups are blocked. |

Source code is open and available for audit:
- [`source/preview_content_script.ts`](source/preview_content_script.ts)
- [`source/manifest.json`](source/manifest.json)

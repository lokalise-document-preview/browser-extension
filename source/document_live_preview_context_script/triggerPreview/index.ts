import templateLoadingPreview from './templateLoadingPreview.html';
import templateCollectApiToken from './templateCollectApiToken.html';

export interface PreviewWindow {
    open(): void;
    close(): void;
    focus(): void;
    isOpened(): boolean;
    loadLocalContentTemplate(templateName: string): Document | null;
    loadNewExternalContent(content: string): Promise<CurrentPreview> | Promise<never>;
}

export interface CurrentPreview {
    keyHighlight(xpath: string): void;
    keyDismissHighlight(xpath: string): void;
    keyUpdateContent(xpath: string, newContent: string): void;
}

export class HtmlPreviewWindow implements PreviewWindow {
    private win!: Window | null;

    open() {
        this.win = window.open('about:blank', '_blank');
    }

    close() {
        this.win?.close();
        this.win = null;
    }

    focus() {
        this.win?.focus();
    }

    isOpened() {
        return !this.isClosed();
    }

    loadLocalContentTemplate(templateName: string) {
        if (this.win) {
            let template = '';
            switch (templateName) {
                case 'templateLoadingPreview':
                    template = templateLoadingPreview;
                    break;
                case 'templateCollectApiToken':
                    template = templateCollectApiToken;
                    break;
            }
            this.win.document.documentElement.innerHTML = template;
            return this.win.document;
        }
        return null;
    }

    loadNewExternalContent(html: string) {
        if (this.isClosed()) {
            return Promise.reject();
        }

        this.win?.document.body.classList.add('loading');

        return new Promise((resolve: (value: CurrentPreview) => void) => {
            const existingIframe = this.win?.document.body.querySelector('iframe')!;
            const newIframeSandboxed = this.getSandboxedPreview(html);
    
            newIframeSandboxed.onload = () => {
                resolve(new HtmlLoadedDocument(newIframeSandboxed));
                this.win?.document.body.classList.remove('loading');
            }
    
            existingIframe.parentElement?.replaceChild(newIframeSandboxed, existingIframe);
        });
    }

    private isClosed() {
        return this.win?.window !== this.win 
            && this.win?.closed === true;
    }

    private getSandboxedPreview(html: string): HTMLIFrameElement {
        const iframeSandboxed = <HTMLIFrameElement>document.createElement("iframe");

        // we need `allow-same-origin` for accessing content from outside
        // just don't add the `allow-scripts` -- as it would break the isolation and introduce security issues
        iframeSandboxed.setAttribute("sandbox", "allow-same-origin");

        iframeSandboxed.srcdoc = html;
        return iframeSandboxed;
    }
}

export class HtmlLoadedDocument implements CurrentPreview {
    private doc: Document;
    private foundElementsCache: { [index: string]: HTMLElement; } = {};
    private highlightedElementClass = 'terales-live-preview-highlighted-element';
    private highlightedElementBgColor = 'rgba(255, 255, 0, 0.5)';
    private highlightedElementStyles = `
        <style id="${this.highlightedElementClass}-style">
            .${this.highlightedElementClass} {
                background-color: ${this.highlightedElementBgColor} !important;
                box-shadow: 0 0 0 5px ${this.highlightedElementBgColor} !important;
            }
        </style>
    `;

    constructor(iframe: HTMLIFrameElement) {
        if (iframe.contentDocument) {
            this.doc = iframe.contentDocument;
        } else {
            throw new Error('Can\'t access HTML preview contentDocument property.');
        }
    }

    keyHighlight(xpath: string) {
        const element = this.getElementFromXpath(xpath);
        if (element) {
            if (!this.doc.head.querySelector(`#${this.highlightedElementClass}-style`)) {
                this.doc.head.insertAdjacentHTML('beforeend', this.highlightedElementStyles);
            }

            element.classList.add(this.highlightedElementClass);
            this.scrollToHighlightedElement(element);
        }
    }

    keyDismissHighlight(xpath: string) {
        const element = this.getElementFromXpath(xpath);
        element?.classList.remove(this.highlightedElementClass);
    }

    keyUpdateContent(xpath: string, newContent: string) {
        const element = this.getElementFromXpath(xpath);
        if (element) {
            element.innerHTML = newContent;
        }
    }

    private scrollToHighlightedElement(element: Element) {
        element.scrollIntoView({ block: 'center', inline: 'nearest'});
    }

    private getElementFromXpath(xpath: string): HTMLElement | undefined  {
        if (this.foundElementsCache[xpath]) {
            return this.foundElementsCache[xpath];
        }

        const nodeFound = this.doc.evaluate(
            this.prepareLokaliseXpathForDOM(xpath),
            this.doc.documentElement,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;

        if (!nodeFound) {
            return undefined;
        }

        if (nodeFound?.nodeType == Node.TEXT_NODE && nodeFound.parentElement) {
            this.foundElementsCache[xpath] = nodeFound.parentElement;
        }
        if (nodeFound?.nodeType == Node.ELEMENT_NODE) {
            this.foundElementsCache[xpath] = nodeFound as HTMLElement;
        }

        return this.foundElementsCache[xpath];
    }

    private prepareLokaliseXpathForDOM(originalXpath: string) {
        let modifiedXpath = originalXpath;

        modifiedXpath = (function addRequiredTbody(xpath: string): string {
            let splitted = xpath.split('/');
            let prepared = []
            for (let i = 0; i < splitted.length; i++) {
                if (splitted[i]?.startsWith('tr') 
                    && !splitted[i - 1]?.startsWith('tbody') 
                    && !splitted[i - 1]?.startsWith('thead') 
                    && !splitted[i - 1]?.startsWith('tfoot')
                ) {
                    prepared.push('tbody');
                }
                prepared.push(splitted[i]);
            }
            return prepared.join('/');
        })(modifiedXpath);
    
        modifiedXpath = (function removePartAfterHash(xpath: string): string {
            return xpath.substring(0, xpath.lastIndexOf('#'));
        })(modifiedXpath);
    
        return modifiedXpath;
    }
}

export class CollectApiDocument {
    private doc: Document;
    private tokenApiInputSelector = '#api-token-input';

    constructor(doc: Document) {
        this.doc = doc;
    }

    listenToTokenInput(onChange: (newValue: string) => any) {
        const input = <HTMLInputElement>this.doc.querySelector(this.tokenApiInputSelector);
        input?.addEventListener('input', () => onChange(input.value));
    }
}

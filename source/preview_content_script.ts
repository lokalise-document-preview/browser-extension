
import debounce from "lodash/debounce";

const spinnerSelector = "#spinner-main";
const previewContainerSelector = ".tab-pane .tab-pane";
const fileTabSelector = ".tab-pane a[href=\"#%TAB_CONTENT_ID%\"]";
const previewClass = "lhdp-preview";

// Start doing anything only after loading is finished
const spinner = document.querySelector(spinnerSelector);
if (spinner instanceof HTMLElement) {
    reactToAttributeChange(spinner, "style", () => {
        if (spinner.style.display != "none") {
            return;
        }

        // Remove all previews
        document.querySelectorAll("." + previewClass).forEach(e => e.remove());

        const allpreviewContainers = document.querySelectorAll(previewContainerSelector);
        allpreviewContainers.forEach((previewContainer: Element) => {
            if (getFilename(previewContainer.id).endsWith('.html')) {
                addPreview(previewContainer);
            }
        });
    });
}

function reactToAttributeChange(element: Element, attribute: string, onAttributeChange: Function, debounceWait = 75) {
    const onAttributeChangeDebounced = debounce(<any>onAttributeChange, debounceWait, { trailing: true });

    const observer = new MutationObserver((mutations: MutationRecord[]): void => {
        mutations.forEach((): void => {
            onAttributeChangeDebounced();
        });
    });

    observer.observe(element, { attributes: true, attributeFilter: [attribute] });
}

function getFilename(tabContentId: string) : string {
    const fileTab = document.querySelector(fileTabSelector.replace("%TAB_CONTENT_ID%", tabContentId));
    return fileTab?.textContent ?? '';
}

function addPreview(activePreviewContainer: Element) {
    const iframeSandboxed = document.createElement("iframe");
    iframeSandboxed.setAttribute("sandbox", "");
    iframeSandboxed.classList.add(previewClass);

    iframeSandboxed.style.border = "2px dashed #282c34";
    iframeSandboxed.style.padding = "0.5em";
    iframeSandboxed.style.width = "100%";
    iframeSandboxed.style.height = "30em";

    iframeSandboxed.srcdoc = activePreviewContainer.textContent ? activePreviewContainer.textContent : "";
    activePreviewContainer.prepend(iframeSandboxed);
}

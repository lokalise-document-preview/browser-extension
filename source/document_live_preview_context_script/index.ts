import { PreviewParams } from './_types';
import { fetchDocumentPreview, isApiTokenAvailable, setApiToken, CantReachExtensionApiError } from './apiService';
import getProjectParams from './getProjectParams';
import { PreviewWindow, CurrentPreview, HtmlPreviewWindow, CollectApiDocument } from './triggerPreview';
import { addOpenPreviewBtn, listenKeyTranslationOpenOrSave, openPreviewBtnId } from './injectPreviewBtnAndListeners';

let previewWindow: PreviewWindow | null = null;
let currentPreview: CurrentPreview | null = null;
const previewBtnSiblingSelector = '.filter-row-element-part.header-key-count-wrap';

// TODO Upgrade to webpack v5 and ts-loader to user `await` in the top context
let processedUrl = window.location.href;
let projectParams: PreviewParams;
(async function() {
    processedUrl = window.location.href;
    
    try {
        projectParams = await getProjectParams();
    } catch(error) {
        if (error instanceof CantReachExtensionApiError) {
            console.error('Can\'t reach the extension API to fetch language ISO code and a codument preview.', error);
            return;
        }

        console.error(error);
        return;
    }
    

    if (projectParams.fileformat != 'html') {
        return;
        // TODO Show that only HTML preview is supported at the moment instead of closing
    }

    if (await isApiTokenAvailable() == false) {
        addOpenPreviewBtn(previewBtnSiblingSelector, callbackCollectApiToken);
        return;
    } 
    
    if (Object.values(projectParams).every(Boolean)) {
        addOpenPreviewBtn(previewBtnSiblingSelector, callbackToFetchPreview);
        listenKeyTranslationOpenOrSave(
            callbackToUpdateHighlightFetchedPreview,
            callbackToUpdateKeyInFetchedPreview,
            callbackToUpdateClosedKeyInFetchedPreview
        );
        return;
    }
})();

// Support switching between files withing a project
const keysContainer = document.getElementById('endless');
if (keysContainer) {
    const observer = new MutationObserver(async () => {
        if (window.location.href == processedUrl) {
            return;
        }

        if (await isApiTokenAvailable() == false) {
            closePreview();
        }

        previewWindow?.loadLocalContentTemplate('templateLoadingPreview');

        getProjectParams().then(async params => {
            projectParams = params;
            processedUrl = window.location.href;

            if (projectParams.fileformat != 'html') {
                closePreview();
                // TODO Show that only HTML preview is supported at the moment instead of closing
            }

            await fetchPreviewIntoCurrentlyOpenedWindow();
        });
    });
    observer.observe(keysContainer, { childList: true });
}

// Close everything when the parent pages closes
window.addEventListener('beforeunload', closePreview);

async function callbackToFetchPreview(onLoaded: Function) {
    // Prevent opening multiple previews
    closePreview();

    if (projectParams.fileformat != 'html') {
        return;
    }

    previewWindow = new HtmlPreviewWindow();
    if (previewWindow) {
        previewWindow.open();
        previewWindow.loadLocalContentTemplate('templateLoadingPreview');
        await fetchPreviewIntoCurrentlyOpenedWindow();
        previewWindow.focus();
    }

    onLoaded();
}

function callbackToUpdateHighlightFetchedPreview(xpath?: string) {
    if (xpath) {
        currentPreview?.keyHighlight(xpath);
    }
}

function callbackToUpdateKeyInFetchedPreview(xpath?: string, newContent?: string) {
    if (xpath) {
        currentPreview?.keyUpdateContent(xpath, <string>newContent);
    }
}

function callbackToUpdateClosedKeyInFetchedPreview(xpath?: string, currentContent?: string) {
    if (xpath) {
        currentPreview?.keyUpdateContent(xpath, <string>currentContent);
        currentPreview?.keyDismissHighlight(xpath);
    }
}

function callbackCollectApiToken(onLoaded: Function) {
    previewWindow = new HtmlPreviewWindow();
    previewWindow.open();
    const doc = previewWindow.loadLocalContentTemplate('templateCollectApiToken');
    if (doc) {
        const collectApiDocument = new CollectApiDocument(doc);
        collectApiDocument.listenToTokenInput(async token => {
            if (token.length > 39) {
                previewWindow?.loadLocalContentTemplate('templateLoadingPreview');
                await setApiToken(token);
                projectParams = await getProjectParams();
                await fetchPreviewIntoCurrentlyOpenedWindow();
                document.getElementById(openPreviewBtnId)?.remove();
                addOpenPreviewBtn(previewBtnSiblingSelector, callbackToFetchPreview);
                listenKeyTranslationOpenOrSave(
                    callbackToUpdateHighlightFetchedPreview,
                    callbackToUpdateKeyInFetchedPreview,
                    callbackToUpdateClosedKeyInFetchedPreview
                );
            }
        });
    }
    onLoaded();
}

async function fetchPreviewIntoCurrentlyOpenedWindow() {
    if (previewWindow?.isOpened()) {
        const previewContent = await fetchDocumentPreview(projectParams);
        currentPreview = await previewWindow.loadNewExternalContent(previewContent);
    }
}

function closePreview() {
    previewWindow?.close();
    previewWindow = null;
    currentPreview = null;
}
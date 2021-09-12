import { PreviewParams } from './_types';
import { fetchDocumentPreview, isApiTokenAvailable, setApiToken } from './apiService';
import getProjectParams from './getProjectParams';
import { PreviewWindow, CurrentPreview, HtmlPreviewWindow, CollectApiDocument, ErrorDocument } from './triggerPreview';
import { addOpenPreviewBtn, listenKeyTranslationOpenOrSave, openPreviewBtnId } from './injectPreviewBtnAndListeners';

let previewWindow: PreviewWindow | null = null;
let currentPreview: CurrentPreview | null = null;
const previewBtnSiblingSelector = '.filter-row-element-part.header-key-count-wrap';

// TODO Upgrade to webpack v5 and ts-loader to user `await` in the top context
let processedUrl = window.location.href;
let projectParams: PreviewParams | undefined;
(async function() {
    if (await isApiTokenAvailable() == false) {
        addOpenPreviewBtn(previewBtnSiblingSelector, callbackCollectApiToken);
        return;
    }

    await populateProjectParams();
    
    if (projectParams && Object.values(projectParams).every(Boolean)) {
        insertActivePreviewBtnAndListeners();
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

        if (previewWindow?.isOpened() == false) {
            return;
        }

        if (await isApiTokenAvailable() == false) {
            closePreview();
        }

        previewWindow?.loadLocalContentTemplate('templateLoadingPreview');
        await populateProjectParams();
        await fetchPreviewIntoCurrentlyOpenedWindow();
    });
    observer.observe(keysContainer, { childList: true });
}

// Close everything when the parent pages closes
window.addEventListener('beforeunload', closePreview);

async function callbackToFetchPreview(onLoaded: Function) {
    // Prevent opening multiple previews
    closePreview();

    if (projectParams?.fileformat != 'html') {
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
        currentPreview?.keyUpdateContent(xpath, newContent ?? '');
    }
}

function callbackToUpdateClosedKeyInFetchedPreview(xpath?: string, currentContent?: string) {
    if (xpath) {
        currentPreview?.keyUpdateContent(xpath, currentContent ?? '');
        currentPreview?.keyDismissHighlight(xpath);
    }
}

function callbackCollectApiToken(onLoaded: Function) {
    if (previewWindow) {
        previewWindow.close();
        previewWindow = null;
    }
    
    previewWindow = new HtmlPreviewWindow();
    previewWindow.open();
    const doc = previewWindow.loadLocalContentTemplate('templateCollectApiToken');
    if (doc) {
        const collectApiDocument = new CollectApiDocument(doc);
        collectApiDocument.listenToTokenInput(async token => {
            if (token.length < 40) {
                return
            }

            previewWindow?.loadLocalContentTemplate('templateLoadingPreview');
            await setApiToken(token);
            await populateProjectParams();
            if (projectParams && Object.values(projectParams).every(Boolean)) {
                await fetchPreviewIntoCurrentlyOpenedWindow();
                document.getElementById(openPreviewBtnId)?.remove();
                insertActivePreviewBtnAndListeners();
            }
        });
    }
    onLoaded();
}

async function populateProjectParams() {
    try {
        projectParams = await getProjectParams();
        processedUrl = window.location.href;

        if (projectParams.fileformat != 'html') {
            showError('Preview is available only for HTML documents.');
        }
    } catch(error) {
        showError(error);
    }
}

async function fetchPreviewIntoCurrentlyOpenedWindow() {
    if (previewWindow?.isOpened() && projectParams) {
        try {
            const previewContent = await fetchDocumentPreview(projectParams);
            currentPreview = await previewWindow.loadNewExternalContent(previewContent);
        } catch (error) {
            await showError(error);
        }
    }
}

function insertActivePreviewBtnAndListeners() {
    addOpenPreviewBtn(previewBtnSiblingSelector, callbackToFetchPreview);
    listenKeyTranslationOpenOrSave(
        callbackToUpdateHighlightFetchedPreview,
        callbackToUpdateKeyInFetchedPreview,
        callbackToUpdateClosedKeyInFetchedPreview
    );
}

function closePreview() {
    previewWindow?.close();
    previewWindow = null;
    currentPreview = null;
}

async function showError(msg: Error | string) {
    if (previewWindow?.isOpened() == false) {
        return
    }

    currentPreview = null;
    const errorDocElement = previewWindow?.loadLocalContentTemplate('templateError');
    if (errorDocElement) {
        const errorDoc = new ErrorDocument (errorDocElement);
        errorDoc.insertError(msg);
    }
}
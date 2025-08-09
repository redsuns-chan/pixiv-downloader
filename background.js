
// background.js for Pixiv Downloader
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadImage') {
        // 用 XMLHttpRequest 嘗試 GET 圖片內容
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', message.imageUrl, true);
            xhr.responseType = 'blob';
            xhr.onload = function() {
                if (xhr.status === 200) {
                    var blob = xhr.response;
                    var objectUrl = URL.createObjectURL(blob);
                    chrome.downloads.download({
                        url: objectUrl,
                        filename: message.filename,
                        saveAs: false
                    }, function(downloadId) {
                        URL.revokeObjectURL(objectUrl);
                        if (chrome.runtime.lastError) {
                            sendResponse({ success: false, error: chrome.runtime.lastError.message });
                        } else {
                            sendResponse({ success: true });
                        }
                    });
                } else {
                    sendResponse({ success: false, error: 'Image request failed: ' + xhr.status });
                }
            };
            xhr.onerror = function() {
                sendResponse({ success: false, error: 'XMLHttpRequest error' });
            };
            xhr.send();
        } catch (err) {
            sendResponse({ success: false, error: err.message });
        }
        // Indicate async response
        return true;
    }
});

// background.js for Pixiv Downloader
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'pixiv-download') {
        fetch(message.imageUrl)
        .then(resp => {
            if (!resp.ok) throw new Error('Failed to fetch image');
            return resp.blob();
        })
        .then(blob => {
            const reader = new FileReader();
            reader.onloadend = function() {
                // 主動回傳結果給 content.js
                chrome.tabs.sendMessage(sender.tab.id, {
                    success: true,
                    dataUrl: reader.result,
                    filename: message.filename
                });
            };
            reader.onerror = function() {
                chrome.tabs.sendMessage(sender.tab.id, {
                    success: false,
                    error: 'Failed to read blob'
                });
            };
            reader.readAsDataURL(blob);
        })
        .catch(err => {
            chrome.tabs.sendMessage(sender.tab.id, {
                success: false,
                error: err.message
            });
        });
        // 不再用 sendResponse，直接 return
        return;
    }
});

// Content script for Pixiv Downloader
(function() {
    // 監聽 background.js 主動回傳的下載結果
    chrome.runtime.onMessage.addListener(function(response, sender, sendResponse) {
		console.log(response);
        if (response && response.success && response.dataUrl && response.filename) {
            const a = document.createElement('a');
            a.href = response.dataUrl;
            a.download = response.filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
            }, 1000);
            alert('Download started!');
        } else if (response && response.error) {
			console.error('Download failed:', JSON.stringify(response, null, 2));
            alert('Download failed: ' + response.error);
        }
    });
    if (window.location.hostname !== "www.pixiv.net") return;

    // Settings storage
    let pixivDownloaderSettings = {
        savePath: '',
        quality: 'original'
    };

    // Load settings from chrome.storage.sync
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['savePath', 'quality'], function(items) {
            if (items.savePath) pixivDownloaderSettings.savePath = items.savePath;
            if (items.quality) pixivDownloaderSettings.quality = items.quality;
        });
    }

    async function downloadAllImages(e) {
        e.stopPropagation();
        e.preventDefault();
        const match = window.location.pathname.match(/^\/artworks\/(\d+)$/);
        if (!match) {
            alert('Download only works on artwork detail pages.');
            return;
        }
        const artworkId = match[1];
        try {
            const resp = await fetch(`https://www.pixiv.net/ajax/illust/${artworkId}`);
            if (!resp.ok) throw new Error('Failed to fetch artwork info');
            const data = await resp.json();
            const urls = data.body && data.body.urls;
            if (!urls) throw new Error('No image URLs found');
            let quality = pixivDownloaderSettings.quality || 'original';
            let imageUrl = urls[quality] || urls['original'];
            const filename = `${artworkId}_${quality}.jpg`;
            // 發訊息給 background.js 下載
            chrome.runtime.sendMessage({
                action: 'pixiv-download',
                imageUrl,
                filename
            });
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }

    function insertDownloadButton() {
        const targets = document.querySelectorAll('div.eLoxRg');
        targets.forEach(el => {
            // Find the <a> parent
            let aTag = el.closest('a');
            if (!aTag) return;
            // Find the parent of <a>
            let parent = aTag.parentElement;
            if (!parent) return;
            // Find the sibling div (same level as <a>)
            let siblingDiv = null;
            for (let child of parent.children) {
                if (child !== aTag && child.tagName === 'DIV') {
                    siblingDiv = child;
                    break;
                }
            }
            if (!siblingDiv) return;
            // Avoid duplicate buttons
            if (siblingDiv.querySelector('.pixiv-downloader-btn')) return;
            // Find the like button (assume it's a button inside siblingDiv)
            const likeBtn = siblingDiv.querySelector('button');
            const btn = document.createElement('button');
            btn.className = 'pixiv-downloader-btn';
            btn.title = 'Download';
            btn.innerHTML = '↓'; // Simple flat icon for flat + glass design
            btn.style.marginLeft = '8px';
            btn.onclick = downloadAllImages;
            if (likeBtn && likeBtn.nextSibling) {
                siblingDiv.insertBefore(btn, likeBtn.nextSibling);
            } else if (likeBtn) {
                siblingDiv.appendChild(btn);
            } else {
                siblingDiv.appendChild(btn);
            }
        });
    }

    // Insert third download button next to gtm-main-bookmark button
    function insertBookmarkDownloadButton() {
        const bookmarkBtns = document.querySelectorAll('button.gtm-main-bookmark');
        bookmarkBtns.forEach(bookmarkBtn => {
            const parentDiv = bookmarkBtn.parentElement;
            if (!parentDiv) return;
            // Avoid duplicate
            if (parentDiv.previousSibling && parentDiv.previousSibling.classList && parentDiv.previousSibling.classList.contains('pixiv-downloader-bookmark-btn-container')) return;
            // Create container div
            const container = document.createElement('div');
            container.className = 'pixiv-downloader-bookmark-btn-container';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            // Create download button
            const btn = document.createElement('button');
            btn.className = 'pixiv-downloader-btn';
            btn.title = 'Download';
            btn.innerHTML = '↓';
            btn.style.marginRight = '8px';
            btn.onclick = downloadAllImages;
            container.appendChild(btn);
            // Insert container before parentDiv
            parentDiv.parentElement.insertBefore(container, parentDiv);
        });
    }

    // Initial run and observe for dynamic content
    insertDownloadButton();
    insertBookmarkDownloadButton();
    const observer = new MutationObserver(() => {
        insertDownloadButton();
        insertBookmarkDownloadButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Floating button for /artworks/{ID} pages
    function isArtworksPage() {
        return /^\/artworks\/[0-9]+$/.test(window.location.pathname);
    }

    function insertFloatingDownloadButton() {
        if (!isArtworksPage()) return;
        if (document.querySelector('.pixiv-downloader-floating-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'pixiv-downloader-floating-btn';
        btn.title = 'Download';
        btn.innerHTML = '⬇️';
        btn.onclick = downloadAllImages;
        document.body.appendChild(btn);
    }

    insertFloatingDownloadButton();
    // Re-insert on history navigation (SPA)
    window.addEventListener('popstate', insertFloatingDownloadButton);
    window.addEventListener('pushstate', insertFloatingDownloadButton);
})();

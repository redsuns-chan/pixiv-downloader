// Content script for Pixiv Downloader
(function() {
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
        // Only run on /artworks/{ID} page
        const match = window.location.pathname.match(/^\/artworks\/(\d+)$/);
        if (!match) {
            alert('Download only works on artwork detail pages.');
            return;
        }
        const artworkId = match[1];
        try {
            // Fetch artwork JSON
            const resp = await fetch(`https://www.pixiv.net/ajax/illust/${artworkId}`);
            if (!resp.ok) throw new Error('Failed to fetch artwork info');
            const data = await resp.json();
            const urls = data.body && data.body.urls;
            if (!urls) throw new Error('No image URLs found');
            // Determine quality
            let quality = pixivDownloaderSettings.quality || 'original';
            let imageUrl = urls[quality] || urls['original'];
            if (!imageUrl) throw new Error('No image URL for selected quality');
            // 用 XMLHttpRequest GET 圖片內容
            const filename = `${artworkId}_${quality}.jpg`;
            const savePath = pixivDownloaderSettings.savePath ? `${pixivDownloaderSettings.savePath.replace(/\\/g, '/')}/${filename}` : filename;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', imageUrl, true);
            xhr.responseType = 'blob';
            xhr.onload = function() {
                if (xhr.status === 200) {
                    var blob = xhr.response;
                    var objectUrl = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = objectUrl;
                    a.download = savePath;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(function() {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(objectUrl);
                    }, 100);
                    alert('Download started!');
                } else {
                    alert('Image request failed: ' + xhr.status);
                }
            };
            xhr.onerror = function() {
                alert('XMLHttpRequest error');
            };
            xhr.send();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }

    function insertDownloadButton() {
        const targets = document.querySelectorAll('div.eLoxRg');
		console.log("Insert targets: ", targets);
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
                console.log('[Pixiv Downloader] Download button added next to like button:', likeBtn);
            } else if (likeBtn) {
                siblingDiv.appendChild(btn);
                console.log('[Pixiv Downloader] Download button added next to like button:', likeBtn);
            } else {
                siblingDiv.appendChild(btn);
                console.log('[Pixiv Downloader] Download button added (no like button found) in:', siblingDiv);
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
            console.log('[Pixiv Downloader] Download button added above gtm-main-bookmark button:', bookmarkBtn);
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

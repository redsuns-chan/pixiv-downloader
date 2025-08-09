// Load settings
 document.addEventListener('DOMContentLoaded', function() {
     chrome.storage.sync.get(['savePath', 'quality'], function(items) {
         if (items.savePath) document.getElementById('save-path').value = items.savePath;
         if (items.quality) document.getElementById('quality').value = items.quality;
     });
 });

 // Save settings
 document.getElementById('settings-form').addEventListener('submit', function(e) {
     e.preventDefault();
     const savePath = document.getElementById('save-path').value;
     const quality = document.getElementById('quality').value;
     chrome.storage.sync.set({ savePath, quality }, function() {
         alert('Settings saved!');
     });
 });

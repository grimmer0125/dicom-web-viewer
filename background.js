// whatever it is "file:///*" or  <all_urls>,this function will be trigger for any url
// also it may trigger many times for 1 file 
// for debugging only 
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url) {
      // it might be empty in some cases
      console.log("changeInfo.url:", changeInfo.url); 
    }
});

function saveHTML(url, content) {
  console.log("save html content");

  const newFile = {};
  newFile[url]= content;
  console.log("set:", newFile, url.length);
  chrome.storage.sync.set(newFile, function() {
    console.log('file content is set to ' + content);
  });
}

function fetchLocalFile(url) {
  var xhr = new XMLHttpRequest();

  xhr.onload = function(e) {
    // TODO: change to the real dicom image content 
    console.log("load xhr text :", xhr.responseText);
    console.log("e:", e) // ProgressEvent

    const content = xhr.responseText;
    saveHTML(url, content);
  }

  xhr.open('GET', url, true);
  xhr.send();
}

chrome.webRequest.onBeforeRequest.addListener(function(info) {

  if (info.url.indexOf('file://') === 0  &&
      info.url.indexOf('.dcm') != -1 ) {

    console.log("request url is file://*.dcm")

    if (info.type !== "xmlhttprequest") {
      console.log("not xml request, so redirect onBeforeRequest.dcm")

      // TODO: 
      // 1nd: this may still happen timing issue?
      // set success happens after page is created
      // so the page can not get the key. Solution: move fetch to dicom.html
      // 2nd issue: setup a maximal number of storaging files
      fetchLocalFile(info.url)

      return {
        redirectUrl : chrome.extension.getURL("dicom.html#"+ info.url)
      };
    }

  }
}, {
  urls : ["<all_urls>"]
}, ["blocking"]);
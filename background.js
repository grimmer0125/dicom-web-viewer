// whatever it is "file:///*" or  <all_urls>,this function will be trigger for any url
// also it may trigger many times for 1 file 
// for debugging only 
// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
//     if (changeInfo.url) {
//       // it might be empty in some cases
//       console.log("changeInfo.url:", changeInfo.url); 
//     }
// });

chrome.webRequest.onBeforeRequest.addListener(function(info) {

  if (info.url.indexOf('file://') === 0  &&
      info.url.indexOf('.dcm') != -1 ) {

    console.log("request url is file://*.dcm")

    if (info.type !== "xmlhttprequest") {
      console.log("not xml request, so redirect onBeforeRequest.dcm")

      return {
        redirectUrl : chrome.extension.getURL("dicom.html#"+ info.url)
      };
    }

  }
}, {
  urls : ["<all_urls>"]
}, ["blocking"]);
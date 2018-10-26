chrome.webRequest.onBeforeRequest.addListener(function(info) {

  if (info.url.indexOf('file://') === 0  &&
      info.url.indexOf('.dcm') !== -1 ) {

    // console.log("request url is file://*.dcm")

    if (info.type !== "xmlhttprequest") {
      // console.log("not xml request, so redirect onBeforeRequest.dcm")

      return {
        redirectUrl : chrome.extension.getURL("dicom.html#"+ info.url)
      };
    }
  }
}, {
  urls : ["<all_urls>"]
}, ["blocking"]);
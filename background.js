//extensions/shortcuts
chrome: chrome.commands.onCommand.addListener(function (command) {
  chrome.tabs.create({
    url: "index.html",
  });
});

chrome.browserAction.onClicked.addListener(() => {
  chrome.tabs.create({
    url: "index.html",
  });
});

chrome.webRequest.onBeforeRequest.addListener(
  (info) => {
    const url = info.url.toLowerCase();
    if (
      url.toLowerCase().endsWith(".dcm") === false &&
      url.endsWith(".dicom") === false
    ) {
      return;
    }

    if (url.indexOf("file://") === 0) {
      // console.log("request url is file://*.dcm")

      if (info.type !== "xmlhttprequest") {
        // console.log("not xml request, so redirect onBeforeRequest.dcm")

        return {
          redirectUrl: chrome.extension.getURL(`index.html#${url}`),
        };
      }
    } else if (info.url.indexOf("http") === 0) {
      return {
        redirectUrl: chrome.extension.getURL(`index.html#${url}`),
      };
    }
  },
  {
    urls: ["<all_urls>"],
    types: ["main_frame", "sub_frame", "image"],
  },
  ["blocking"]
);

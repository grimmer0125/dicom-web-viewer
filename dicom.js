// step1: get file key from current url, e.g.
// chrome-extension://jfnlfimghfiagibfigmlopnfljpfnnje/dicom.html#file:///Users/grimmer/git/itri/itri3.dcm
const url =  window.location.href;
console.log("current url:", url);

if (url.indexOf('file://') != -1  &&
    url.indexOf('.dcm') != -1 ) {

  const paths = url.split("#");
  if (paths.length > 1){
    const key = paths[1];
    console.log("dicom html loads, after hash:", key);
    // step2 try to get chrome storage using key from step1
    chrome.storage.sync.get([key], function(result) {
      const content = result[key];
      // TODO: render the real dicom image content
      console.log('Value currently is ', content);
      document.getElementById("content").innerHTML = content;
    });

    // get all for debugging 
    // chrome.storage.sync.get(null, function(result) {
    //  console.log('whole currently is ',  result);
    // });
  }
}

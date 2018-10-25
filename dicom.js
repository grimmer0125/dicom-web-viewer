function fetchLocalFile(url) {
  var xhr = new XMLHttpRequest();

  xhr.onload = function(e) {
    // TODO: change to the real dicom image content 
    console.log("load xhr text :", xhr.responseText);
    console.log("e:", e) // ProgressEvent

    const content = xhr.responseText;

    // saveHTML(url, content);
    console.log('file content currently is ', content);
    document.getElementById("content").innerHTML = content;
  }

  xhr.open('GET', url, true);
  xhr.send();
}

// step1: get file key from current url, e.g.
// chrome-extension://jfnlfimghfiagibfigmlopnfljpfnnje/dicom.html#file:///Users/grimmer/git/itri/itri3.dcm
const url =  window.location.href;
console.log("current url:", url);

if (url.indexOf('file://') != -1  &&
    url.indexOf('.dcm') != -1 ) {

  const paths = url.split("#");
  if (paths.length > 1){
    const filePath = paths[1];
    console.log("dicom html loads, after hash:", filePath);

    fetchLocalFile(filePath)
  }
}

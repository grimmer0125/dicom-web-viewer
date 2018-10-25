function fetchLocalFile(url) {
  var xhr = new XMLHttpRequest();

  xhr.open('GET', url, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function(e) {
    console.log("e:", e) // ProgressEvent

    const arrayBuffer = xhr.response; // Note: not xhr.responseText
    if (arrayBuffer) {
      // NOTE: start to change to the real dicom image content 
      // https://github.com/rii-mango/Daikon
      daikon.Parser.verbose = true;
      const image = daikon.Series.parseImage(new DataView(arrayBuffer));
      const obj = image.getInterpretedData(false, true); //obj.data: float32array 

      const width= obj.numCols;
      const height= obj.numRows;

      // little endian type of dicom data seems to be unit16, http://rii.uthscsa.edu/mango/papaya/ shows 2 byte  
      // obj.data: float32, length:262144 = 512x512  
      // NOTE: 32bit -> 8 bit (use min/max to normalize to 0~255 from -1000~1000） 
      let max = obj.data[0]; 
      let min = obj.data[0]
      for(var i = 0; i < obj.data.length; i++ ) {
        if (obj.data[i] > max) {
          max = obj.data[i];
        }
      }
      for(var i = 0; i < obj.data.length; i++ ) {
        if (obj.data[i] < min) {
          min = obj.data[i];
        }
      }
      const delta =  max - min;
      // Create array view
      const array = new Uint8ClampedArray(obj.data.length);  
      for (let i = 0; i< obj.data.length; i++) {
        array[i] = (obj.data[i]-min)*255/delta;
      }
      // const array = new Uint8ClampedArray(obj.data); // we got 512x512 length, not 512x512x2 

      // Create context from canvas
      const c = document.getElementById("myCanvas");
      c.width = width;
      c.height = height;

      const ctx = c.getContext("2d"); 

      // Create ImageData object
      const imgData = ctx.createImageData(width, height); 
      const data = imgData.data; // width x height x 4 (RGBA), Uint8ClampedArray
      console.log(data.byteLength) //1048576 = 512*512*4
      
      for (let i = 0, k = 0; i < data.byteLength; i=i+4, k=k+1) {
        data[i] = array[k];
        data[i+1] = array[k];
        data[i+2] = array[k];
        data[i+3] = 255;
      }

      console.log("fill data to ctx's imagedata done, then draw")
      // now we can draw our imagedata onto the canvas
      ctx.putImageData(imgData, 0, 0);
      console.log("done")
    }
  }

  xhr.send();
}

// get file key from current url, e.g.
// chrome-extension://jfnlfimghfiagibfigmlopnfljpfnnje/dicom.html#file:///Users/grimmer/git/itri/itri3.dcm
const url =  window.location.href;
console.log("current url:", url);

if (url.indexOf('file://') != -1  &&
    url.indexOf('.dcm') != -1 ) {

  const paths = url.split("#");
  if (paths.length > 1){
    const filePath = paths[1];
    console.log("dicom html loads, after hash:", filePath);
    document.getElementById("file").innerHTML = filePath;
    fetchLocalFile(filePath)
  }
}

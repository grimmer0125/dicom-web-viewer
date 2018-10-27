// class HelloMessage extends React.Component {
//   render() {
//     return React.createElement(
//       "div",
//       null,
//       "Hello ",
//       this.props.name
//     );
//   }
// }

ReactDOM.render(React.createElement(HelloMessage, { name: "Taylor" }), document.getElementById('dicom'));

class App extends React.Component {
  constructor(props) {
    super(props);    
    // this.state = {
    //   filePath: "",
    //   fileInfo: ""
    // };
    // this.myCanvasRef = React.createRef();

    // // get file path from current url, e.g.
    // // chrome-extension://jfnlfimghfiagibfigmlopnfljpfnnje/dicom.html#file:///tmp/test.dcm
    // const url =  window.location.href;
    // // console.log("current url:", url);

    // if (url.indexOf('file://') != -1  &&
    //     url.indexOf('.dcm') != -1 ) {

    //   const paths = url.split("#");
    //   if (paths.length > 1){
    //     const filePath = paths[1];

    //     // console.log("dicom html loads, after hash:", filePath);
    //     this.setState({
    //       filePath
    //     })
    //     // document.getElementById("file").innerHTML = filePath;

    //     this.fetchLocalFile(filePath)
    //   }
    // }    
  }

  // fetchLocalFile = (url) => {
  //   var xhr = new XMLHttpRequest();
  
  //   xhr.open('GET', url, true);
  //   xhr.responseType = "arraybuffer";
  //   xhr.onload = function(e) {
  //     // console.log("e:", e) // ProgressEvent
  
  //     const arrayBuffer = xhr.response; // Note: not xhr.responseText
  //     if (arrayBuffer) {
  //       daikon.Parser.verbose = true;
  //       const image = daikon.Series.parseImage(new DataView(arrayBuffer));
  
  //       const numFrames = image.getNumberOfFrames();
  //       if (numFrames > 1) {
  //         console.log("frames:", numFrames);
  //         const fileInfo = "It is multi-frame file (n="+ numFrames +") and only show the 1st frame currently";
          
  //         this.setState({
  //           fileInfo
  //         })
  //         // document.getElementById("file_info").innerHTML = file_info;
  //       }
  
  //       // TODO: add options to switch other frame if it is multi-frame
  //       // getInterpretedData(asArray, asObject, frameIndex) 
  //       // NOTE: start to render the real dicom image content 
  //       const obj = image.getInterpretedData(false, true, 0); //obj.data: float32array 
  
  //       const width= obj.numCols;
  //       const height= obj.numRows;
  
  //       // little endian type of dicom data seems to be unit16, http://rii.uthscsa.edu/mango/papaya/ shows 2 byte  
  //       // obj.data: float32, length:262144 (if dicom image is 512x512) 
  //       // NOTE: 32bit -> 8 bit (use min/max to normalize to 0~255 from -1000~1000） 
  //       let max = obj.data[0]; 
  //       let min = obj.data[0]
  //       for(var i = 0; i < obj.data.length; i++ ) {
  //         if (obj.data[i] > max) {
  //           max = obj.data[i];
  //         }
  //       }
  //       for(var i = 0; i < obj.data.length; i++ ) {
  //         if (obj.data[i] < min) {
  //           min = obj.data[i];
  //         }
  //       }
  //       const delta =  max - min;
  //       // Create array view
  //       const array = new Uint8ClampedArray(obj.data.length);  
  //       for (let i = 0; i< obj.data.length; i++) {
  //         array[i] = (obj.data[i]-min)*255/delta;
  //       }
  
  //       if (!this.myCanvasRef.current) {
  //         console.log("this.myCanvasRef is not ready, return");
  //         return;
  //       }
  
  //       const c = this.myCanvasRef.current; //document.getElementById("myCanvas");
  //       // resize canvas to fit DICOM image
  //       c.width = width;
  //       c.height = height;
  
  //       // Create context from canvas
  //       const ctx = c.getContext("2d"); 
  
  //       // Create ImageData object
  //       const imgData = ctx.createImageData(width, height); 
  //       const data = imgData.data; // width x height x 4 (RGBA), Uint8ClampedArray
  //       console.log(data.byteLength)
        
  //       for (let i = 0, k = 0; i < data.byteLength; i=i+4, k=k+1) {
  //         data[i] = array[k];
  //         data[i+1] = array[k];
  //         data[i+2] = array[k];
  //         data[i+3] = 255;
  //       }
  
  //       // console.log("fill data to ctx's imagedata done, then draw our imagedata onto the canvas")
  //       ctx.putImageData(imgData, 0, 0);
  //     }
  //   }
  
  //   xhr.send();
  // }  

  render() {
    return (
      <div>
        hello
      </div>
    );
  }
}
ReactDOM.render(<App />, document.getElementById('dicom'));
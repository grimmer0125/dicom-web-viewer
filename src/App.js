import React, { Component } from 'react';
import { Dropdown, Form, Checkbox } from 'semantic-ui-react';
// import logo from './logo.svg';
// import './App.css';

import Dropzone from 'react-dropzone';

const daikon = window.daikon;

const dropZoneStyle = {
  borderWidth: 2,
  borderColor: '#666',
  borderStyle: 'dashed',
  borderRadius: 5,
  // margin: 30,
  // padding: 30,
  width: 600,
  height: 150,
  textAlign: 'center',
  // transition: 'all 0.5s',
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      filePath: '',
      fileInfo: '',
      currentIndex: 0,
      frameIndexes: [],
      ifWindowCenterMode: true,
      windowCenter: '',
      windowWidth: '',
      max: '',
      min: '',
    };
    this.myCanvasRef = React.createRef();
  }

  handleChange = (e, { value }) => {
    if (value === 'center') {
      this.setState({ ifWindowCenterMode: true });
    } else {
      this.setState({ ifWindowCenterMode: false });
    }

    if (this.currentImage) {
      this.switchFrame(this.currentImage, this.state.currentIndex);
    }
  };

  componentDidMount() {
    // get file path from current url, e.g.
    // chrome-extension://jfnlfimghfiagibfigmlopnfljpfnnje/dicom.html#file:///tmp/test.dcm
    const url = window.location.href;
    // 'http://localhost#http://medistim.com/wp-content/uploads/2016/07/ttfm.dcm'; //
    // console.log("current url:", url);

    if (url.toLowerCase().indexOf('.dcm') !== -1 || url.toLowerCase().indexOf('.dicom') !== -1) {
      const paths = url.split('#');
      if (paths.length > 1) {
        const filePath = paths[1];

        // console.log("dicom html loads, after hash:", filePath);

        this.setState({
          filePath,
        });

        // document.getElementById("file").innerHTML = filePath;

        this.fetchFile(filePath);
      }
    }
  }

  renderImage = (buffer) => {
    console.log('renderImage bytelength:', buffer.byteLength);
    if (buffer) {
      daikon.Parser.verbose = true;
      const image = daikon.Series.parseImage(new DataView(buffer));
      const numFrames = image.getNumberOfFrames();
      if (numFrames > 1) {
        // console.log("frames:", numFrames);
        const fileInfo = `It is multi-frame file (n=${numFrames})`;

        this.setState({
          fileInfo,
        });
      } else {
        this.setState({
          fileInfo: '',
        });
      }
      this.setState({
        frameIndexes: Array.from(
          {
            length: numFrames,
          },
          (v, k) => ({
            text: k,
            value: k,
          }),
        ),
        currentIndex: 0,
      });
      this.currentImage = image;
      this.switchFrame(this.currentImage, 0);
    }
  };

  switchFrame = (image, index) => {
    console.log(`switch to ${index} Frame`);
    // getInterpretedData = getting HU (Hounsfield unit)
    // https://github.com/rii-mango/Daikon/issues/4
    // The new function will handle things like byte order, number of bytes per voxel, datatype, data scales, etc.
    // It returns an array of floating point values. So far this is only working for plain intensity data, not RGB.
    // NOTE: only works non-RGB data
    const obj = image.getInterpretedData(false, true, index); // obj.data: float32array
    const width = obj.numCols;
    const height = obj.numRows;
    const windowCenter = image.getWindowCenter();
    const windowWidth = image.getWindowWidth();
    this.setState({
      windowCenter,
      windowWidth,
      max: obj.max,
      min: obj.min,
    });

    console.log(`center:${windowCenter};width:${windowWidth}`);
    let max;
    let min;
    const { ifWindowCenterMode } = this.state;
    if (!ifWindowCenterMode) {
      console.log('max/min mode render');
      ({ max, min } = obj);
    } else {
      console.log('window center render');

      if (windowCenter && windowWidth) {
        min = windowCenter - Math.floor(windowWidth / 2);
        max = windowCenter + Math.floor(windowWidth / 2);

        // truncate
        for (let i = 0; i < obj.data.length; i += 1) {
          if (obj.data[i] > max) {
            obj.data[i] = max;
          } else if (obj.data[i] < min) {
            obj.data[i] = min;
          }
        }
      } else {
        console.log('no valid window center/width');
        ({ max, min } = obj);
      }
    }

    // little endian type of dicom data seems to be unit16, http://rii.uthscsa.edu/mango/papaya/ shows 2 byte
    // obj.data: float32, length:262144 (if dicom image is 512x512)
    // NOTE: 32bit -> 8 bit (use min/max to normalize to 0~255 from -1000~1000）
    // let max = null;
    // let min = null;
    // for (let i = 0; i < obj.data.length; i += 1) {
    //   const pixel = obj.data[i];
    //   if (!max || pixel > max) {
    //     max = pixel;
    //   }
    // }
    // for (let i = 0; i < obj.data.length; i += 1) {
    //   // Set outside-of-scan pixels (-2000) to -1024 (air HU)
    //   // Workaround hard code fix, intercept may not be always -1024
    //   // TODO: improve it later
    //   const pixel = obj.data[i] !== -3024 ? obj.data[i] : -1024;
    //   // const pixel = obj.data[i];
    //   if (!min || pixel < min) {
    //     min = pixel;
    //   }
    // }

    const delta = max - min;
    // Create array view
    const array = new Uint8ClampedArray(obj.data.length);
    for (let i = 0; i < obj.data.length; i += 1) {
      array[i] = ((obj.data[i] - min) * 255) / delta;
    }

    if (!this.myCanvasRef.current) {
      console.log('this.myCanvasRef is not ready, return');
      return;
    }

    const c = document.createElement('canvas');

    // const c = this.myCanvasRef.current; // document.getElementById("myCanvas");
    // resize canvas to fit DICOM image
    c.width = width;
    c.height = height;

    // Create context from canvas
    const ctx = c.getContext('2d');

    // Create ImageData object
    const imgData = ctx.createImageData(width, height);
    const { data } = imgData; // .data; // width x height x 4 (RGBA), Uint8ClampedArray
    console.log(data.byteLength);

    for (let i = 0, k = 0; i < data.byteLength; i += 4, k += 1) {
      data[i] = array[k];
      data[i + 1] = array[k];
      data[i + 2] = array[k];
      data[i + 3] = 255;
    }

    // console.log("fill data to ctx's imagedata done, then draw our imagedata onto the canvas")
    ctx.putImageData(imgData, 0, 0);

    const scale = this.resizeTotFit(width, height);
    console.log('scale:', scale);
    const c2 = this.myCanvasRef.current;
    c2.width = width / scale;
    c2.height = height / scale;
    const ctx2 = c2.getContext('2d');
    // ctx2.scale(1 / scale, 1 / scale); is equal to ctx2.drawImage(c, 0, 0)
    ctx2.drawImage(c, 0, 0, c2.width, c2.height);
  };

  fetchFile = (url) => {
    if (url.indexOf('file://') === 0) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => {
        const arrayBuffer = xhr.response;
        this.renderImage(arrayBuffer);
      };
      xhr.send();
    } else {
      // NOTE: copy from https://github.com/my-codeworks/tiff-viewer-extension/blob/master/background.js#L29
      // TODO: figure it out why using arraybuffer will fail
      console.log('Starting XHR request for', url);
      const request = new XMLHttpRequest();
      request.open('GET', url, false);
      request.overrideMimeType('text/plain; charset=x-user-defined');
      request.send();
      console.log('Finished XHR request');
      const data = request.responseText;
      let buffer;
      let view;
      let a_byte;
      buffer = new ArrayBuffer(data.length);
      view = new DataView(buffer);
      data.split('').forEach((c, i) => {
        a_byte = c.charCodeAt();
        view.setUint8(i, a_byte & 0xff);
      });
      const buffer2 = view.buffer;
      this.renderImage(buffer2);
    }
  };

  onDropFile = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      this.setState({
        filePath: file.name,
      });

      // acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          // reader.result: arraybuffer

          const fileContent = reader.result;
          this.renderImage(fileContent);
        } catch (e) {
          console.log('parse dicom error:', e);
        }
      };
      reader.onabort = () => console.log('file reading was aborted');
      // e.g. "drag a folder" will fail to read
      reader.onerror = () => console.log('file reading has failed');
      reader.readAsArrayBuffer(file);
    }
  };

  handleSwitchFrame = (e, obj) => {
    const { value } = obj;

    console.log('switch frame:', value);

    this.setState({
      currentIndex: value,
    });
    this.switchFrame(this.currentImage, value);
  };

  resizeTotFit(width, height) {
    let scale = 1;
    const size = {
      maxWidth: 1024,
      maxHeight: 800,
    };
    if (width <= size.maxWidth && height <= size.maxHeight) {
      return scale;
    }
    const scaleW = width / size.maxWidth;
    const scaleH = height / size.maxHeight;
    scale = scaleW >= scaleH ? scaleW : scaleH;

    return scale;
  }

  render() {
    const {
      filePath,
      fileInfo,
      frameIndexes,
      currentIndex,
      ifWindowCenterMode,
      windowCenter,
      windowWidth,
      max,
      min,
    } = this.state;
    return (
      <div className="flex-container">
        <div>
          <div>DICOM Image Viewer </div>
          <div>
            <Dropzone preventDropOnDocument={false} style={dropZoneStyle} onDrop={this.onDropFile}>
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p>
                    {' '}
                    Try dropping DICOM image files here, <br />
                    or click here to select files to view.
                  </p>
                </div>
              </div>
            </Dropzone>
            <Form>
              <Form.Field>
                <Checkbox
                  radio
                  label="Window Center Mode (default)"
                  name="checkboxRadioGroup"
                  value="center"
                  checked={ifWindowCenterMode}
                  onChange={this.handleChange}
                />
                {` c:${windowCenter};w:${windowWidth}`}
              </Form.Field>
              <Form.Field>
                <Checkbox
                  radio
                  label="Max/Min Mode"
                  name="checkboxRadioGroup"
                  value="max"
                  checked={!ifWindowCenterMode}
                  onChange={this.handleChange}
                />
                {` max:${max};min:${min}`}
              </Form.Field>
            </Form>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {' '}
            {filePath || null}{' '}
          </div>{' '}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div> {fileInfo || null} </div>{' '}
            <div>
              {' '}
              {frameIndexes.length > 1 ? (
                <Dropdown
                  placeholder="Switch Frame"
                  selection
                  onChange={this.handleSwitchFrame}
                  options={frameIndexes}
                  value={currentIndex}
                />
              ) : null}{' '}
            </div>{' '}
          </div>{' '}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <canvas ref={this.myCanvasRef} width={128} height={128} />
          </div>{' '}
        </div>
      </div>
    );
  }
}

export default App;

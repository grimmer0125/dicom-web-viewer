import React, { Component } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

import {
  Dropdown,
  Checkbox,
  CheckboxProps,
  DropdownProps,
  Radio,
} from "semantic-ui-react";

import Dropzone from "react-dropzone";
import Hotkeys from "react-hot-keys";
import * as daikon from "daikon";
import { fetchDicomAsync, loadDicomAsync } from "./utility";

const { fromEvent } = require("file-selector");

// import { fromEvent } from "file-selector";

enum NormalizationMode {
  PixelHUMaxMin,
  // below are for CT,
  WindowCenter,
  // https://radiopaedia.org/articles/windowing-ct
  AbdomenSoftTissues, //W:400 L:50
  SpineSoftTissues, // W:250 L:50
  SpineBone, // W:1800 L:400
  Brain, // W:80 L:40
  Lungs, // W:1500 L:-600. chest
  // AbdomenLiver, // W:150 L:30.
  // Mediastinum, // W:350 L:50.
  // head and neck series:
  // Stroke W:8 L:32 or W:40 L:40 中風 head
  // subdural W:130-300 L:50-100 腦硬膜
  // temporal bones W:2800 L:600 顳骨
  // soft tissues: W:350–400 L:20–60. head
  // CTA (CT angiography) // https://www.stepwards.com/?page_id=21646 (W:600, L:170)
}

interface WindowItem {
  W: number;
  L: number;
}

interface IWindowDictionary {
  [id: number]: WindowItem;
}

const WindowCenterWidthConst: IWindowDictionary = {
  [NormalizationMode.AbdomenSoftTissues]: {
    W: 400,
    L: 50,
  },
  [NormalizationMode.SpineSoftTissues]: {
    W: 250,
    L: 50,
  },
  [NormalizationMode.SpineBone]: {
    W: 1800,
    L: 400,
  },
  [NormalizationMode.Brain]: {
    W: 80,
    L: 40,
  },
  [NormalizationMode.Lungs]: {
    W: 1500,
    L: -600,
  },
};

const dropZoneStyle = {
  borderWidth: 2,
  borderColor: "#666",
  borderStyle: "dashed",
  borderRadius: 5,
  width: 800,
  height: 150,
  // textAlign: "center",
};

const initialImageState = {
  frameIndexes: [],
  currFrameIndex: 0,
  multiFrameInfo: "",
  windowCenter: 0,
  windowWidth: -1,
  pixelMax: 0,
  pixelMin: 0,
  resX: 0,
  resY: 0,
  photometric: "",
  modality: "",
  hasDICOMExtension: true,
  isValidMouseDown: false, // reset when switching to a new image
};

type State = {
  currNormalizeMode: number;
  ifWindowCenterMode: boolean;
  currFilePath: string;
  currFileNo: number;
  totalFiles: number;
  frameIndexes: any[];
  currFrameIndex: number;
  multiFrameInfo: string;
  windowCenter: number;
  windowWidth: number;
  pixelMax: number; // pixel max
  pixelMin: number; // pixel min
  resX: number;
  resY: number;
  photometric: string;
  modality: string;
  hasDICOMExtension: boolean;
  isValidMouseDown: boolean; // switch to another image, becomes invalid
  useWindowCenter: number;
  useWindowWidth: number;
  ifShowSagittalCoronal: boolean;
  currentSagittalNo: number; // start from 1
  totalSagittalFrames: number;
  currentCoronaNo: number;
  totalCoronaFrames: number;
  seriesMode: string;
};

interface NormalizationProps {
  mode: NormalizationMode;
  windowItem?: WindowItem;
  currNormalizeMode: NormalizationMode;
  onChange?: (
    e: React.FormEvent<HTMLInputElement>,
    data: CheckboxProps
  ) => void;
}

function NormalizationComponent(props: NormalizationProps) {
  const { mode, windowItem, currNormalizeMode, onChange } = props;
  const data = windowItem ?? WindowCenterWidthConst[mode] ?? null;
  return (
    <>
      <Checkbox
        radio
        label={NormalizationMode[mode]}
        name="checkboxRadioGroup"
        value={mode}
        checked={currNormalizeMode === mode}
        onChange={onChange}
        // checked={ifWindowCenterMode}
        // onChange={this.handleNormalizeModeChange}
      />
      {data ? ` c:${data.L}, w:${data.W}  ` : `  `}
    </>
  );
}

const MAX_WIDTH_SINGLE_MODE = 1280;
const MAX_HEIGHT_SINGLE_MODE = 1000;
const MAX_WIDTH_SERIES_MODE = 400;
const MAX_HEIGHT_SERIES_MODE = 400;

class App extends Component<{}, State> {
  myCanvasRef: React.RefObject<HTMLCanvasElement>;
  myCanvasRefSagittal: React.RefObject<HTMLCanvasElement>;
  myCanvasRefCorona: React.RefObject<HTMLCanvasElement>;
  files: any[];
  isOnlineMode = true;
  currentImage: any;
  currentSeries: any;
  currentSeriesImageObjects: any[];
  clientX: number;
  clientY: number;
  seriesGlobalMax: number;
  seriesGlobalMin: number;
  maxWidth = MAX_WIDTH_SINGLE_MODE;
  maxHeight = MAX_HEIGHT_SINGLE_MODE;

  constructor() {
    super({});
    this.state = {
      currNormalizeMode: NormalizationMode.WindowCenter,
      ifWindowCenterMode: true,
      currFilePath: "",
      ifShowSagittalCoronal: false,
      useWindowCenter: 0,
      useWindowWidth: -1,
      seriesMode: "notSeriesMode",

      // multiFrameInfo: '',
      // currFrameIndex: 0,
      // frameIndexes: [],
      // windowCenter: '',
      // windowWidth: '',
      // max: '',
      // min: '',
      // resX: '',
      // resY: '',
      // photometric: '',
      // modality: '',
      currFileNo: 0,
      totalFiles: 0,
      currentSagittalNo: 0,
      totalSagittalFrames: 0,
      currentCoronaNo: 0,
      totalCoronaFrames: 0,
      ...initialImageState,
    };
    this.myCanvasRef = React.createRef();
    this.myCanvasRefSagittal = React.createRef();
    this.myCanvasRefCorona = React.createRef();
    this.files = [];
    this.currentSeriesImageObjects = [];
    this.clientX = 0;
    this.clientY = 0;
    this.seriesGlobalMax = 0;
    this.seriesGlobalMin = 0;
  }

  componentDidMount() {
    window.addEventListener("mouseup", this.onMouseUp);
    // window.addEventListener("mouseup", this.onMouseUp);

    // get file path from current url, e.g.
    // chrome-extension://jfnlfimghfiagibfigmlopnfljpfnnje/dicom.html#file:///tmp/test.dcm
    const url = window.location.href;
    // 'http://localhost#http://medistim.com/wp-content/uploads/2016/07/ttfm.dcm'; //
    // console.log("current url:", url);

    if (
      url.toLowerCase().indexOf(".dcm") !== -1 ||
      url.toLowerCase().indexOf(".dicom") !== -1
    ) {
      // const paths = url.split("#");
      const firstHash = url.indexOf("#");
      if (firstHash > -1) {
        const fileURLs = url.substring(firstHash + 1, url.length);
        // const filePath = paths[1];
        // this.fetchFile(filePath);

        this.onOpenFileURLs(fileURLs);
      }
    }
  }

  // NOTE:
  // when switch to new image, keeps mode and useWindowWidth will not reset (if not same seris, a little wired)
  // switch to new frame (same image)? keeps mode and useWindowWidth will not reset
  // swtich to different mode (useWindowWidth will be reset )

  handleNormalizeModeChange = (
    e: React.FormEvent<HTMLInputElement>,
    data: CheckboxProps
  ) => {
    const { value } = data;

    // console.log("value:", typeof value, value);
    // let ifWindowCenterMode;
    // if (value === "center") {
    //   ifWindowCenterMode = true;
    // } else {
    //   ifWindowCenterMode = false;
    // }

    // this.setState({ ifWindowCenterMode });

    if (this.currentImage) {
      let windowCenter;
      let windowWidth;

      const newMode = value as number;
      if (newMode === NormalizationMode.WindowCenter) {
        windowCenter = this.currentImage.getWindowCenter() as number;
        windowWidth = this.currentImage.getWindowWidth() as number;
      }
      const newWindowCenter = windowCenter ? windowCenter : 0;
      const newWindowWidth = windowWidth ? windowWidth : -1;
      this.setState({
        useWindowCenter: newWindowCenter,
        useWindowWidth: newWindowWidth,
        currNormalizeMode: newMode,
      });

      const {
        currFrameIndex,
        ifShowSagittalCoronal,
        currentCoronaNo,
        currentSagittalNo,
      } = this.state;
      this.renderFrame({
        image: this.currentImage,
        frameIndex: currFrameIndex,
        currNormalizeMode: newMode,
        useWindowCenter: newWindowCenter,
        useWindowWidth: newWindowWidth,
      });
      if (ifShowSagittalCoronal) {
        this.buildSagittalView(
          this.currentSeries,
          currentSagittalNo - 1,
          newWindowCenter,
          newWindowWidth,
          newMode
        );
        this.buildCoronalView(
          this.currentSeries,
          currentCoronaNo - 1,
          newWindowCenter,
          newWindowWidth,
          newMode
        );
      }
    }
  };

  renderImage = (
    buffer: any,
    daikonImage?: any,
    imageData?: any,
    useWindowCenter?: number,
    useWindowWidth?: number
  ) => {
    // console.log("renderImage bytelength:", buffer.byteLength);
    // daikon.Parser.verbose = true;
    let image;
    let numFrames;
    if (!daikonImage) {
      try {
        image = daikon.Series.parseImage(new DataView(buffer));
      } catch (e) {
        console.log("parse dicom error:", e);
      }
    } else {
      image = daikonImage;
    }

    numFrames = image.getNumberOfFrames();

    if (numFrames > 1) {
      // console.log("frames:", numFrames);
      const multiFrameInfo = `It's multi-frame file (n=${numFrames})`;

      this.setState({
        multiFrameInfo,
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
        })
      ),
      currFrameIndex: 0,
    });
    this.currentImage = image;

    this.renderFrame({
      image: this.currentImage,
      frameIndex: 0,
      imageData,
      useWindowCenter,
      useWindowWidth,
    });
  };

  renderFrame = (
    arg: {
      image?: any;
      frameIndex?: number;
      currNormalizeMode?: number;
      useWindowWidth?: number;
      useWindowCenter?: number;
      canvasRef?: React.RefObject<HTMLCanvasElement>;
      rawData?: number[];
      rawDataWidth?: number;
      rawDataHeight?: number;
      extraHeightScale?: number;
      extraWidthScale?: number;

      imageData?: {
        // only for axial view
        max?: number;
        min?: number;
        numCols?: number;
        numRows?: number;
        data?: number[];
      };
    }
    // ifWindowCenterMode?: boolean
  ) => {
    let {
      image,
      frameIndex,
      currNormalizeMode,
      useWindowWidth,
      useWindowCenter,
      canvasRef,
      rawData,
      rawDataWidth,
      rawDataHeight,
      extraHeightScale,
      extraWidthScale,
      imageData,
    } = arg;
    console.log(`switch to ${frameIndex} Frame`);

    let ifRGB = false;
    let rgbMode = 0; // 0: rgbrgb... 1: rrrgggbbb
    let windowWidth: number | null = null;
    let windowCenter: number | null = null;
    let storeMax;
    let storeMin;

    if (!canvasRef || canvasRef === this.myCanvasRef) {
      // const seriesID = image.getSeriesId();
      // const a1 = image.getImageDirections(); // [100010]
      // const a2 = image.getImagePosition(); //[-155, -170, -189.75]
      // const a3 = image.getSeriesNumber(); //5
      // const a4 = image.getPixelSpacing(); //[0.66, 0.66] mm
      // const a5 = image.getSliceThickness(); //5 mm
      // const a6 = image.getAcquiredSliceDirection(); //2
      // daikon.Image.SLICE_DIRECTION_UNKNOWN = -1;
      // daikon.Image.SLICE_DIRECTION_AXIAL = 2;
      // daikon.Image.SLICE_DIRECTION_CORONAL = 1;
      // daikon.Image.SLICE_DIRECTION_SAGITTAL = 0;
      // daikon.Image.SLICE_DIRECTION_OBLIQUE = 3;
      // const a7 = image.getSliceLocation(); //-189.75

      // BUG:
      // fetchFile (file://) case will need longer time to getPhotometricInterpretation after using a while
      const photometric = image.getPhotometricInterpretation();
      const modality = image.getModality();
      if (photometric !== null) {
        // const mode = image.getPlanarConfig();
        // console.log("Planar mode:", mode);
        if (photometric.trim().indexOf("RGB") !== -1) {
          ifRGB = true;

          rgbMode = image.getPlanarConfig() || 0;
        } else if (photometric.trim().toLowerCase().indexOf("palette") !== -1) {
          ifRGB = true;
        }
      }

      // getPhotometricInterpretation
      // https://github.com/rii-mango/Daikon/issues/4
      // The new function will handle things like byte order, number of bytes per voxel, datatype, data scales, etc.
      // It returns an array of floating point values. So far this is only working for plain intensity data, not RGB.
      let obj;
      if (!imageData) {
        try {
          // BUG: latest daikon will throw a exception when calliing getInterpretedData for palette case
          obj = image.getInterpretedData(false, true, frameIndex); // obj.data: float32array
        } catch (e) {
          console.log("read dicom InterpretedData error:", e);
          return;
        }
      } else {
        obj = imageData;
      }

      storeMax = obj.max;
      storeMin = obj.min;
      rawData = obj.data as number[];
      rawDataWidth = obj.numCols as number;
      rawDataHeight = obj.numRows as number;
      // center/width may be null
      windowCenter = image.getWindowCenter() as number;
      windowWidth = image.getWindowWidth() as number;
      // console.log("max:", typeof obj.max);
      // console.log("windowCenter:", typeof windowCenter);
      this.setState({
        windowCenter,
        windowWidth,
        pixelMax: obj.max,
        pixelMin: obj.min,
        resX: rawDataWidth,
        resY: rawDataHeight,
        modality,
        photometric,
      });
    }

    if (!rawDataWidth || !rawDataHeight) {
      console.error("no width/height info. give up render ");
      return;
    }
    if (!rawData) {
      console.error("no rawData. give up render ");
      return;
    }

    let max;
    let min;
    if (currNormalizeMode === undefined) {
      ({ currNormalizeMode } = this.state);
    }
    if (useWindowWidth === undefined) {
      ({ useWindowWidth } = this.state);
    }
    if (useWindowCenter === undefined) {
      ({ useWindowCenter } = this.state);
    }
    console.log("useWindowWidth:", useWindowWidth);
    ({ max, min } = this.getNormalizationRange(
      useWindowWidth,
      useWindowCenter,
      currNormalizeMode,
      windowWidth,
      windowCenter,
      storeMax ? storeMax : this.seriesGlobalMax,
      storeMin ? storeMin : this.seriesGlobalMin
    ));

    if (!canvasRef) {
      canvasRef = this.myCanvasRef;
    }
    if (!canvasRef.current) {
      console.log("canvasRef is not ready, return");
      return;
    }

    // const c = this.myCanvasRef.current; // document.getElementById("myCanvas");
    const c = document.createElement("canvas");
    c.width = rawDataWidth;
    c.height = rawDataHeight;
    // Create context from canvas
    const ctx = c.getContext("2d");
    // Create ImageData object
    if (!ctx) {
      return;
    }
    const imgData = ctx.createImageData(rawDataWidth, rawDataHeight);
    const { data } = imgData; // .data; // width x height x 4 (RGBA), Uint8ClampedArray

    if (!ifRGB) {
      for (let i = 0, k = 0; i < data.byteLength; i += 4, k += 1) {
        let value = rawData[k];

        // Create array view
        // const array = new Uint8ClampedArray(rawData.length);
        // BUG: coranal/sagittal may have undefined so will not have normalization
        if (max && min) {
          const delta = max - min;
          // for (let i = 0; i < rawData.length; i += 1) {
          // truncate
          if (min !== storeMin || max !== storeMax) {
            if (value > max) {
              value = max;
            } else if (value < min) {
              value = min;
            }
          }
          // normalization
          value = ((value - min) * 255) / delta;
          // }
        }

        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 255;
      }
    } else if (rgbMode === 0) {
      // if 3 channels, pixel array'order is at Tag (0028, 0006)
      // Planar Configuration = 0 -> R1, G1, B1, R2, G2, B2, …
      // Planar Configuration = 1 -> R1, R2, R3, …, G1, G2, G3, …, B1, B2, B3
      const array = rawData;
      for (let i = 0, k = 0; i < data.byteLength; i += 1, k += 1) {
        data[i] = array[k];
        if ((i + 2) % 4 === 0) {
          data[i + 1] = 255;
          i += 1;
        }
      }
    } else {
      // Note: tested. https://barre.dev/medical/samples/US-RGB-8-epicard
      const array = rawData;
      const pixelCount = array.length / 3;
      for (let i = 0, k = 0; i < data.byteLength; i += 1, k += 1) {
        // data[i] = array[k];

        const j = Math.floor(i / 4); // jth pixel, start from 0
        if ((i + 1) % 4 === 1) {
          // r
          data[i] = array[j];
        } else if ((i + 1) % 4 === 2) {
          // g
          data[i] = array[j + pixelCount];
        } else if ((i + 1) % 4 === 3) {
          // b
          data[i] = array[j + pixelCount * 2];

          data[i + 1] = 255;
          i += 1;
        }
      }
    }

    // console.log("fill data to ctx's imagedata done, then draw our imagedata onto the canvas")
    ctx.putImageData(imgData, 0, 0);

    let scale = 1;
    if (!extraHeightScale || !extraWidthScale) {
      scale = this.resizeTotFit(rawDataWidth, rawDataHeight);
    }
    //  else if (canvasRef === this.myCanvasRefSagittal) {
    //   // sagittal view
    //   scale = this.resizeTotFit(1, rawDataWidth);
    // } else {
    //   scale = this.resizeTotFit(rawDataWidth, rawDataHeight);
    // }

    if (scale !== 1) {
      console.log("scale:", scale);
    }
    const c2: any = canvasRef.current;
    c2.width = rawDataWidth / scale;
    c2.height = rawDataHeight / scale;
    if (extraHeightScale) {
      c2.height = c2.height * extraHeightScale;
    }
    if (extraWidthScale) {
      c2.width = c2.width * extraWidthScale;
    }
    const ctx2 = c2.getContext("2d");
    ctx2.drawImage(c, 0, 0, c2.width, c2.height);
  };

  async onOpenFileURLs(fileURLStr: string) {
    const files = fileURLStr.split("file://");
    files.sort((a, b) => {
      return a.localeCompare(b);
    });
    console.log("sorted files:", files);
    this.files = [];
    files.forEach((file, index) => {
      if (index !== 0) {
        this.files.push(`file://${file}`);
      }
    });

    const { ifShowSagittalCoronal } = this.state;
    if (ifShowSagittalCoronal) {
      await this.loadSeriesFilesToRender(this.files);
    } else {
      this.setState({
        totalFiles: this.files.length,
        currFileNo: 1,
      });
      this.fetchFile(this.files[0]);
    }
  }

  fetchFile = async (url: string) => {
    this.setState({
      currFilePath: decodeURI(url),
    });

    if (!this.checkDicomNameAndResetState(url)) {
      return;
    }

    const buffer = await fetchDicomAsync(url);
    this.renderImage(buffer);
  };

  switchImage = (value: number) => {
    this.setState({
      currFileNo: value,
    });

    const { ifShowSagittalCoronal } = this.state;
    console.log("ifShowSagittalCoronal:", ifShowSagittalCoronal);
    if (ifShowSagittalCoronal) {
      this.buildAxialView(
        this.currentSeries,
        this.currentSeriesImageObjects,
        value - 1
      );
    } else {
      const newFile = this.files[value - 1];
      console.log("switch to image:", value, newFile);
      if (!this.isOnlineMode) {
        this.loadFile(newFile);
      } else {
        this.fetchFile(newFile);
      }
    }
  };

  switchSagittal = (value: number) => {
    this.setState({
      currentSagittalNo: value,
    });

    this.buildSagittalView(this.currentSeries, value - 1);
  };

  switchCorona = (value: number) => {
    this.setState({
      currentCoronaNo: value,
    });

    this.buildCoronalView(this.currentSeries, value - 1);
  };

  checkDicomNameAndResetState(name: string) {
    const c2: any = this.myCanvasRef.current;
    if (c2) {
      console.log("reset canvas");
      const ctx2 = c2.getContext("2d");
      ctx2.clearRect(0, 0, c2.width, c2.height);
    }
    this.setState({
      ...initialImageState,
    });
    const { ifShowSagittalCoronal } = this.state;
    if (!ifShowSagittalCoronal) {
      this.setState({
        useWindowCenter: 0,
        useWindowWidth: -1,
      });
    }
    // "file:///Users/grimmer/NCKUH_lung/.DS_Store"
    if (
      name.toLowerCase().endsWith(".dcm") === false &&
      name.toLowerCase().endsWith(".dicom") === false
    ) {
      console.log("not dicom file:", name);

      this.setState({
        hasDICOMExtension: false,
      });

      return false;
    }

    return true;
  }

  /* eslint-disable */
  async loadFile(file: any) {
    this.setState({
      currFilePath: file.name,
    });

    if (!this.checkDicomNameAndResetState(file.name)) {
      return;
    }

    const buffer = await loadDicomAsync(file);
    this.renderImage(buffer);
  }

  async loadSeriesFilesToRender(files: string[] | any[]) {
    const promiseList: any[] = [];
    let firstFile = "";
    const fileList: any[] = [];
    this.files.forEach((file, index) => {
      // TODO: filter  invalid dicom, e.g. .DS file

      if (typeof file === "string") {
        if (
          file.toLowerCase().endsWith(".dcm") === false &&
          file.toLowerCase().endsWith(".dicom") === false
        ) {
          return;
        }
        fileList.push(file);
        if (!firstFile) {
          firstFile = decodeURI(file);
          // ~ loadFile/fetchFile
          this.setState({
            currFilePath: firstFile,
          });
          if (!this.checkDicomNameAndResetState(file)) {
          }
        }
        promiseList.push(fetchDicomAsync(file));
      } else {
        if (
          file.name.toLowerCase().endsWith(".dcm") === false &&
          file.name.toLowerCase().endsWith(".dicom") === false
        ) {
          return;
        }
        fileList.push(file);
        if (!firstFile) {
          firstFile = file.name;
          this.setState({
            currFilePath: file.name,
          });
          if (!this.checkDicomNameAndResetState(file.name)) {
          }
        }
        promiseList.push(loadDicomAsync(file));
      }
    });
    this.files = fileList;

    const bufferList = await Promise.all(promiseList);
    // console.log("bufferList:", bufferList);
    const series = new daikon.Series();

    for (const buffer of bufferList) {
      const image = daikon.Series.parseImage(new DataView(buffer as any));
      // console.log(image.getSliceLocation());

      const orientationArray = image.getImageDirections(); //[1,0,0,0,1,0] Tag	(0020,0037)
      const daikonOrientation = image.getOrientation(); //XYZ--+
      console.log(
        "orientationArray:",
        orientationArray,
        ";daikonOrientation:",
        daikonOrientation
      );

      if (image === null) {
        console.error(daikon.Series.parserError);
      } else if (image.hasPixelData()) {
        // Anatomical Orientation Type Attribute
        // https://dicom.innolitics.com/ciods/12-lead-ecg/general-series/00102210
        // Patient Orientation:
        // https://dicom.innolitics.com/ciods/cr-image/general-image/00200020

        // axial DICOM looks like a mirror image !! if its 0020,0037 is 1,0,0,0,1.0
        // https://stackoverflow.com/questions/34782409/understanding-dicom-image-attributes-to-get-axial-coronal-sagittal-cuts/34783893
        // https://dicom.innolitics.com/ciods/ct-image/image-plane/00200037

        // https://www.slicer.org/wiki/Coordinate_systems
        if (image.getAcquiredSliceDirection() !== 2) {
          console.log("not axial dicom:", image.getAcquiredSliceDirection());
          continue;
        }

        if (series.images.length === 0) {
          series.addImage(image);
        }

        // if it's part of the same series, add it
        else if (image.getSeriesId() === series.images[0].getSeriesId()) {
          if (
            image.getSliceThickness() === series.images[0].getSliceThickness()
          ) {
            series.addImage(image);
          } else {
            console.warn("not same slicethickness");
          }
        } else {
          console.warn("not same seriesID(defined by daikon)");
        }
      }
    }
    // order the image files, determines number of frames, etc.

    if (series.images.length > 0) {
      series.buildSeries();
      series.images.reverse(); //since buildSeries will sort by z increase
      this.currentSeries = series;
      this.currentSeriesImageObjects = [];
      let useWindowCenter = series.images[0].getWindowCenter() as number;
      let useWindowWidth = series.images[0].getWindowWidth() as number;
      let globalMax = 0;
      let globalMin = 0;
      series.images.forEach((image: any) => {
        // TODO: handle exception case
        const obj = image.getInterpretedData(false, true, 0); // obj.data: float32array
        let max = obj.max;
        let min = obj.min;
        this.currentSeriesImageObjects.push(obj);
        // if (useWindowCenter === null) {
        if (globalMax === undefined || max > globalMax) {
          globalMax = max;
        }
        if (globalMin === undefined || min < globalMin) {
          globalMin = min;
        }
        // }
      });
      this.seriesGlobalMax = globalMax;
      this.seriesGlobalMin = globalMin;
      if (useWindowWidth) {
        this.setState({
          useWindowCenter,
          useWindowWidth,
        });
      } else {
        this.setState({
          useWindowCenter: Math.floor((globalMax + globalMin) / 2),
          useWindowWidth: globalMax - globalMin,
        });
      }

      const w = series.images[0].getCols();
      const firstSagittal = Math.floor(w / 2);
      this.setState({
        totalSagittalFrames: w, //this.files.length,
        currentSagittalNo: firstSagittal + 1,
      });
      // build SAGITTAL
      this.buildSagittalView(
        series,
        firstSagittal,
        useWindowCenter,
        useWindowWidth
      );
      // build CORONAL views
      const h = series.images[0].getRows();
      const firstCoronal = Math.floor(h / 2);
      this.setState({
        totalCoronaFrames: h, //this.files.length,
        currentCoronaNo: firstCoronal + 1,
      });
      this.buildCoronalView(
        series,
        firstCoronal,
        useWindowCenter,
        useWindowWidth
      );

      const firstImageNo = Math.floor(series.images.length / 2);
      this.setState({
        totalFiles: this.files.length,
        currFileNo: firstImageNo + 1,
      });
      this.buildAxialView(
        series,
        this.currentSeriesImageObjects,
        firstImageNo,
        useWindowCenter,
        useWindowWidth
      );
      // NOTE: not support multi-frame or not default axial view now
      // for (const image of images) {
      //   console.log(image.getSliceLocation());
      // }
    } else {
      console.warn("no series image");
    }
  }

  buildAxialView(
    series: any,
    seriesObjects: any[],
    i_image: number,
    useWindowCenter?: number,
    useWindowWidth?: number
  ) {
    const daikonImage = series.images[i_image];
    const imageData = seriesObjects[i_image];
    this.renderImage(
      null,
      daikonImage,
      imageData,
      useWindowCenter,
      useWindowWidth
    );
  }

  onDropFiles = async (acceptedFiles: any[]) => {
    if (acceptedFiles.length > 0) {
      acceptedFiles.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
      this.isOnlineMode = false;
      this.files = acceptedFiles;
      // this.setState({
      //   totalFiles: this.files.length,
      //   currFileNo: 1,
      // });
      const { ifShowSagittalCoronal } = this.state;
      // TODO:
      // 1. x 如果每一張的 window center, width 不一樣呢?
      // 很難處理. 那就把 default 中間的 windowWidth, windowCenter 當做 useWindowWidth/center 好了
      // 2. *pass max/min<-??, width/height
      // 3. x make another 2 view raw data
      // 5. x switch frames in 2 view,
      // 6. x enable changing windowCenter & windowWidth? onMouseMove/
      // 15.x [todo]!! add handleNormalizeModeChange(switch show mode) on sagittal/coronal ???
      // 17.x 這個要跟 global max/min mode 一起做
      // 4. *mm scale ????? 要 pass. 再乘上原本的 scale<
      // 13. *[todo] test switchImage/onKeyDown x switchFrame
      // 8. x 應該不能每個 frame 都用其極值 normalize, 要嘛統一用 windowCenter, 如果沒有就用原本的值
      // 12.x  [todo] test http case
      // x 18. switch showSagittal mode !!!!
      // 9. *axial view 也存著全部的 rawData ???? yes
      // 10. p.s. 不處理 多張同時又是 multi-frame 的 case
      // 11. [todo] show 軸的字
      // 18. [todo] fine tune UI

      if (ifShowSagittalCoronal) {
        await this.loadSeriesFilesToRender(this.files);
      } else {
        console.log("ifShowSagittalCoronal = false");
        this.setState({
          totalFiles: this.files.length,
          currFileNo: 1,
        });
        this.loadFile(this.files[0]);
      }
    }
  };

  // toward left hand
  buildSagittalView(
    series: any,
    j_sagittal: number,
    useWindowCenter?: number,
    useWindowWidth?: number,
    currNormalizeMode?: number
  ) {
    const images = series.images;
    // console.log("series images:", images);
    const w = images[0].getCols();
    const h = images[0].getRows();
    if (j_sagittal >= w) {
      console.error("j_sagittal is >=w, invalid");
      return;
    }
    const n_slice = images.length;
    // sggittal: h*n_slice, 共 w 個. w 裡的第 j 個 sgg view的話,
    // 0th row: series.images[0] 的第 j column
    const rawData: number[] = []; //new Array<number>(h * n_slice);
    // iterate each slice
    this.currentSeriesImageObjects.forEach((obj: any) => {
      const data = obj.data as number[];
      // j column, toward right hand
      for (let i_row = 0; i_row < h; i_row++) {
        rawData.push(data[j_sagittal + w * i_row]);
      }
    });
    if (rawData.length !== h * n_slice) {
      console.error("sagittal view's number of element is wrong");
      return;
    }

    const spacing = images[0].getPixelSpacing();
    const spaceW = spacing[0];
    const spaceH = spacing[1]; // shoudl equal to spaceW
    const sliceThickness = images[0].getSliceThickness();

    let scale = 1;
    scale = this.resizeTotFit(w, h);

    this.renderFrame({
      canvasRef: this.myCanvasRefSagittal,
      rawData,
      rawDataWidth: h,
      rawDataHeight: n_slice,
      extraHeightScale: sliceThickness / spaceH / scale,
      extraWidthScale: 1 / scale,
      useWindowCenter,
      useWindowWidth,
      currNormalizeMode,
    });
  }

  // toward posterior side of the patient.
  buildCoronalView(
    series: any,
    k_corona: number,
    useWindowCenter?: number,
    useWindowWidth?: number,
    currNormalizeMode?: number
  ) {
    const images = series.images;
    // console.log("series images:", images);
    const w = images[0].getCols();
    const h = images[0].getRows();
    if (k_corona >= h) {
      console.error("k_corona is >=h, invalid");
      return;
    }
    const n_slice = images.length;
    // sggittal: w*n_slice, 共 h 個. h 裡的第 k 個 corona view的話,
    // 0th row: series.images[0] 的第 0 or final row
    const rawData: number[] = []; //new Array<number>(h * n_slice);
    // iterate each slice
    this.currentSeriesImageObjects.forEach((obj: any) => {
      // const obj = image.getInterpretedData(false, true, 0); // obj.data: float32array
      const data = obj.data as number[];
      // j column, toward right hand
      for (let i_column = 0; i_column < w; i_column++) {
        rawData.push(data[i_column + w * k_corona]);
      }
    });
    if (rawData.length !== h * n_slice) {
      console.error("coronal view's number of element is wrong");
      return;
    }

    const spacing = images[0].getPixelSpacing();
    const spaceW = spacing[0];
    const spaceH = spacing[1]; // shoudl equal to spaceW
    const sliceThickness = images[0].getSliceThickness();

    let scale = 1;
    scale = this.resizeTotFit(w, h);

    this.renderFrame({
      canvasRef: this.myCanvasRefCorona,
      rawData,
      rawDataWidth: w,
      rawDataHeight: n_slice,
      extraHeightScale: sliceThickness / spaceW / scale,
      extraWidthScale: 1 / scale,
      useWindowCenter,
      useWindowWidth,
      currNormalizeMode,
    });
  }

  handleSwitchFrame = (
    e: React.SyntheticEvent<HTMLElement, Event>,
    obj: DropdownProps
  ) => {
    const value = obj.value as number;

    console.log("switch frame:", value);

    this.setState({
      currFrameIndex: value,
    });
    this.renderFrame({ image: this.currentImage, frameIndex: value });
  };

  resizeTotFit(width: number, height: number) {
    let scale = 1;
    const size = {
      maxWidth: this.maxWidth,
      maxHeight: this.maxHeight,
    };
    if (width <= size.maxWidth && height <= size.maxHeight) {
      return scale;
    }
    const scaleW = width / size.maxWidth;
    const scaleH = height / size.maxHeight;
    scale = scaleW >= scaleH ? scaleW : scaleH;

    return scale;
  }

  onKeyDown = (keyName: string) => {
    const { totalFiles, currFileNo } = this.state;
    let newFileNo = currFileNo;
    if (totalFiles > 1) {
      if (keyName === "right") {
        newFileNo += 1;
        if (newFileNo > totalFiles) {
          return;
        }
      } else if (keyName === "left") {
        newFileNo -= 1;
        if (newFileNo < 1) {
          return;
        }
      }
    } else {
      return;
    }

    this.switchImage(newFileNo);
  };

  onMouseCanvasDown = (event: any) => {
    console.log("onMouseDown:", event);
    this.setState({
      isValidMouseDown: true,
    });

    this.clientX = event.clientX;
    this.clientY = event.clientY;

    // register mouse move event
    window.addEventListener("mousemove", this.onMouseMove);
  };

  onMouseUp = (event: any) => {
    console.log("onMouseUp:", event);
    this.setState({
      isValidMouseDown: false,
    });

    // unregister mouse move event
    window.removeEventListener("mousemove", this.onMouseMove);
  };

  // TODO: add throttle-debounce
  onMouseMove = (event: any) => {
    // console.log("onMousemove:", event);
    // const { clientX, scrollLeft, scrollTop, clientY } = this.state;
    // this._scroller.scrollLeft = scrollLeft - clientX + event.clientX;
    // this._scroller.scrollTop = scrollTop - clientY + event.clientY;
    const {
      isValidMouseDown,
      windowCenter,
      windowWidth,
      pixelMax,
      pixelMin,
      useWindowWidth,
      useWindowCenter,
      currFrameIndex,
      currNormalizeMode,
      ifShowSagittalCoronal,
      currentCoronaNo,
      currentSagittalNo,
    } = this.state;
    if (isValidMouseDown) {
      const {
        max,
        min,
        tmpWindowCenter,
        tmpWindowWidth,
      } = this.getNormalizationRange(
        useWindowWidth,
        useWindowCenter,
        currNormalizeMode,
        windowWidth,
        windowCenter,
        pixelMax,
        pixelMin
      );

      if (tmpWindowCenter !== undefined && tmpWindowWidth !== undefined) {
        let deltaX = event.clientX - this.clientX;
        const deltaY = this.clientY - event.clientY;
        // console.log("deltaY:", deltaY);

        let newWindowWidth = tmpWindowWidth + deltaX;
        if (newWindowWidth <= 1) {
          // console.log("newWindowWidth minus:", newWindowWidth);
          newWindowWidth = 2;
          deltaX = newWindowWidth - tmpWindowWidth;
        }
        if (deltaX === 0 && deltaY === 0) {
          return;
        }
        // console.log("newWindowWidth:", newWindowWidth);
        const newWindowCenter = tmpWindowCenter + deltaY;
        this.setState({
          useWindowCenter: newWindowCenter,
          useWindowWidth: newWindowWidth,
        });
        this.renderFrame({
          image: this.currentImage,
          frameIndex: currFrameIndex,
          currNormalizeMode: currNormalizeMode,
          useWindowCenter: newWindowCenter,
          useWindowWidth: newWindowWidth,
        });
        if (ifShowSagittalCoronal) {
          this.buildSagittalView(
            this.currentSeries,
            currentSagittalNo - 1,
            newWindowCenter,
            newWindowWidth
          );
          this.buildCoronalView(
            this.currentSeries,
            currentCoronaNo - 1,
            newWindowCenter,
            newWindowWidth
          );
        }
      }

      // max/min mode
      // default window center mode
    }
    this.clientX = event.clientX;
    this.clientY = event.clientY;
  };

  getNormalizationRange(
    useWindowWidth: number,
    useWindowCenter: number,
    currNormalizeMode: number,
    windowWidth: number | null,
    windowCenter: number | null,
    pixelMax: number,
    pixelMin: number
  ) {
    let max;
    let min;
    let tmpWindowCenter;
    let tmpWindowWidth;
    // console.log(
    //   "a:",
    //   useWindowWidth, // -1
    //   useWindowCenter, // 0
    //   windowWidth, // null
    //   windowCenter // null
    // );
    if (useWindowWidth >= 0 && useWindowCenter !== undefined) {
      tmpWindowCenter = useWindowCenter;
      tmpWindowWidth = useWindowWidth;
    } else if (currNormalizeMode === NormalizationMode.WindowCenter) {
      if (windowWidth !== null && windowWidth >= 0 && windowCenter !== null) {
        tmpWindowCenter = windowCenter;
        tmpWindowWidth = windowWidth;
      }
    } else if (currNormalizeMode === NormalizationMode.PixelHUMaxMin) {
    } else {
      const data = WindowCenterWidthConst[currNormalizeMode];
      tmpWindowCenter = data.L;
      tmpWindowWidth = data.W;
    }
    if (tmpWindowWidth !== undefined && tmpWindowCenter !== undefined) {
      min = tmpWindowCenter - Math.floor(tmpWindowWidth / 2);
      max = tmpWindowCenter + Math.floor(tmpWindowWidth / 2);
    } else {
      // max/min
      max = pixelMax;
      min = pixelMin;
      // ({ max, min } = obj);
    }

    // console.log("t:", max, min, pixelMax, pixelMin);

    return {
      max,
      min,
      tmpWindowCenter,
      tmpWindowWidth,
    };
  }

  handleSeriesModeChange = async (e: any, obj: any) => {
    // e: React.SyntheticEvent<HTMLElement, Event>,
    // obj: DropdownProps
    const { value } = obj;
    console.log("mode:", value);
    const { seriesMode } = this.state;
    if (seriesMode === "seriesMode") {
      this.setState({
        seriesMode: "notSeriesMode",
        ifShowSagittalCoronal: false,
      });
      this.maxWidth = MAX_WIDTH_SINGLE_MODE;
      this.maxHeight = MAX_HEIGHT_SINGLE_MODE;
      if (this.files.length > 0) {
        console.log("ifShowSagittalCoronal = false");
        this.setState({
          totalFiles: this.files.length,
          currFileNo: 1,
        });
        if (this.isOnlineMode) {
          this.fetchFile(this.files[0]);
        } else {
          this.loadFile(this.files[0]);
        }
      }
    } else if (seriesMode === "notSeriesMode") {
      this.maxWidth = MAX_WIDTH_SERIES_MODE;
      this.maxHeight = MAX_HEIGHT_SERIES_MODE;
      this.setState({ seriesMode: "seriesMode", ifShowSagittalCoronal: true });
      if (this.files.length > 0) {
        await this.loadSeriesFilesToRender(this.files);
      }
    }
  };

  render() {
    const {
      currFilePath,
      multiFrameInfo,
      frameIndexes,
      currFrameIndex,
      ifWindowCenterMode,
      currNormalizeMode,
      windowCenter,
      windowWidth,
      pixelMax,
      pixelMin,
      resX,
      resY,
      photometric,
      modality,
      currFileNo,
      totalFiles,
      hasDICOMExtension,
      useWindowWidth,
      useWindowCenter,
      ifShowSagittalCoronal,
      currentSagittalNo,
      totalSagittalFrames,
      currentCoronaNo,
      totalCoronaFrames,
      seriesMode,
    } = this.state;
    let info = "[meta]";
    info += ` modality:${modality};photometric:${photometric}`;
    if (resX && resY) {
      info += ` resolution:${resX}x${resY}`;
    }
    if (multiFrameInfo) {
      info += `; ${multiFrameInfo}`;
    }

    const {
      max,
      min,
      tmpWindowCenter,
      tmpWindowWidth,
    } = this.getNormalizationRange(
      useWindowWidth,
      useWindowCenter,
      currNormalizeMode,
      windowWidth,
      windowCenter,
      pixelMax,
      pixelMin
    );

    return (
      <Hotkeys
        allowRepeat
        keyName="right,left"
        onKeyDown={this.onKeyDown}
        // onKeyUp={this.onKeyUp.bind(this)}
      >
        <div className="flex-container">
          <div>
            <div className="flex-container">
              <div>
                DICOM Image Viewer (feat: 1. click DICOM url 2. click extension
                icon (or ctrl+u/cmd+u) to open <br></br>viewer page 3. drag any
                DICOM file into Chrome without opening viewer first 4.
                <a href="https://github.com/grimmer0125/dicom-web-viewer/wiki">
                  {" "}
                  More (e.g. CLI and Instruction)!
                </a>
              </div>
            </div>
            <div>
              <div className="flex-container">
                <Dropzone
                  preventDropOnDocument={false}
                  style={dropZoneStyle}
                  getDataTransferItems={(evt) => fromEvent(evt)}
                  onDrop={this.onDropFiles}
                >
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <p>
                        {" "}
                        Try dropping DICOM image files/folder here, <br />
                        or click here to select files to view. <br />
                        You need to enable file url access in extenstion DETAILS
                        setting page. <br /> Use right/left key to switch &
                        mouse press+move to change window center (level) <br />
                        and widow width
                      </p>
                    </div>
                  </div>
                </Dropzone>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {info}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div>
                  <div className="flex-container">
                    {`pixel/HU max:${pixelMax}, min:${pixelMin}; useWindowCenter:${
                      tmpWindowCenter ?? ""
                    }, useWindowWidth:${
                      tmpWindowWidth ?? ""
                    }; Normalization mode:`}
                    <br></br>
                    {`(WindowCenter mode will fallback to Pixel/HU MaxMin if no value):`}
                  </div>
                  <div>
                    <NormalizationComponent
                      mode={NormalizationMode.WindowCenter}
                      windowItem={
                        windowWidth >= 0
                          ? { L: windowCenter, W: windowWidth }
                          : undefined
                      }
                      currNormalizeMode={currNormalizeMode}
                      onChange={this.handleNormalizeModeChange}
                    />
                    <NormalizationComponent
                      mode={NormalizationMode.PixelHUMaxMin}
                      currNormalizeMode={currNormalizeMode}
                      onChange={this.handleNormalizeModeChange}
                    />
                  </div>
                  <div>
                    <NormalizationComponent
                      mode={NormalizationMode.AbdomenSoftTissues}
                      currNormalizeMode={currNormalizeMode}
                      onChange={this.handleNormalizeModeChange}
                    />

                    <NormalizationComponent
                      mode={NormalizationMode.SpineSoftTissues}
                      currNormalizeMode={currNormalizeMode}
                      onChange={this.handleNormalizeModeChange}
                    />

                    <NormalizationComponent
                      mode={NormalizationMode.SpineBone}
                      currNormalizeMode={currNormalizeMode}
                      onChange={this.handleNormalizeModeChange}
                    />
                  </div>
                  <div>
                    <NormalizationComponent
                      mode={NormalizationMode.Brain}
                      currNormalizeMode={currNormalizeMode}
                      onChange={this.handleNormalizeModeChange}
                    />
                    <NormalizationComponent
                      mode={NormalizationMode.Lungs}
                      currNormalizeMode={currNormalizeMode}
                      onChange={this.handleNormalizeModeChange}
                    />
                    <Radio
                      toggle
                      value={"seriesMode"}
                      checked={seriesMode === "seriesMode"}
                      onChange={this.handleSeriesModeChange}
                    />
                    {"  Enable Series mode"}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <div>
                    {" "}
                    {frameIndexes.length > 1 ? (
                      <Dropdown
                        placeholder="Switch Frame"
                        selection
                        onChange={this.handleSwitchFrame}
                        options={frameIndexes}
                        value={currFrameIndex}
                      />
                    ) : null}{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            </div>
            {/* <div
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              {" "}
              {currFilePath || null}{" "}
            </div> */}
            {totalFiles > 0 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div style={{ width: 600 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    {`${currFilePath}. ${currFileNo}/${totalFiles}`}
                  </div>
                  <div className="flex-container">
                    <div>{"S"}</div>
                    <Slider
                      value={currFileNo}
                      step={1}
                      min={1}
                      max={totalFiles}
                      onChange={this.switchImage}
                    />
                    <div>I</div>
                  </div>
                  {ifShowSagittalCoronal ? (
                    <>
                      <div className="flex-container">
                        <div>R</div>
                        <Slider
                          value={currentSagittalNo}
                          step={1}
                          min={1}
                          max={totalSagittalFrames}
                          onChange={this.switchSagittal}
                        />
                        <div>L</div>
                      </div>
                      <div className="flex-container">
                        <div>A</div>
                        <Slider
                          value={currentCoronaNo}
                          step={1}
                          min={1}
                          max={totalCoronaFrames}
                          onChange={this.switchCorona}
                        />
                        <div>P</div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
            {hasDICOMExtension ? (
              <div
                // onMouseDown={this.onMouseDown0}
                // onScroll={this.onMouseMove0}
                style={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <div>A</div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div>R</div>
                    <canvas
                      onMouseDown={this.onMouseCanvasDown}
                      // onMouseUp={this.onMouseUp0}
                      // onScroll={this.onMouseMove}
                      ref={this.myCanvasRef}
                      width={MAX_WIDTH_SERIES_MODE}
                      height={MAX_HEIGHT_SERIES_MODE}
                      style={{ backgroundColor: "black" }}
                    />
                    <div>L</div>
                  </div>
                  <div>P</div>
                </div>

                {ifShowSagittalCoronal ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <div>S</div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <div>A</div>
                        <canvas
                          onMouseDown={this.onMouseCanvasDown}
                          // onMouseUp={this.onMouseUp0}
                          // onScroll={this.onMouseMove}
                          ref={this.myCanvasRefSagittal}
                          width={MAX_WIDTH_SERIES_MODE}
                          height={MAX_HEIGHT_SERIES_MODE}
                          style={{ backgroundColor: "yellow" }}
                        />
                        <div>P</div>
                      </div>
                      <div>I</div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <div>S</div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <div>R</div>

                        <canvas
                          onMouseDown={this.onMouseCanvasDown}
                          // onMouseUp={this.onMouseUp0}
                          // onScroll={this.onMouseMove}
                          ref={this.myCanvasRefCorona}
                          width={MAX_WIDTH_SERIES_MODE}
                          height={MAX_HEIGHT_SERIES_MODE}
                          style={{ backgroundColor: "green" }}
                        />
                        <div>L</div>
                      </div>
                      <div>I</div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </Hotkeys>
    );
  }
}

export default App;

# DICOM Image Viewer

Besides Chrome extension, web demo site: https://grimmer.io/dicom-web-viewer/

## Chrome Extension type

### Install from Chrome Web Store

https://chrome.google.com/webstore/detail/dicom-image-viewer/ehppmcooahfnlfhhcflpkcjmonkoindc

### Install locally to develop or test

Ref: https://developer.chrome.com/extensions/getstarted

Make sure you have [`yarn`](https://yarnpkg.com/) installed first.

1. `yarn install`.
2. `yarn build`
3. Open the Extension Management page by navigating to `chrome://extensions`.
   - The Extension Management page can also be opened by clicking on the Chrome menu, hovering over `More Tools` then selecting `Extensions`.
4. Enable Developer Mode by clicking the toggle switch next to Developer mode.
5. Click the LOAD UNPACKED button and select the `build` folder in extension directory.

### After Installing

1. Open the Extension Management page by navigating to `chrome://extensions`.
2. Locate DICOM Image Viewer and click on the `DETAILS` button
3. Turn `Allow access to file URLs` switch on.

## Web app type for development

1. `yarn start`
2. (optional) use `debugger for Chrome` of `VSCode` to debug. or open your browser and navigates to `http://localhost:3000/`

### Deploy Web app to GitHub Pages

1. Add `"homepage": "https://grimmer0125.github.io/dicom-web-viewer"` in `package.json`
2. `yarn build`.
3. `yarn deploy` (which deploys to the `homepage` in package.json, change it if you need)

## Usage & features

https://github.com/grimmer0125/dicom-web-viewer/wiki

### Not support yet:

1. DICOM video format.
2. some non-linear Modality LUT case
3. YBR Photometric Interpretation

## Coordinate systems in medical images

Reference:

1. https://www.slicer.org/wiki/Coordinate_systems
2. https://dicom.innolitics.com/ciods/12-lead-ecg/general-series/00102210
3. https://dicom.innolitics.com/ciods/cr-image/general-image/00200020
4. https://stackoverflow.com/questions/34782409/understanding-dicom-image-attributes-to-get-axial-coronal-sagittal-cuts/34783893
5. https://dicom.innolitics.com/ciods/ct-image/image-plane/00200037

## DICOM parser library - Daikon 

https://github.com/rii-mango/Daikon which lists viewable DICOM Supported Transfer Syntax. 

### how to order series dicom files

daikon code snippet

```
if (hasImagePosition) {
   // (0020,0032)
   ordered = daikon.Series.orderByImagePosition(dg, sliceDir);
} else if (hasSliceLocation) {
   // (0020,1041)
   ordered = daikon.Series.orderBySliceLocation(dg);
} else if (hasImageNumber) {
   // (0020, 0013)
   ordered = daikon.Series.orderByImageNumber(dg);
```

## 3d note

1. https://stackoverflow.com/questions/6597843/dicom-slice-ordering
2. https://stackoverflow.com/questions/55120374/how-to-get-the-position-of-2d-dicom-image-slice-in-3d-surface-rendered-output-in

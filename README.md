# DICOM Image Viewer

## Extension type

### Install from Chrome Web Store

The extension is submitting and waitting for reviewing. 

### Install locally to develop or test

Ref: https://developer.chrome.com/extensions/getstarted

Make sure you if [`yarn`](https://yarnpkg.com/) installed first. 

1. `yarn install`.
2. Remove `homepage` in `package.json`, then `yarn build`.
3. Open the Extension Management page by navigating to `chrome://extensions`.
    - The Extension Management page can also be opened by clicking on the Chrome menu, hovering over `More Tools` then selecting `Extensions`.
4. Enable Developer Mode by clicking the toggle switch next to Developer mode.
5. Click the LOAD UNPACKED button and select the `build subfolder` in extension directory.

### After Installing 

1. Open the Extension Management page by navigating to `chrome://extensions`.
2. Locate DICOM Image Viewer and click on the `DETAILS` button
3. Turn `Allow access to file URLs` switch on. 

## Web app type for development

1. `yarn start`
2. (optional) use `debugger for Chrome` of `VSCode` to debug. or open your browser and navigates to `http://localhost:3000/`  

### Deploy Web app to GitHub Pages

`yarn deploy`

## Usage

Just drag your DICOM files into Chrome browser
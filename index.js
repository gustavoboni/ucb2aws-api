const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const decompress = require("decompress");
const dotenv = require("dotenv");
const { exec, spawn } = require("node:child_process");

dotenv.config();

const unityCloudBuildSignature = process.env.UNITY_CLOUD_BUILD_SIGNATURE;

const DECOMPRESSED_FOLDER_NAME = "decompressed_builds";
const BUILDS_FOLDER_NAME = "builds";

const app = express();

app.use(express.json());

app.get("/test", (req, res) => {
  console.log("get ok");
  res.send("get ok");
});

app.post("/", (req, res) => {
  console.log("UCB Webhook");
  //   console.log("webhook body", req.body);

  console.log(req.body.buildNumber);
  console.log(req.body.buildTargetName);

  const buildURL = getBuildURL(req.body);
  console.log("URL ", buildURL);

  let buildZipFilename =
    req.body.buildTargetName + "-" + req.body.buildNumber + ".zip";

  downloadBuildFromUCB(
    "https://unsplash.com/photos/Njd1TRaJj7w/download?ixid=MnwxMjA3fDB8MXxhbGx8OHx8fHx8fDJ8fDE2NzgyMDMwMDU&force=true",
    "image.jpg"
  );

  // downloadBuildFromUCB(buildURL, buildZipFilename);

  res.send("ok");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));

function getBuildURL(body) {
  try {
    // console.log(buildZipFilename);
    // console.log(body.links.artifacts[0].files);
    // console.log(body.links.artifacts[1].files);
    // console.log("Length: ", Object.keys(body.links).length);

    for (let i = 0; i < body.links.artifacts.length; i++) {
      console.log(i + ": " + body.links.artifacts[i].name);
      if (body.links.artifacts[i].name.localeCompare(".ZIP file") == 0) {
        console.log("Found file");
        let url = body.links.artifacts[i].files[0].href;
        return url;
      }
    }
    return null;
  } catch (e) {
    console.error("Unable to get url: " + e.message);
    return null;
  }
}

async function downloadBuildFromUCB(buildURL, buildFileName) {
  if (!fs.existsSync(BUILDS_FOLDER_NAME)) {
    fs.mkdirSync(BUILDS_FOLDER_NAME, { recursive: true });
  }

  const buildFileStreamPath = path.resolve(__dirname, "builds", buildFileName);
  const writer = fs.createWriteStream(buildFileStreamPath);

  console.log("downloading...");
  axios({
    method: "get",
    url: buildURL,
    responseType: "stream",
  }).then(function (response) {
    console.log("downloaded!");
    response.data.pipe(writer);
    console.log("Saving...");

    response.data.on("end", () => {
      console.log("File Saved!");
      decompressBuildZipFile(buildFileName);
    });

    response.data.on("error", () => {
      console.log("Couldn't save the file!");
    });
  });
}

function decompressBuildZipFile(buildFileName) {
  decompress("builds/" + buildFileName, DECOMPRESSED_FOLDER_NAME).then(
    (files) => {
      console.log("decompression done! ");
      runBatFile(DECOMPRESSED_FOLDER_NAME, buildFileName);
    }
  );
}

function runBatFile(folderName, buildFileName) {
  const dir = __dirname + "/decompressed_builds/" + buildFileName;
  console.log(dir);
  exec("upload-runner-build.bat beta4 ", (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(stdout);
  });
  console.log("This file is " + __filename);
  console.log("It's located in " + __dirname);
}

// // Script with spaces in the filename:
// const bat = spawn('"my script.cmd"', ['a', 'b'], { shell: true });
// // or:
// exec('"my script.cmd" a b', (err, stdout, stderr) => {
//   // ...
// });

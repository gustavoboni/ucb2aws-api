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
const RUNNER_S3_INTERNAL = "s3://runner.shoelacegaming.com/internal";
var buildNumber;
var buildTargetName;
var buildZipFilename;

const app = express();

app.use(express.json());

app.get("/test", (req, res) => {
  console.log("get ok");
  res.send("get ok");
});

app.post("/", (req, res) => {
  console.log("UCB Webhook");
  //   console.log("webhook body", req.body);

  buildNumber = req.body.buildNumber;
  buildTargetName = req.body.buildTargetName;
  buildZipFilename =
    req.body.buildTargetName + "-" + req.body.buildNumber + ".zip";
  console.log(buildNumber, buildTargetName, buildZipFilename);

  const buildURL = getBuildURL(req.body);
  console.log("URL ", buildURL);

  // downloadBuildFromUCB(
  //   "https://unsplash.com/photos/Njd1TRaJj7w/download?ixid=MnwxMjA3fDB8MXxhbGx8OHx8fHx8fDJ8fDE2NzgyMDMwMDU&force=true",
  //   "image.jpg"
  // );

  downloadBuildFromUCB(buildURL, buildZipFilename);

  //uncomment this to test only decompression
  // decompressBuildZipFile("beta4-91.zip");

  res.send("ok");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));

function getBuildURL(body) {
  try {
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
  createDir(BUILDS_FOLDER_NAME);

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
  createDir(DECOMPRESSED_FOLDER_NAME);
  decompress("builds/" + buildFileName, DECOMPRESSED_FOLDER_NAME).then(
    (files) => {
      console.log("decompression done! ");
      // runBatFile(DECOMPRESSED_FOLDER_NAME);
      runBatFileLinux(DECOMPRESSED_FOLDER_NAME);
    }
  );
}

function runBatFile(folderName) {
  // console.log("This file is " + __filename);
  // console.log("It's located in " + __dirname);
  const dir = __dirname + "/" + folderName + "/" + buildTargetName;
  console.log("Settings", buildTargetName, buildNumber, dir);
  exec(
    `bash upload-build.sh ${
      buildTargetName + "-" + buildNumber
    } ${dir} ${buildTargetName} ${RUNNER_S3_INTERNAL}`,
    (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(stdout);

      deleteDir(folderName);
    }
  );
}

function runBatFileLinux(folderName) {
  const scriptPath = "./upload-build.sh";
  const arg1 = buildTargetName + "-" + buildNumber;
  const arg2 = __dirname + "/" + folderName + "/" + buildTargetName;
  const arg3 = buildTargetName;
  const arg4 = RUNNER_S3_INTERNAL;
  const child = spawn("bash", [scriptPath, arg1, arg2, arg3, arg4]);

  // listen for stdout data from the child process
  child.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  // listen for stderr data from the child process
  child.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  // listen for when the child process exits
  child.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
    deleteDir(folderName);
  });
}

function createDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function deleteDir(dir) {
  fs.rm(dir, { recursive: true, force: true }, (err) => {
    if (err) {
      return console.log("error occurred in deleting directory", err);
    }

    console.log("Directory deleted successfully");
  });
}

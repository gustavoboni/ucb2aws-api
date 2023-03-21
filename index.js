const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const decompress = require("decompress");
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const amazonAccessKey = process.env.AMAZON_ACCESS_KEY;
const amazonSecretKey = process.env.AMAZON_SECRET_KEY;

const s3 = new S3Client();
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  console.log("get ok");
  res.send("get ok");
});

app.post("/", (req, res) => {
  console.log("UCB Webhook");
  //   console.log("webhook body", req.body);

  const buildURL = getBuildURL(req.body);
  console.log("URL ", buildURL);

  let buildZipFilename =
    req.body.buildTargetName + "-" + req.body.buildNumber + ".zip";

  //   downloadBuildFromUCB(
  //     "https://unsplash.com/photos/Njd1TRaJj7w/download?ixid=MnwxMjA3fDB8MXxhbGx8OHx8fHx8fDJ8fDE2NzgyMDMwMDU&force=true",
  //     "image.jpg"
  //   );

  //   downloadBuildFromUCB(buildURL, "build.zip");
  uploadBuildToS3();

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

function decompressBuildZipFile(fileName) {
  decompress("builds/" + fileName, "dist").then((files) => {
    console.log("done! " + files);
  });
}

async function uploadBuildToS3() {
  const s3 = S3Client({
    credentials: {
      accessKeyId: amazonAccessKey,
      secretAccessKey: amazonSecretKey,
      region: bucketRegion,
    },
  });

  const params = {
    Bucket: bucketName,
    Key: "",
    Body: "",
  };
  const command = new PutObjectCommand();
}

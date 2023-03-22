#!/bin/bash

echo -----------------------------------------
echo -------- Shoelace build uploader --------
echo ------------ by Gustavo Boni ------------
echo -----------------------------------------
echo Build version is $1
echo Build path is $2
echo Build Config name is $3
echo S3 bucket path is $4

aws s3 cp $2/ $4/$1/ --recursive --exclude "Build/*"
aws s3 cp $2/Build/$3.data.gz $4/$1/Build/ --content-encoding gzip
aws s3 cp $2/Build/$3.framework.js.gz $4/$1/Build/ --content-encoding gzip --content-type application/javascript
aws s3 cp $2/Build/$3.wasm.gz $4/$1/Build/ --content-encoding gzip
aws s3 cp $2/Build/$3.loader.js $4/$1/Build/ --content-type txt/javascript
aws cloudfront create-invalidation --distribution-id E14TGSHQ490P7P --paths "/internal/$1/*"

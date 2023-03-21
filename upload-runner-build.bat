echo -----------------------------------------
echo *** Welcome to the build uploader ***
echo -----------------------------------------
echo Build version is %1
echo Build Config name is %3
echo Build path is %2

aws s3 cp %2\ s3://runner.shoelacegaming.com/internal/%1/ --recursive --profile prod --exclude "Build/*"
aws s3 cp %2\Build\%3.data.gz s3://runner.shoelacegaming.com/internal/%1/Build/ --content-encoding gzip --profile prod
aws s3 cp %2\Build\%3.framework.js.gz s3://runner.shoelacegaming.com/internal/%1/Build/ --content-encoding gzip --content-type application/javascript --profile prod
aws s3 cp %2\Build\%3.wasm.gz s3://runner.shoelacegaming.com/internal/%1/Build/ --content-encoding gzip --profile prod
aws s3 cp %2\Build\%3.loader.js s3://runner.shoelacegaming.com/internal/%1/Build/ --content-type txt/javascript --profile prod
aws cloudfront create-invalidation --distribution-id E14TGSHQ490P7P --paths "/internal/%1/*" --profile prod

import axios from 'axios';
import JSZip from 'jszip';
import url from 'node:url';
import { EOL } from 'node:os';
import { promises as fs } from 'node:fs';
import parseEnvString from 'parse-env-string';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { CloudFrontClient } from '@aws-sdk/client-cloudfront';

const REGION = 'us-east-1';

export default {
  command: 'edge',
  describe: 'Deploy an AWS Lambda@Edge function used by a CloudFront distribution',
  builder: yargs => yargs
    .option('access-key', { demandOption: true, type: 'string' })
    .option('secret-key', { demandOption: true, type: 'string' })
    .option('lambda-env', { type: 'array', string: true })
    .option('lambda-env-inject', { type: 'string' })
    .option('function-name', { demandOption: true, type: 'string' })
    .option('handler', { demandOption: true, type: 'string' })
    .option('zip-file-uri', { demandOption: true, type: 'string' })
    .option('cf-distribution-id', { demandOption: true, type: 'string' })
    .option('wait', { default: false, type: 'boolean' }),
  handler: async argv => {
    const credentials = {
      accessKeyId: argv.accessKey,
      secretAccessKey: argv.secretKey
    };

    const lambdaClient = new LambdaClient({
      region: REGION,
      apiVersion: '2015-03-31',
      credentials
    });

    const cloudFrontClient = new CloudFrontClient({
      region: REGION,
      apiVersion: '2020-05-31',
      credentials
    });

    const envVars = parseEnvString((argv.lambdaEnv || []).join(' '));

    let zipFileBuffer;
    if ((/^https?:\/\//).test(argv.zipFileUri)) {
      const webRes = await axios.get(argv.zipFileUri, { responseType: 'arraybuffer' });
      zipFileBuffer = webRes.data;
    } else if ((/^file:\/\//).test(argv.zipFileUri)) {
      const filePath = url.fileURLToPath(argv.zipFileUri);
      zipFileBuffer = await fs.readFile(filePath);
    } else {
      throw Error('zipFileUri must use either http(s) or file protocol');
    }

    if (argv.lambdaEnvInject) {
      console.log(`Injecting environment variables into '${argv.lambdaEnvInject}'`);
      const lines = [];
      lines.push('// --- Environment variables injected by @educandu/deploy --------------------------------v');
      Object.entries(envVars).forEach(([key, value]) => {
        lines.push(`process.env["${key.replaceAll('"', '\\"')}"] = "${value.replaceAll('"', '\\"')}";`);
      });
      lines.push('// ^-------------------------------- Environment variables injected by @educandu/deploy ---');
      lines.push('');
      const zip = new JSZip();
      await zip.loadAsync(zipFileBuffer);
      const content = await zip.file(argv.lambdaEnvInject).async('string');
      zip.file(argv.lambdaEnvInject, [...lines, content].join(EOL));
      zipFileBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    }

    console.log(`Updating code for Lambda function '${argv.functionName}'`);
    await lambdaClient.updateFunctionCode({
      FunctionName: argv.functionName,
      ZipFile: zipFileBuffer
    });

    console.log(`Waiting for Lambda function '${argv.functionName}' update to be completed`);
    await lambdaClient.waitFor('functionUpdated', {
      FunctionName: argv.functionName
    });

    console.log(`Updating configuration for Lambda function '${argv.functionName}'`);
    const lambdaUpdateResult = await lambdaClient.updateFunctionConfiguration({
      FunctionName: argv.functionName,
      Handler: argv.handler,
      Environment: {
        Variables: argv.lambdaEnvInject ? {} : envVars
      }
    });

    console.log(`Waiting for Lambda function '${argv.functionName}' update to be completed`);
    await lambdaClient.waitFor('functionUpdated', {
      FunctionName: argv.functionName
    });

    console.log(`Publishing Lambda function '${argv.functionName}'`);
    const lambdaPublishResult = await lambdaClient.publishVersion({
      FunctionName: argv.functionName
    });

    console.log(`Waiting for Lambda function '${argv.functionName}' update to be completed`);
    await lambdaClient.waitFor('functionUpdated', {
      FunctionName: argv.functionName
    });

    console.log(`Successfully published Lambda function '${argv.functionName}'`);
    console.log(`  * Function ARN: ${lambdaPublishResult.FunctionArn}`);
    console.log(`  * Version: ${lambdaPublishResult.Version}`);

    console.log(`Fetching configuration for CloudFront distribution '${argv.cfDistributionId}'`);
    const currentDistributionConfig = await cloudFrontClient.getDistributionConfig({
      Id: argv.cfDistributionId
    });

    let hasUpdates = false;

    const nextDistributionConfig = JSON.parse(JSON.stringify(currentDistributionConfig));
    delete nextDistributionConfig.ETag;
    nextDistributionConfig.Id = argv.cfDistributionId;
    nextDistributionConfig.IfMatch = currentDistributionConfig.ETag;

    const cacheBehaviors = [
      nextDistributionConfig.DistributionConfig.DefaultCacheBehavior,
      ...nextDistributionConfig.DistributionConfig.CacheBehaviors.Items
    ];

    for (const cacheBehavior of cacheBehaviors) {
      for (const association of cacheBehavior.LambdaFunctionAssociations.Items) {
        if (association.LambdaFunctionARN.startsWith(lambdaUpdateResult.FunctionArn)) {
          console.log('Updating Lambda Function ARN');
          console.log(`  * From: ${association.LambdaFunctionARN}`);
          console.log(`  * To: ${lambdaPublishResult.FunctionArn}`);
          association.LambdaFunctionARN = lambdaPublishResult.FunctionArn;
          hasUpdates = true;
        }
      }
    }

    if (!hasUpdates) {
      throw new Error('CloudFront configuration has no function to update');
    }

    console.log(`Updating CloudFront distribution '${argv.cfDistributionId}'`);
    const { ETag: etagAfterUpdate } = await cloudFrontClient.udateDistribution(nextDistributionConfig);
    if (etagAfterUpdate !== currentDistributionConfig.ETag) {
      console.log(`Successfully updated CloudFront distribution '${argv.cfDistributionId}':`);
      console.log(`  * Old etag: ${currentDistributionConfig.ETag}`);
      console.log(`  * New etag: ${etagAfterUpdate}`);
    } else {
      throw new Error('CloudFront distribution update was not successful, the etag is still the same');
    }

    if (argv.wait) {
      console.log('Waiting for distribution deployment...');
      await cloudFrontClient.waitFor('distributionDeployed', {
        Id: argv.cfDistributionId
      });
    }

    console.log('DONE!');
  }
};

import axios from 'axios';
import JSZip from 'jszip';
import url from 'node:url';
import { EOL } from 'node:os';
import { promises as fs } from 'node:fs';
import { validateDeployEdgeOptions } from './validation.js';
import {
  CloudFrontClient,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
  waitUntilDistributionDeployed
} from '@aws-sdk/client-cloudfront';
import {
  LambdaClient,
  PublishVersionCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
  waitUntilFunctionUpdatedV2
} from '@aws-sdk/client-lambda';

const REGION = 'us-east-1';

export default async function deployEdge(options) {
  validateDeployEdgeOptions(options);

  console.log(`Deploying to Lambda Edge with options: ${JSON.stringify(options)}`);

  const credentials = {
    accessKeyId: options.accessKey,
    secretAccessKey: options.secretKey
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

  let zipFileBuffer;
  if ((/^https?:\/\//).test(options.zipFileUri)) {
    const webRes = await axios.get(options.zipFileUri, { responseType: 'arraybuffer' });
    zipFileBuffer = webRes.data;
  } else if ((/^file:\/\//).test(options.zipFileUri)) {
    const filePath = url.fileURLToPath(options.zipFileUri);
    zipFileBuffer = await fs.readFile(filePath);
  } else {
    throw Error('zipFileUri must use either http(s) or file protocol');
  }

  if (options.lambdaEnvInject) {
    console.log(`Injecting environment variables into '${options.lambdaEnvInject}'`);
    const lines = [];
    lines.push('// --- Environment variables injected by @educandu/deploy --------------------------------v');
    Object.entries(options.lambdaEnv).forEach(([key, value]) => {
      lines.push(`process.env["${key.replaceAll('"', '\\"')}"] = "${value.replaceAll('"', '\\"')}";`);
    });
    lines.push('// ^-------------------------------- Environment variables injected by @educandu/deploy ---');
    lines.push('');
    const zip = new JSZip();
    await zip.loadAsync(zipFileBuffer);
    const content = await zip.file(options.lambdaEnvInject).async('string');
    zip.file(options.lambdaEnvInject, [...lines, content].join(EOL));
    zipFileBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  }

  console.log(`Updating code for Lambda function '${options.functionName}'`);
  await lambdaClient.send(new UpdateFunctionCodeCommand({
    FunctionName: options.functionName,
    ZipFile: zipFileBuffer
  }));

  console.log(`Waiting for Lambda function '${options.functionName}' update to be completed`);
  await waitUntilFunctionUpdatedV2({
    client:lambdaClient
  }, {
    FunctionName: options.functionName
  });

  console.log(`Updating configuration for Lambda function '${options.functionName}'`);
  const lambdaUpdateResult = await lambdaClient.send(new UpdateFunctionConfigurationCommand({
    FunctionName: options.functionName,
    Handler: options.handler,
    Environment: {
      Variables: options.lambdaEnvInject ? {} : options.lambdaEnv
    }
  }));

  console.log(`Waiting for Lambda function '${options.functionName}' update to be completed`);
  await waitUntilFunctionUpdatedV2({
    client:lambdaClient
  }, {
    FunctionName: options.functionName
  });

  console.log(`Publishing Lambda function '${options.functionName}'`);
  const lambdaPublishResult = await lambdaClient.send(new PublishVersionCommand({
    FunctionName: options.functionName
  }));

  console.log(`Waiting for Lambda function '${options.functionName}' update to be completed`);
  await waitUntilFunctionUpdatedV2({
    client:lambdaClient
  }, {
    FunctionName: options.functionName
  });

  console.log(`Successfully published Lambda function '${options.functionName}'`);
  console.log(`  * Function ARN: ${lambdaPublishResult.FunctionArn}`);
  console.log(`  * Version: ${lambdaPublishResult.Version}`);

  console.log(`Fetching configuration for CloudFront distribution '${options.cfDistributionId}'`);
  const currentDistributionConfig = await cloudFrontClient.send(new GetDistributionConfigCommand({
    Id: options.cfDistributionId
  }));

  let hasUpdates = false;

  const nextDistributionConfig = JSON.parse(JSON.stringify(currentDistributionConfig));
  delete nextDistributionConfig.ETag;
  nextDistributionConfig.Id = options.cfDistributionId;
  nextDistributionConfig.IfMatch = currentDistributionConfig.ETag;

  const nonDefaultCacheBehaviors = nextDistributionConfig.DistributionConfig.CacheBehaviors.Items || [];
  const cacheBehaviors = [
    nextDistributionConfig.DistributionConfig.DefaultCacheBehavior,
    ...nonDefaultCacheBehaviors
  ];

  for (const cacheBehavior of cacheBehaviors) {
    const lambdaFunctionAssociations = cacheBehavior.LambdaFunctionAssociations.Items || [];
    for (const association of lambdaFunctionAssociations) {
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

  console.log(`Updating CloudFront distribution '${options.cfDistributionId}'`);
  const { ETag: etagAfterUpdate } = await cloudFrontClient.send(new UpdateDistributionCommand(nextDistributionConfig));
  if (etagAfterUpdate !== currentDistributionConfig.ETag) {
    console.log(`Successfully updated CloudFront distribution '${options.cfDistributionId}':`);
    console.log(`  * Old etag: ${currentDistributionConfig.ETag}`);
    console.log(`  * New etag: ${etagAfterUpdate}`);
  } else {
    throw new Error('CloudFront distribution update was not successful, the etag is still the same');
  }

  if (options.wait) {
    console.log('Waiting for distribution deployment...');
    await waitUntilDistributionDeployed({
      client: cloudFrontClient
    }, {
      Id: options.cfDistributionId
    });
  }

  console.log('DONE!');
}

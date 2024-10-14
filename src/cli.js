import yargs from 'yargs';
import Graceful from 'node-graceful';
import deployEcs from './deploy-ecs.js';
import deployEdge from './deploy-edge.js';
import parseEnvString from 'parse-env-string';

Graceful.captureExceptions = true;
Graceful.captureRejections = true;

const envStringToObject = containerEnv => parseEnvString((containerEnv || []).join(' '));

// eslint-disable-next-line no-unused-expressions
yargs(process.argv.slice(2))
  .command({
    command: 'ecs',
    describe: 'Deploy an AWS ECS service using Fargate',
    builder: yargsInstance => yargsInstance
      .option('access-key', { demandOption: true, type: 'string' })
      .option('secret-key', { demandOption: true, type: 'string' })
      .option('region', { demandOption: true, type: 'string' })
      .option('cluster', { demandOption: true, type: 'string' })
      .option('service', { demandOption: true, type: 'string' })
      .option('container', { demandOption: true, type: 'string' })
      .option('image', { demandOption: true, type: 'string' })
      .option('image-tag', { demandOption: true, type: 'string' })
      .option('container-env', { type: 'array', string: true })
      .option('wait', { default: false, type: 'boolean' }),
    handler: argv => deployEcs({
      ...argv,
      wait: !!argv.wait,
      containerEnv: envStringToObject(argv.containerEnv)
    })
  })
  .command({
    command: 'edge',
    describe: 'Deploy an AWS Lambda@Edge function used by a CloudFront distribution',
    builder: yargsInstance => yargsInstance
      .option('access-key', { demandOption: true, type: 'string' })
      .option('secret-key', { demandOption: true, type: 'string' })
      .option('lambda-env', { type: 'array', string: true })
      .option('lambda-env-inject', { type: 'string' })
      .option('function-name', { demandOption: true, type: 'string' })
      .option('handler', { demandOption: true, type: 'string' })
      .option('zip-file-uri', { demandOption: true, type: 'string' })
      .option('cf-distribution-id', { demandOption: true, type: 'string' })
      .option('wait', { default: false, type: 'boolean' }),
    handler: argv => deployEdge({
      ...argv,
      wait: !!argv.wait,
      lambdaEnv: envStringToObject(argv.lambdaEnv)
    })
  })
  .demandCommand()
  .help()
  .argv;

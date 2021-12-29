import yargs from 'yargs';
import Graceful from 'node-graceful';
import deployEcs from './deploy-ecs.js';
import deployEdge from './deploy-edge.js';

Graceful.captureExceptions = true;
Graceful.captureRejections = true;

// eslint-disable-next-line no-unused-expressions
yargs(process.argv.slice(2))
  .command(deployEcs)
  .command(deployEdge)
  .demandCommand()
  .help()
  .argv;

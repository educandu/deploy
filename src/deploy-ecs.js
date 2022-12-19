import AWS from 'aws-sdk';
import { promisify } from 'node:util';
import parseEnvString from 'parse-env-string';

const { ECS, Credentials } = AWS;

export default {
  command: 'ecs',
  describe: 'Deploy an AWS ECS service using Fargate',
  builder: yargs => yargs
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
  handler: async argv => {
    const ecs = new ECS({
      region: argv.region,
      apiVersion: '2014-11-13',
      credentials: new Credentials(argv.accessKey, argv.secretKey)
    });

    const ecsDescribeServices = promisify(ecs.describeServices.bind(ecs));
    const ecsDescribeTaskDefinition = promisify(ecs.describeTaskDefinition.bind(ecs));
    const ecsRegisterTaskDefinition = promisify(ecs.registerTaskDefinition.bind(ecs));
    const ecsUpdateService = promisify(ecs.updateService.bind(ecs));
    const ecsWaitFor = promisify(ecs.waitFor.bind(ecs));

    const serviceDescriptions = await ecsDescribeServices({
      cluster: argv.cluster,
      services: [argv.service]
    });

    const taskDefinitionDescription = await ecsDescribeTaskDefinition({
      taskDefinition: serviceDescriptions.services[0].taskDefinition
    });

    const task = taskDefinitionDescription.taskDefinition;
    console.log(`Current task definition: ${task.taskDefinitionArn}`);

    const envObj = parseEnvString((argv.containerEnv || []).join(' '));
    const containerEnvironmentVariables = Object.entries(envObj).map(([name, value]) => ({ name, value }));

    const newTaskDefinition = {
      family: task.family,
      taskRoleArn: task.taskRoleArn,
      executionRoleArn: task.executionRoleArn,
      networkMode: task.networkMode,
      volumes: task.volumes,
      placementConstraints: task.placementConstraints,
      requiresCompatibilities: task.requiresCompatibilities,
      cpu: task.cpu,
      memory: task.memory,
      containerDefinitions: task.containerDefinitions.map(containerDefinition => {
        if (containerDefinition.name !== argv.container) {
          return containerDefinition;
        }

        const newContainerDefinition = {
          ...containerDefinition,
          image: `${argv.image}:${argv.imageTag}`
        };

        if (containerEnvironmentVariables.length) {
          newContainerDefinition.environment = containerEnvironmentVariables;
        }

        return newContainerDefinition;
      })
    };

    const newTaskDefinitionDescription = await ecsRegisterTaskDefinition(newTaskDefinition);

    const registeredTask = newTaskDefinitionDescription.taskDefinition;
    console.log(`New task definition: ${registeredTask.taskDefinitionArn}`);

    if (containerEnvironmentVariables.length) {
      console.log(`New task definition environment: ${JSON.stringify(containerEnvironmentVariables)}`);
    }

    await ecsUpdateService({
      cluster: argv.cluster,
      service: argv.service,
      taskDefinition: registeredTask.taskDefinitionArn
    });

    if (argv.wait) {
      console.log('Waiting for service stability...');
      await ecsWaitFor('servicesStable', {
        cluster: argv.cluster,
        services: [argv.service]
      });
    }

    console.log('DONE!');
  }
};

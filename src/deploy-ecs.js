import { validateDeployEcsOptions } from './validation.js';
import {
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  ECSClient,
  RegisterTaskDefinitionCommand,
  UpdateServiceCommand,
  waitUntilServicesStable
} from '@aws-sdk/client-ecs';

export default async function deployEcs(options) {
  validateDeployEcsOptions(options);

  const ecsClient = new ECSClient({
    region: options.region,
    apiVersion: '2014-11-13',
    credentials: {
      accessKeyId: options.accessKey,
      secretAccessKey: options.secretKey
    }
  });

  const serviceDescriptions = await ecsClient.send(new DescribeServicesCommand({
    cluster: options.cluster,
    services: [options.service]
  }));

  const taskDefinitionDescription = await ecsClient.send(new DescribeTaskDefinitionCommand({
    taskDefinition: serviceDescriptions.services[0].taskDefinition
  }));

  const task = taskDefinitionDescription.taskDefinition;
  console.log(`Current task definition: ${task.taskDefinitionArn}`);

  const containerEnvironmentVariables = Object.entries(options.containerEnv).map(([name, value]) => ({ name, value }));

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
      if (containerDefinition.name !== options.container) {
        return containerDefinition;
      }

      const newContainerDefinition = {
        ...containerDefinition,
        image: `${options.image}:${options.imageTag}`
      };

      if (containerEnvironmentVariables.length) {
        newContainerDefinition.environment = containerEnvironmentVariables;
      }

      return newContainerDefinition;
    })
  };

  const newTaskDefinitionDescription = await ecsClient.send(new RegisterTaskDefinitionCommand(newTaskDefinition));

  const registeredTask = newTaskDefinitionDescription.taskDefinition;
  console.log(`New task definition: ${registeredTask.taskDefinitionArn}`);

  if (containerEnvironmentVariables.length) {
    console.log(`New task definition environment: ${JSON.stringify(containerEnvironmentVariables)}`);
  }

  await ecsClient.send(new UpdateServiceCommand({
    cluster: options.cluster,
    service: options.service,
    taskDefinition: registeredTask.taskDefinitionArn
  }));

  if (options.wait) {
    console.log('Waiting for service stability...');
    await waitUntilServicesStable({
      client: ecsClient
    }, {
      cluster: options.cluster,
      services: [options.service]
    });
  }

  console.log('DONE!');
}

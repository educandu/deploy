import joi from 'joi';

export const defaultValidationOptions = {
  abortEarly: false,
  allowUnknown: false,
  convert: false,
  dateFormat: 'iso',
  noDefaults: true,
  presence: 'optional',
  stripUnknown: false
};

const deployEcsOptionsSchema = joi.object({
  accessKey: joi.string().required(),
  secretKey: joi.string().required(),
  region: joi.string().required(),
  cluster: joi.string().required(),
  service: joi.string().required(),
  container: joi.string().required(),
  image: joi.string().required(),
  imageTag: joi.string().required(),
  containerEnv: joi.object().pattern(/.*/, joi.string().allow('')).required(),
  wait: joi.boolean().required()
});

const deployEdgeOptionsSchema = joi.object({
  accessKey: joi.string().required(),
  secretKey: joi.string().required(),
  lambdaEnv: joi.object().pattern(/.*/, joi.string().allow('')).required(),
  lambdaEnvInject: joi.string().allow('').required(),
  functionName: joi.string().required(),
  handler: joi.string().required(),
  zipFileUri: joi.string().required(),
  cfDistributionId: joi.string().required(),
  wait: joi.boolean().required()
});

export function validateDeployEcsOptions(options) {
  return joi.attempt(options, deployEcsOptionsSchema, defaultValidationOptions);
}

export function validateDeployEdgeOptions(options) {
  return joi.attempt(options, deployEdgeOptionsSchema, defaultValidationOptions);
}

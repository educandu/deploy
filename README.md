# deploy

Deployment utility for Educandu projects

## Command: ecs

Updates the container image version inside a task definition of a ECS service deployed on AWS Fargate.

### Usage

~~~
$ ./node index.js ecs --access-key 487nct72tc4tdjgbj ...
~~~

### Arguments

| Name | Description | Type | Required |
| --- | --- | --- | --- |
| access-key | AWS access key | string | yes |
| secret-key | AWS secret key | string | yes |
| region | AWS region | string | yes |
| cluster | AWS ECS cluster name | string | yes |
| service | AWS ECS service name | string | yes |
| container | AWS ECS container name | string | yes |
| image | AWS ECS image | string | yes |
| image-tag | AWS ECS image tag | string | yes |
| container-env | Environment variable pair to be passed to the deployed container, format `name=value` | array of string | no |
| wait | Whether or not to wait for service stability | boolean | no (defaults to false) |

Note:

* `container-env` can be set multiple times, per each environment variable needed for the deployed container

## Command: edge

Updates code and environment variables of an AWS Lambda@Edge function, publishes a new version for the
function, and updates a CloudFront distribution that is using this function to the published version.

### Usage

~~~
$ ./node index.js edge --access-key 487nct72tc4tdjgbj ...
~~~

### Arguments

| Name | Description | Type | Required |
| --- | --- | --- | --- |
| access-key | AWS access key | string | yes |
| secret-key | AWS secret key | string | yes |
| lambda-env | Environment variable pair to be available to the deployed function, format `name=value` | array of string | no |
| lambda-env-inject | Path of the JS file inside the zip file to directly inject environment variables | array of string | no |
| function-name | Name of the Lambda function | string | yes |
| handler | Handler of the Lambda function | string | yes |
| zip-file-uri | URL of the ZIP file containing the function code to deploy | string | yes |
| cf-distribution-id | ID of the CloudFront distribution | string | yes |
| wait | Whether or not to wait the CloudFront distribution to propagate the new deployment | boolean | no (defaults to false) |

Note:

* `lambda-env` can be set multiple times, per each environment variable needed for the deployed function
* If `lambda-env-inject` is specified, environment variables will not be set in the lambda configuration, but directly injected into the code
* The AWS region is set automatically to `us-east-1` as this is the only region to configure Lambda@Edge functions

## License

Educandu is released under the MIT License. See the bundled LICENSE file for details.

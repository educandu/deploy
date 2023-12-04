# deploy

[![codecov](https://codecov.io/gh/educandu/deploy/branch/main/graph/badge.svg)](https://codecov.io/gh/educandu/deploy)

Deployment utility for educandu projects

## Prerequisites

* node.js ^18.0.0
* optional: globally installed gulp: `npm i -g gulp-cli`

The output of this repository is a Docker image (`educandu/deploy`).

## Command: ecs

Updates the container image version inside a task definition of a ECS service deployed on AWS Fargate.

### Usage

~~~
$ node ./src/index.js ecs --access-key 487nct72tc4tdjgbj ...
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
$ node ./src/index.js edge --access-key 487nct72tc4tdjgbj ...
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

---

## OER learning platform for music

Funded by 'Stiftung Innovation in der Hochschullehre'

<img src="https://stiftung-hochschullehre.de/wp-content/uploads/2020/07/logo_stiftung_hochschullehre_screenshot.jpg)" alt="Logo der Stiftung Innovation in der Hochschullehre" width="200"/>

A Project of the 'Hochschule für Musik und Theater München' (University for Music and Performing Arts)

<img src="https://upload.wikimedia.org/wikipedia/commons/d/d8/Logo_Hochschule_f%C3%BCr_Musik_und_Theater_M%C3%BCnchen_.png" alt="Logo der Hochschule für Musik und Theater München" width="200"/>

Project owner: Hochschule für Musik und Theater München\
Project management: Ulrich Kaiser

# deploy

Deployment utility for Educandu projects

## Arguments

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
`container-env` can be set multiple times, per each environment variable needed for the deployed container

## License

Educandu is released under the MIT License. See the bundled LICENSE file for details.

# Manhunt

A React-Express web application deployed to AWS infrastructure using Terraform.

Manhunt is a game played in the real world where a runner tries to run from a group of chasers who are trying to tag them. The chasers see a 5 minute delay of the runner's location.

# Runnning
Local development
```sh
npm run build
npm run start
```

Deployment
```sh
# Sign into AWS
sh deploy_container.sh
sh deploy_infra.sh
```
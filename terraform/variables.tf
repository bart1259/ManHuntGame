variable "app_name" {
  type    = string
  default = "manhunt-bartek"
}

variable "domain_name" {
    type    = string
    default = "YOUR_DOMAIN.com"
}

variable "vpc_id" {
  type    = string
  default = "vpc-0a0229e3eedcb7695"
}

variable "subnet_ids" {
  type    = list(string)
  default = ["subnet-0c5cb18495563ea64", "subnet-0247257ced67f77a1"]
}
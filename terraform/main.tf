terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.27.0"
    }
  }

}

provider "aws" {
  region = "us-east-2"
}

resource "aws_ecr_repository" "ecr_repo" {
  name                 = format("%s%s", var.app_name, "-container-repo")
  image_tag_mutability = "MUTABLE"
}

data "aws_ami" "amazon_linux_ami" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "image-id"
    values = ["ami-0862be96e41dcbf74"]
  }
}

resource "aws_cloudwatch_log_group" "log_group" {
  name = "server_log_group"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_stream" "log_stream" {
  name           = "server_log_stream"
  log_group_name = aws_cloudwatch_log_group.log_group.name
}

### POLICIES

resource "aws_iam_role" "example" {
  name = "example"

  assume_role_policy = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
          "Service": "ec2.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": ""
      }
    ]
  }
  EOF
}

resource "aws_iam_role_policy" "example" {
  name = "example"
  role = aws_iam_role.example.id

  policy = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetAuthorizationToken",
          "ecr:GetRepositoryPolicy",
          "ecr:DescribeRepositories"
        ],
        "Effect": "Allow",
        "Resource": "*"
      }
    ]
  }
  EOF
}

resource "aws_iam_instance_profile" "example" {
  name = "example"
  role = aws_iam_role.example.name
}

### END POLICIES

### SSH KEYS

resource "aws_key_pair" "deployer" {
  key_name   = "deployer-key"
  public_key = file("~/.ssh/id_rsa.pub")
}

resource "aws_security_group" "server_sg" {
  name        = "server_sg"
  description = "Allow SSH inbound traffic"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


### END SSH KEYS

resource "aws_instance" "server" {
  ami           = data.aws_ami.amazon_linux_ami.id
  instance_type = "t2.micro"
  iam_instance_profile = aws_iam_instance_profile.example.name
  key_name      = aws_key_pair.deployer.key_name
  vpc_security_group_ids = [aws_security_group.server_sg.id]

  user_data = <<-EOF
    #!/bin/bash

    # Update the system
    sudo apt-get update -y

    # Install AWS CLI
    sudo apt-get install awscli -y

    # Download and install Amazon CloudWatch Agent
    wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
    sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

    # Create a directory for CloudWatch Agent configuration
    sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc

    # Create a .json config file for CloudWatch Agent
    echo '{
    "agent": {
        "metrics_collection_interval": 60,
        "logfile": "/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log"
    },
    "logs": {
        "logs_collected": {
        "files": {
            "collect_list": [
            {
                "file_path": "/var/log/syslog",
                "log_group_name": "${aws_cloudwatch_log_group.log_group.name}",
                "log_stream_name": "${aws_cloudwatch_log_stream.log_stream.name}",
                "timestamp_format": "%b %d %H:%M:%S"
            }
            ]
        }
        }
    }
    }' | sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

    # Start the CloudWatch Agent service
    sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s

    # Enable the service to start on boot
    sudo systemctl enable amazon-cloudwatch-agent

    # Download and install Docker
    sudo apt-get install docker.io -y

    # Start the Docker service
    sudo systemctl start docker

    # Install AWS CLI
    sudo apt-get install unzip -y
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install

    # Pull down the latest Docker image from ECR
    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

    # Login to ECR
    ECR_URL=$AWS_ACCOUNT_ID.dkr.ecr.us-east-2.amazonaws.com

    echo "Logging into AWS Account $AWS_ACCOUNT_ID"
    aws ecr get-login-password --region us-east-2 | sudo docker login --username AWS --password-stdin $ECR_URL
    sudo docker pull ${aws_ecr_repository.ecr_repo.repository_url}:latest

    # Run the Docker container
    sudo docker run -d -p 443:443 ${aws_ecr_repository.ecr_repo.repository_url}:latest

    echo "Done!"
  EOF
}

#### DOMAIN

# Configure domain record
resource "aws_route53_zone" "domain_zone" {
  name = var.domain_name
}

# Connect domain to API Gateway
resource "aws_route53_record" "domain_record" {
  zone_id = aws_route53_zone.domain_zone.zone_id 
  name    = format("%s.%s", "app", var.domain_name)
  type    = "CNAME"
  ttl     = "60"
  records = [aws_instance.server.public_dns]
}
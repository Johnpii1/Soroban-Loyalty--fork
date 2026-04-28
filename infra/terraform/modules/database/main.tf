resource "aws_db_subnet_group" "main" {
  name       = "soroban-loyalty-${var.environment}"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "rds" {
  name   = "soroban-loyalty-${var.environment}-rds"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "main" {
  identifier             = "soroban-loyalty-${var.environment}"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = var.environment == "production" ? "db.t3.medium" : "db.t3.micro"
  allocated_storage      = var.environment == "production" ? 100 : 20
  storage_encrypted      = true
  db_name                = "soroban_loyalty"
  username               = "soroban_admin"
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot    = var.environment != "production"
  deletion_protection    = var.environment == "production"
  backup_retention_period = var.environment == "production" ? 7 : 1
  multi_az               = var.environment == "production"
}

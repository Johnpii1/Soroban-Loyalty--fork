resource "aws_elasticache_subnet_group" "main" {
  name       = "soroban-loyalty-${var.environment}"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "redis" {
  name   = "soroban-loyalty-${var.environment}-redis"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
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

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "soroban-loyalty-${var.environment}"
  description          = "Redis cache for soroban-loyalty ${var.environment}"
  node_type            = var.environment == "production" ? "cache.t3.small" : "cache.t3.micro"
  num_cache_clusters   = var.environment == "production" ? 2 : 1
  engine_version       = "7.0"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}

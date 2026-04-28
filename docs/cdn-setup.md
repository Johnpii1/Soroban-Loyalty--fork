# CDN Configuration for Frontend

This document outlines the CDN setup for the Soroban-Loyalty frontend to improve performance and reduce server load.

## Overview

The frontend is configured to use a CDN (CloudFront) to cache and serve static assets.

### Cache Strategy

| Path Pattern | Cache Type | TTL | Headers |
|---|---|---|---|
| `/_next/static/*` | Immutable | 1 Year | `public, max-age=31536000, immutable` |
| `/static/*` | Immutable | 1 Year | `public, max-age=31536000, immutable` |
| Other (HTML, etc.) | Dynamic | 60 Seconds | `public, max-age=60, stale-while-revalidate=59` |

## Components

### 1. Next.js Configuration
The `next.config.js` has been updated to:
- Use an optional `NEXT_PUBLIC_CDN_URL` as the `assetPrefix`.
- Send appropriate `Cache-Control` headers for different path patterns.

### 2. Infrastructure (CloudFront)
A Terraform configuration is provided in `infra/cdn/cloudfront.tf`. It defines:
- A CloudFront distribution pointing to the frontend origin.
- Optimized cache behaviors for static and dynamic content.

### 3. CI/CD Invalidation
The `.github/workflows/blue-green-deploy.yml` now includes a step to invalidate the CloudFront cache upon successful deployment.

## Deployment Steps

1. **Deploy Infrastructure**: Use Terraform to apply `infra/cdn/cloudfront.tf`.
2. **Set Environment Variables**:
   - `NEXT_PUBLIC_CDN_URL`: Set this to your CloudFront domain (e.g., `https://d123.cloudfront.net`) in your build environment.
3. **Configure Secrets**:
   - `CLOUDFRONT_DISTRIBUTION_ID`: Set this in GitHub Secrets to enable automatic cache invalidation.
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: Required for the invalidation step.

## Verification

To verify the setup, check the Response Headers for static assets:
- `x-cache`: Should be `Hit from cloudfront` on subsequent requests.
- `cache-control`: Should match the values defined above.

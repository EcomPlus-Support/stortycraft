# StoryCraft Premium Pricing Model Specification

## Overview
This document defines the official pricing model for StoryCraft's premium service. All implementation must strictly follow this pricing structure to ensure profitability and prevent losses.

## Core Principle: Credit-Based System
To prevent unlimited usage that could lead to losses, we implement a credit-based system where each operation consumes a specific amount of credits.

## Credit Consumption Table

| Operation | Credits Required | Actual Cost | Cost Buffer |
|-----------|-----------------|-------------|-------------|
| Text Processing | 1 credit | $0.002 | 500% |
| YouTube Analysis | 2 credits | $0.01 | 200% |
| Image Generation | 5 credits | $0.04 | 125% |
| Video Generation | 50 credits | $0.50 | 100% |

## Subscription Tiers

### 1. Basic Tier - $29.99/month
- **Credits**: 100 credits
- **Typical Usage**: ~20 images OR 2 videos
- **Cost Breakdown**:
  - Server costs: $5
  - API costs: $10
  - Profit: $14.99 (50% margin)
- **Limitations**:
  - Max 10 API calls per hour
  - 1GB storage limit
  - 30-day file retention

### 2. Professional Tier - $79.99/month
- **Credits**: 300 credits
- **Typical Usage**: ~60 images OR 6 videos
- **Cost Breakdown**:
  - Server costs: $10
  - API costs: $30
  - Profit: $39.99 (50% margin)
- **Limitations**:
  - Max 20 API calls per hour
  - 5GB storage limit
  - 60-day file retention

### 3. Enterprise Tier - $199.99/month
- **Credits**: 800 credits
- **Typical Usage**: ~160 images OR 16 videos
- **Cost Breakdown**:
  - Server costs: $20
  - API costs: $80
  - Profit: $99.99 (50% margin)
- **Limitations**:
  - Max 50 API calls per hour
  - 20GB storage limit
  - 90-day file retention

## Additional Purchase Options

### Credit Packs (For exceeding monthly limits)
- 50 credits: $19.99
- 100 credits: $34.99
- 500 credits: $149.99

## Critical Implementation Rules

### 1. Hard Limits
- **Immediate Service Stop**: When credits reach 0
- **No Overages**: System must prevent any operation that would exceed credit balance
- **Pre-check Required**: Check credit balance BEFORE initiating any API call

### 2. Rate Limiting
- Implement per-hour API call limits based on tier
- Prevent burst usage that could overwhelm infrastructure
- Queue system for managing concurrent requests

### 3. Storage Management
- Enforce storage limits per tier
- Automatic cleanup of files older than retention period
- Warn users at 80% storage capacity

### 4. Cost Monitoring
- Real-time tracking of API costs per user
- Alert system for unusual usage patterns
- Monthly cost reports for business analysis

## Infrastructure Cost Considerations

### Cloud Run Costs
- Compute: $0.30/GB-hour + $0.10/vCPU-hour
- Estimated per active user: $5-15/month

### Storage Costs
- Google Cloud Storage: $0.02/GB/month
- CDN/Bandwidth: $0.08-0.23/GB

### Database Costs
- Firestore/Cloud SQL: Variable based on usage
- Estimated: $2-5 per user/month

## Safety Margins

1. **300% minimum margin** on all API operations
2. **50% minimum profit margin** on all subscription tiers
3. **Price adjustment capability** based on actual usage data

## Monitoring Requirements

### User-Level Metrics
- Credits consumed per day/week/month
- API calls per operation type
- Storage usage trends
- Cost per user calculation

### System-Level Metrics
- Total API costs vs revenue
- Infrastructure costs vs revenue
- Profit margin tracking
- Usage pattern analysis

## Future Adjustments

This pricing model should be reviewed monthly based on:
- Actual API cost data
- User usage patterns
- Infrastructure scaling needs
- Competitive market analysis

## Implementation Checklist

- [ ] Credit tracking system
- [ ] Usage limiter middleware
- [ ] Storage quota enforcement
- [ ] Rate limiting implementation
- [ ] Cost monitoring dashboard
- [ ] Billing integration
- [ ] User usage dashboard
- [ ] Admin analytics dashboard
- [ ] Automated cleanup jobs
- [ ] Credit purchase system

## Risk Mitigation

1. **API Price Increases**: 300% buffer provides protection
2. **Heavy Users**: Hard limits prevent losses
3. **Infrastructure Scaling**: Built into per-user cost model
4. **Abuse Prevention**: Rate limiting and monitoring

---

**Document Version**: 1.0
**Last Updated**: 2025-01-17
**Status**: APPROVED - Must be followed for all implementations
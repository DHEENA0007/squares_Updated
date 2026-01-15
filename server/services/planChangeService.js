const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');

class PlanChangeService {
  /**
   * Track plan changes and analyze impact on existing subscriptions
   */
  async analyzePlanChangeImpact(planId, changes) {
    try {
      const plan = await Plan.findById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Count active subscriptions using this plan
      const activeSubscriptions = await Subscription.countDocuments({
        plan: planId,
        status: 'active'
      });

      // Count pending subscriptions
      const pendingSubscriptions = await Subscription.countDocuments({
        plan: planId,
        status: 'pending'
      });

      const impact = {
        planName: plan.name,
        activeSubscriptions,
        pendingSubscriptions,
        totalAffected: activeSubscriptions + pendingSubscriptions,
        changes: [],
        affectsExistingUsers: false,
        affectsNewUsers: true
      };

      // Analyze specific changes
      if (changes.price !== undefined && changes.price !== plan.price) {
        impact.changes.push({
          field: 'price',
          oldValue: plan.price,
          newValue: changes.price,
          type: changes.price > plan.price ? 'increase' : 'decrease'
        });
      }

      if (changes.limits) {
        Object.keys(changes.limits).forEach(limitKey => {
          if (changes.limits[limitKey] !== plan.limits?.[limitKey]) {
            impact.changes.push({
              field: `limits.${limitKey}`,
              oldValue: plan.limits?.[limitKey],
              newValue: changes.limits[limitKey],
              type: 'limit_change'
            });
          }
        });
      }

      if (changes.features) {
        impact.changes.push({
          field: 'features',
          type: 'features_modified',
          note: 'Features have been modified'
        });
      }

      // Note: Existing subscriptions use snapshots, so they won't be affected
      impact.note = 'Existing subscriptions will continue with their original plan details. Only new subscriptions will get the updated plan.';

      return impact;
    } catch (error) {
      console.error('Error analyzing plan change impact:', error);
      throw error;
    }
  }

  /**
   * Get plan change history
   */
  async getPlanChangeHistory(planId) {
    try {
      const plan = await Plan.findById(planId)
        .populate('priceHistory.changedBy', 'email profile.firstName profile.lastName')
        .populate('featureHistory.changedBy', 'email profile.firstName profile.lastName');

      if (!plan) {
        throw new Error('Plan not found');
      }

      return {
        planName: plan.name,
        priceHistory: plan.priceHistory || [],
        featureHistory: plan.featureHistory || []
      };
    } catch (error) {
      console.error('Error getting plan change history:', error);
      throw error;
    }
  }

  /**
   * Get all subscriptions affected by a plan (using snapshot data)
   */
  async getAffectedSubscriptions(planId, status = 'active') {
    try {
      const subscriptions = await Subscription.find({
        plan: planId,
        status
      })
        .populate('user', 'email profile.firstName profile.lastName')
        .select('user status startDate endDate amount planSnapshot')
        .sort({ startDate: -1 });

      return subscriptions.map(sub => ({
        subscriptionId: sub._id,
        userId: sub.user._id,
        userEmail: sub.user.email,
        userName: `${sub.user.profile?.firstName || ''} ${sub.user.profile?.lastName || ''}`.trim(),
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        amount: sub.amount,
        planSnapshotExists: !!sub.planSnapshot,
        planSnapshot: sub.planSnapshot ? {
          name: sub.planSnapshot.name,
          price: sub.planSnapshot.price,
          limits: sub.planSnapshot.limits
        } : null
      }));
    } catch (error) {
      console.error('Error getting affected subscriptions:', error);
      throw error;
    }
  }

  /**
   * Validate plan changes before applying
   */
  async validatePlanChanges(planId, changes) {
    const validationErrors = [];
    const warnings = [];

    // Define allowed fields for plan updates
    const allowedFields = [
      'identifier', 'name', 'description', 'price', 'currency', 'billingPeriod', 
      'billingCycleMonths', 'features', 'limits', 'benefits', 'support', 
      'isActive', 'isPopular', 'sortOrder'
    ];

    // Filter out any unknown fields
    const filteredChanges = {};
    Object.keys(changes).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredChanges[key] = changes[key];
      } else {
        warnings.push(`Field '${key}' is not a valid plan field and will be ignored`);
      }
    });

    // Continue validation with filtered changes
    const changesToValidate = filteredChanges;

    // Validate price changes
    if (changesToValidate.price !== undefined) {
      if (changesToValidate.price < 0) {
        validationErrors.push('Price cannot be negative');
      }
      
      const plan = await Plan.findById(planId);
      if (plan && changesToValidate.price > plan.price * 2) {
        warnings.push('Price increase is more than 100%. This might affect new subscriptions.');
      }
    }

    // Validate limit changes
    if (changesToValidate.limits) {
      // Remove any invalid limit fields
      const validLimitFields = [
        'properties', 'featuredListings', 'photos', 'propertyImages', 'videoTours', 
        'videos', 'leads', 'messages', 'leadManagement'
      ];
      
      const filteredLimits = {};
      Object.keys(changesToValidate.limits).forEach(key => {
        if (validLimitFields.includes(key)) {
          filteredLimits[key] = changesToValidate.limits[key];
        } else {
          warnings.push(`Limit field '${key}' is not valid and will be ignored`);
        }
      });
      
      changesToValidate.limits = filteredLimits;

      if (changesToValidate.limits.properties !== undefined && changesToValidate.limits.properties < -1) {
        validationErrors.push('Property limit cannot be less than -1 (use -1 for unlimited)');
      }
      if (changesToValidate.limits.featuredListings !== undefined && changesToValidate.limits.featuredListings < 0) {
        validationErrors.push('Featured listings limit cannot be negative');
      }
      if (changesToValidate.limits.photos !== undefined && changesToValidate.limits.photos < 0) {
        validationErrors.push('Photos limit cannot be negative');
      }
      if (changesToValidate.limits.videoTours !== undefined && changesToValidate.limits.videoTours < 0) {
        validationErrors.push('Video tours limit cannot be negative');
      }
      if (changesToValidate.limits.leads !== undefined && changesToValidate.limits.leads < 0) {
        validationErrors.push('Leads limit cannot be negative');
      }
      if (changesToValidate.limits.videos !== undefined && changesToValidate.limits.videos < 0) {
        validationErrors.push('Videos limit cannot be negative');
      }
      if (changesToValidate.limits.messages !== undefined && changesToValidate.limits.messages < 0) {
        validationErrors.push('Messages limit cannot be negative');
      }
      if (changesToValidate.limits.leadManagement !== undefined) {
        const validValues = ['none', 'basic', 'advanced', 'premium', 'enterprise'];
        if (!validValues.includes(changesToValidate.limits.leadManagement)) {
          validationErrors.push('Lead management must be one of: ' + validValues.join(', '));
        }
      }
    }

    // Validate features changes
    if (changesToValidate.features !== undefined) {
      if (!Array.isArray(changesToValidate.features)) {
        validationErrors.push('Features must be an array');
      } else {
        const invalidFeature = changesToValidate.features.find(feature => 
          !feature.name || typeof feature.enabled !== 'boolean'
        );
        if (invalidFeature) {
          validationErrors.push('Features array contains invalid feature objects. Each feature must have name and enabled properties.');
        }
      }
    }

    // Validate benefits changes
    if (changesToValidate.benefits !== undefined) {
      if (Array.isArray(changesToValidate.benefits)) {
        // New array format validation
        const invalidBenefit = changesToValidate.benefits.find(benefit => 
          !benefit.key || !benefit.name || typeof benefit.enabled !== 'boolean'
        );
        if (invalidBenefit) {
          validationErrors.push('Benefits array contains invalid benefit objects. Each benefit must have key, name, and enabled properties.');
        }
      } else if (changesToValidate.benefits && typeof changesToValidate.benefits === 'object') {
        // Legacy object format validation
        const allowedKeys = ['topRated', 'verifiedBadge', 'marketingManager', 'commissionBased'];
        const invalidKey = Object.keys(changesToValidate.benefits).find(key => 
          !allowedKeys.includes(key) || typeof changesToValidate.benefits[key] !== 'boolean'
        );
        if (invalidKey) {
          validationErrors.push('Benefits object contains invalid keys or non-boolean values. Allowed keys: ' + allowedKeys.join(', '));
        }
      } else if (changesToValidate.benefits !== null) {
        validationErrors.push('Benefits must be either an array of benefit objects or legacy object format');
      }
    }

    // Validate text fields
    if (changesToValidate.name !== undefined && (!changesToValidate.name || changesToValidate.name.trim().length === 0)) {
      validationErrors.push('Plan name cannot be empty');
    }

    if (changesToValidate.description !== undefined && changesToValidate.description && changesToValidate.description.length > 1000) {
      validationErrors.push('Description cannot exceed 1000 characters');
    }

    // Validate support level
    if (changesToValidate.support !== undefined) {
      const validSupportLevels = ['none', 'email', 'priority', 'phone', 'dedicated'];
      if (!validSupportLevels.includes(changesToValidate.support)) {
        validationErrors.push('Support level must be one of: ' + validSupportLevels.join(', '));
      }
    }

    // Validate currency
    if (changesToValidate.currency !== undefined) {
      const validCurrencies = ['INR', 'USD', 'EUR', 'GBP'];
      if (!validCurrencies.includes(changesToValidate.currency)) {
        validationErrors.push('Currency must be one of: ' + validCurrencies.join(', '));
      }
    }

    // Validate billing period
    if (changesToValidate.billingPeriod !== undefined) {
      const validBillingPeriods = ['custom', 'monthly', 'yearly', 'lifetime', 'one-time'];
      if (!validBillingPeriods.includes(changesToValidate.billingPeriod)) {
        validationErrors.push('Billing period must be one of: ' + validBillingPeriods.join(', '));
      }
    }

    // Validate billing cycle months
    if (changesToValidate.billingCycleMonths !== undefined) {
      if (changesToValidate.billingCycleMonths < 1 || changesToValidate.billingCycleMonths > 120) {
        validationErrors.push('Billing cycle months must be between 1 and 120');
      }
    }

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
      warnings,
      filteredChanges: changesToValidate
    };
  }
}

module.exports = new PlanChangeService();

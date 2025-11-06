import { Property } from '@/services/propertyService';

/**
 * Checks if the property owner has role information populated
 * @param property - Property object
 * @returns boolean indicating if role data is available
 */
export const hasRoleData = (property: Property): boolean => {
  return !!(property.owner?.role);
};

/**
 * Gets the role-based display name for debugging purposes
 * @param property - Property object
 * @returns string with role and listing information
 */
export const getPropertyRoleInfo = (property: Property): string => {
  if (property.vendor?.name) {
    return `Vendor Property: ${property.vendor.name}`;
  }
  
  if (property.owner?.role) {
    return `${property.owner.role.toUpperCase()}: ${getOwnerDisplayName(property.owner)}`;
  }
  
  return `NO_ROLE_DATA: ${getOwnerDisplayName(property.owner)}`;
};

/**
 * Determines if a property owner is an admin user
 * @param owner - Property owner object
 * @returns boolean indicating if the owner is an admin
 */
export const isAdminUser = (owner: Property['owner'] | undefined): boolean => {
  if (!owner) return false;
  
  // Primary check: Use role-based check if available
  if (owner.role) {
    return owner.role === 'admin' || owner.role === 'superadmin';
  }
  
  // Fallback checks for cases where role is not populated
  // Check email patterns - only match actual admin emails, not all @ninetyneacres.com emails
  if (owner.email === "admin@ninetyneacres.com" || 
      owner.email?.startsWith("admin") && owner.email?.includes("@ninetyneacres.com")) {
    return true;
  }
  
  // Check profile name patterns (for legacy admin accounts)
  if (owner.profile?.firstName === "Super" && owner.profile?.lastName === "Admin") {
    return true;
  }
  
  // Check for other admin profile patterns
  if (owner.profile?.firstName?.toLowerCase().includes("admin") || 
      owner.profile?.lastName?.toLowerCase().includes("admin")) {
    return true;
  }
  
  return false;
};

/**
 * Gets the display name for a property owner based on their role
 * @param owner - Property owner object
 * @returns string - Display name based on role and profile
 */
export const getOwnerDisplayName = (owner: Property['owner'] | undefined): string => {
  if (!owner) return "Property Owner";
  
  // First check if this is an admin user (using both role and email/profile fallbacks)
  if (isAdminUser(owner)) {
    return "Squares";
  }
  
  // Handle different roles for non-admin users
  if (owner.role === 'agent') {
    // For agents, show their name
    if (owner.profile) {
      const fullName = `${owner.profile.firstName || 'N/A'} ${owner.profile.lastName || ''}`.trim();
      return fullName;
    }
    return "Agent";
  }
  
  // For customers and other roles, show their full name
  if (owner.profile) {
    return `${owner.profile.firstName || 'N/A'} ${owner.profile.lastName || ''}`.trim();
  }
  
  return "Property Owner";
};

/**
 * Gets the appropriate display name for a property based on whether it's a vendor property or not
 * @param property - Property object
 * @returns string - Display name (vendor name or owner display name)
 */
export const getPropertyOwnerDisplayName = (property: Property): string => {
  // Always prioritize vendor name if it exists
  if (property.vendor?.name) {
    return property.vendor.name;
  }
  
  // Check for custom client name in admin properties
  if (isAdminUser(property.owner) && (property as any).ownerType === 'client' && (property as any).clientName) {
    return (property as any).clientName;
  }
  
  // If no vendor, use owner display logic
  return getOwnerDisplayName(property.owner);
};

/**
 * Gets the listing display text for a property based on owner role
 * @param property - Property object
 * @returns string - Appropriate listing label based on who added the property
 */
export const getPropertyListingLabel = (property: Property): string => {
  if (property.vendor?.name) {
    // For vendor properties, always show the vendor name
    return `Vendor: ${property.vendor.name}`;
  }
  
  if (property.owner) {
    // Use role-based detection for admin users
    if (isAdminUser(property.owner)) {
      // Check if admin property has custom owner information
      if ((property as any).ownerType === 'client' && (property as any).clientName) {
        return `Owner: ${(property as any).clientName}`;
      } else {
        return "Listed by: Squares";
      }
    }
    
    if (property.owner.role === 'agent') {
      const agentName = getOwnerDisplayName(property.owner);
      return `Agent: ${agentName}`;
    }
    
    // For customers and other roles
    const ownerName = getOwnerDisplayName(property.owner);
    return `Owner: ${ownerName}`;
  }
  
  return "Property Owner";
};

/**
 * Gets contact information for a property based on owner role
 * @param property - Property object
 * @returns Contact information object
 */
export const getPropertyContactInfo = (property: Property) => {
  if (property.vendor?.name) {
    // For vendor properties, always show the vendor name
    return {
      name: property.vendor.name,
      type: "Vendor",
      phone: property.owner?.profile?.phone || "Not available",
      email: property.owner?.email || "Not available",
    };
  }
  
  if (property.owner?.profile) {
    let contactName = `${property.owner.profile.firstName} ${property.owner.profile.lastName}`;
    let contactType = "Owner";
    
    // Use role-based detection for admin users
    if (isAdminUser(property.owner)) {
      // Check if admin property has custom owner information
      if ((property as any).ownerType === 'client' && (property as any).clientName) {
        contactName = (property as any).clientName;
        contactType = "Property Owner";
      } else {
        contactName = "Squares";
        contactType = "Platform Admin";
      }
    } else if (property.owner.role === 'agent') {
      contactType = "Agent";
    }
    
    return {
      name: contactName,
      type: contactType,
      phone: property.owner.profile.phone || "Not available",
      email: property.owner.email || "Not available",
    };
  }
  
  return {
    name: "Property Owner",
    type: "Owner",
    phone: "Not available",
    email: "Not available",
  };
};

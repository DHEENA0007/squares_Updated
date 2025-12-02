/**
 * Vendor Messages Page
 * Uses unified BaseMessages component
 */

import { BaseMessages } from "@/components/messaging/BaseMessages";

const VendorMessages = () => {
  return (
    <BaseMessages
      role="vendor"
      pageTitle="Property Inquiries"
      pageDescription="Manage inquiries from potential customers"
      showPropertyInfo={true}
      enableDeletion={true}
    />
  );
};

export default VendorMessages;

/**
 * Admin Messages Page
 * Uses unified BaseMessages component
 */

import { BaseMessages } from "@/components/messaging/BaseMessages";

const Messages = () => {
  return (
    <BaseMessages
      role="admin"
      pageTitle="All Conversations"
      pageDescription="Monitor and manage all platform messages"
      showPropertyInfo={true}
      enableDeletion={true}
    />
  );
};

export default Messages;

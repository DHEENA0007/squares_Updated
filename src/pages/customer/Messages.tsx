/**
 * Customer Messages Page
 * Uses unified BaseMessages component
 */

import { BaseMessages } from "@/components/messaging/BaseMessages";

const Messages = () => {
  return (
    <BaseMessages
      role="customer"
      pageTitle="Messages"
      pageDescription="Communicate with property agents and owners"
      showPropertyInfo={true}
      enableDeletion={true}
    />
  );
};

export default Messages;

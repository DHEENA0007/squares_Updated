const RefundPolicy = () => {
  return (
    <>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          Refund & Cancellation Policy
        </h1>

        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Subscription Refund Policy
            </h2>
            <p className="text-muted-foreground mb-4">
              We offer a 7-day money-back guarantee on all subscription plans.
              If you're not satisfied with our service within the first 7 days
              of your subscription, you may request a full refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Cancellation Process
            </h2>
            <p className="text-muted-foreground mb-4">
              You may cancel your subscription at any time through your account
              settings. Upon cancellation:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                You will retain access to premium features until the end of your
                current billing period
              </li>
              <li>No further charges will be made to your account</li>
              <li>
                Your property listings will remain active until the subscription
                expires
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. Refund Eligibility
            </h2>
            <p className="text-muted-foreground mb-4">
              Refunds are available under the following conditions:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                Request made within 7 days of initial subscription purchase
              </li>
              <li>
                Technical issues that prevented service usage (verified by our
                support team)
              </li>
              <li>Duplicate payments or billing errors</li>
              <li>
                Service interruption exceeding 48 hours in a billing period
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              4. Non-Refundable Items
            </h2>
            <p className="text-muted-foreground mb-4">
              The following are not eligible for refunds:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Subscription renewals (after the 7-day guarantee period)</li>
              <li>One-time listing fees for featured properties</li>
              <li>Services already rendered or listings that have been live</li>
              <li>Partial month subscriptions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              5. Refund Processing Time
            </h2>
            <p className="text-muted-foreground mb-4">
              Once your refund request is approved, it will be processed within
              5-7 business days. The refund will be credited to your original
              payment method. Depending on your bank or payment provider, it may
              take an additional 3-5 business days to appear in your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. How to Request a Refund
            </h2>
            <p className="text-muted-foreground mb-4">
              To request a refund or cancel your subscription, please:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Contact our support team at refunds@BuildHomeMart.com</li>
              <li>Include your account email and subscription details</li>
              <li>Provide a brief reason for the refund request</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Contact Information
            </h2>
            <p className="text-muted-foreground">
              For any questions regarding refunds or cancellations, please reach
              out to us at support@BuildHomeMart.com or call +91 98765 43210.
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </>
  );
};

export default RefundPolicy;

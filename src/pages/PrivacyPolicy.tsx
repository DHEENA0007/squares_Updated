const PrivacyPolicy = () => {
  return (
    <>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Information We Collect
            </h2>
            <p className="text-muted-foreground mb-4">
              We collect information that you provide directly to us, including
              when you create an account, list a property, contact us, or use
              our services. This may include your name, email address, phone
              number, and property details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-muted-foreground mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze trends and usage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. Information Sharing
            </h2>
            <p className="text-muted-foreground mb-4">
              We do not share your personal information with third parties
              except as described in this policy. We may share information with
              service providers who perform services on our behalf, subject to
              confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement appropriate technical and organizational measures to
              protect your personal information against unauthorized or unlawful
              processing, accidental loss, destruction, or damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
            <p className="text-muted-foreground mb-4">
              You have the right to access, update, or delete your personal
              information at any time. You may also object to processing of your
              personal information or request that we restrict processing of
              your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please
              contact us at privacy@BuildHomeMart.com
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

export default PrivacyPolicy;

import Link from 'next/link';

function TermsOfServiePage() {
  return (
    <div className="container mx-auto flex max-w-2xl flex-1 flex-col py-6">
      <h1 className="text-center text-4xl text-primary-950 dark:text-primary-500">
        Terms of Service
      </h1>
      <p className="pb-3 text-center">
        October 21, 2023
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        Introduction
      </h2>
      <p className="pb-3 text-justify">
        Ei Noah is a service that provides a Discord bot, a website and a mobile
        app to Discord users. This service can be used to create and manage
        voice channels in Discord servers, manage roles and announce birthdays.
        This service is provided by BeBoRE. By using our service, you agree to
        these terms of service.
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        Definitions
      </h2>
      <p className=" pb-3 text-justify">
        &quot;Our service&quot; refers to the Ei Noah Discord bot, website and
        mobile app. &quot;We&quot;, &quot;us&quot; and &quot;our&quot; refers to
        the owner of the service. &quot;You&quot; and &quot;your&quot; refers to
        you, the user.
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        Using our service
      </h2>
      <p className=" pb-3 text-justify">
        You must be at least 13 years old to use our service. If you are under
        18 years old, you must have permission from your parent or legal
        guardian to use our service. By using our service, you confirm that you
        are at least 13 years old or have permission from your parent or legal
        guardian.
      </p>
      <p className=" pb-3 text-justify">
        You must follow the Discord Terms of Service and Community Guidelines
        when using our service. By using our service, you confirm that you
        follow the{' '}
        <Link
          className="text-primary-500 hover:underline"
          href="https://discord.com/terms/"
        >
          Discord Terms of Service and Community Guidelines
        </Link>
        .
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        Accessibility
      </h2>
      <p className=" pb-3 text-justify">
        We aim to make our service accessible to everyone. If you have any
        accessibility issues, please contact us. You can contact us by email at{' '}
        <a
          className="text-primary-500 hover:underline"
          href="mailto:ayrton@bebore.com"
        >
          ayrton@bebore.com
        </a>
        .
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">Privacy</h2>
      <p className=" pb-3 text-justify">
        We collect some data from you when you use our service. This data is
        stored securely on our servers and is not shared with any third parties.
        By using our service, you agree to our{' '}
        <Link className="text-primary-500 hover:underline" href="/privacy">
          Privacy Policy
        </Link>
        . Please read our Privacy Policy for more information.
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        User Acounts
      </h2>
      <p className=" pb-3 text-justify">
        Accounts are created automatically when you use our service. You
        don&apos;t need to provide any personal information to create an
        account. You can delete your account at any time by contacting us. We
        may delete your account if you have not used our service for an extended
        period of time.
      </p>
      <p className=" pb-3 text-justify">
        You are responsible for all activity that occurs under your account. You
        must not share your account with anyone else. You must notify us
        immediately if you become aware of any breach of security or
        unauthorized use of your account.
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        User Conduct
      </h2>
      <p className=" pb-3 text-justify">
        You must not use our service to do anything unlawful, misleading,
        malicious, or discriminatory. You must not do anything that could
        disable, overburden, or impair the proper working of our service.
      </p>
      <p className="w-full pb-3 text-justify">
        Examples of unacceptable behavior include:
      </p>
      <ul className="w-full list-inside list-disc pb-3">
        <li>Harassing or bullying other users</li>
        <li>Posting or sharing inappropriate content</li>
        <li>Impersonating others</li>
        <li>Spamming</li>
        <li>Scamming</li>
      </ul>
      <h2 className="text-center text-2xl dark:text-primary-300">
        Content and Ownership
      </h2>
      <p className=" pb-3 text-justify">
        Assets used in our service such as the Discord and Github logo are owned
        by their respective owners. You may not use any of our assets without
        our permission.
      </p>
      <p className=" pb-3 text-justify">
        The code used in our service is open-source, it&apos;s license can be
        found at our{' '}
        <Link
          className="text-primary-500 hover:underline"
          href="https://github.com/BeBoRE/ei-noah-bot/blob/master/LICENSE.md"
        >
          Github repository
        </Link>
        .
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        Changes to our service
      </h2>
      <p className=" pb-3 text-justify">
        We may update our service at any time. We may also change or remove
        features at any time. We will notify you of any major changes to our
        service.
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        Changes to these terms
      </h2>
      <p className=" pb-3 text-justify">
        We may update these terms at any time. We will notify you of any changes
        to these terms. By continuing to use our service, you agree to the
        updated terms. We can notify you of changes to these terms via Discord
        DM&aspos;s or email.
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        Termination and Suspension
      </h2>
      <p className=" pb-3 text-justify">
        We may terminate or suspend your account at any time without notice or
        liability.
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">Disclaimer</h2>
      <p className=" pb-3 text-justify">
        Our service is provided &quot;as is&quot; without any warranty of any
        kind. We are not responsible for any damages or losses related to your
        use of our service.
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        Limitation of Liability
      </h2>
      <p className=" pb-3 text-justify">
        We are not liable for any damages or losses related to your use of our
        service. We are not liable for any damages or losses related to any
        third-party services. You agree to indemnify us from any claims,
        damages, losses, or costs.
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        Governing Law
      </h2>
      <p className=" pb-3 text-justify">
        These terms are governed by the laws of the Netherlands. You agree to
        submit to the exclusive jurisdiction of the courts of the Netherlands.
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">Contact Us</h2>
      <p className=" pb-3 text-justify">
        If you have any questions about these terms, please contact us. You can
        contact us by email at{' '}
        <a
          className="text-primary-500 hover:underline"
          href="mailto:about@bebore.com"
        >
          about@bebore.com
        </a>
        .
      </p>
    </div>
  );
}

export default TermsOfServiePage;

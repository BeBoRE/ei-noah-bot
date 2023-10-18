function PrivacyPage() {
  return (
    <div className="container mx-auto flex flex-1 flex-col items-center py-6">
      <h1 className="pb-3 text-center text-4xl text-primary-950 dark:text-primary-500">
        Privacy Policy
      </h1>
      <h2 className="text-center text-2xl dark:text-primary-300">
        What data do we collect?
      </h2>
      <p className="max-w-2xl pb-3 text-justify">
        Ei Noah only collects data that is necessary for the functioning of our
        bot, website and mobile app. When you use our bot, we collect your
        Discord user ID, and the ID of servers you are using the bot in.
        Additional user information can be provided for additional
        functionality, such as your date of birth for birthday announcements.
        This information is stored and is only used for the purpose of providing
        the functionality of the bot, unless you have given us permission to use
        it for other purposes.
      </p>
      <p className="max-w-2xl pb-3 text-justify">
        Our website and mobile app use Discord authentication services to
        authenticate you. When you authenticate with Discord, you give us the
        permission to receive your Discord user ID, username, discriminator and
        avatar from the Discord API. Only your Discord ID is stored and is used
        to identify you when you use our website or mobile app. Your username,
        discriminator and avatar are not stored and are only used to display
        your profile on our website and mobile app. To revoke our access to your
        Discord information, you can log-out of our website.
      </p>
      <p className="max-w-2xl pb-3 text-justify">
        When using our mobile app, we also collect a token that is used to send
        push notifications to your device. This token is stored and is only used
        for the purpose of sending push notifications to your device.
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        What do we do with your data?
      </h2>
      <p className="max-w-2xl pb-3 text-justify">
        We use your data to provide the functionality of our bot, website and
        mobile app. We do not sell nor share your data to third parties. We do
        not use your data for any other purposes than to provide the
        functionality of our bot, website and mobile app, unless you have
        explicitly given us permission to do so.
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        I want to have my data removed
      </h2>
      <p className="max-w-2xl pb-3 text-justify">
        You can request to have your data removed by contacting us at{' '}
        <a href="mailto:privacy@bebore.com">privacy@bebore.com</a>. We will
        remove your data within 30 days of your request.
      </p>
      <p className="max-w-2xl pb-3 text-justify">
        Most personal data, such as your date of birth, can be removed by the
        use of slash commands. To remove your date of birth you can use the
        command{' '}
        <code className="rounded-md bg-primary-100 p-1 dark:bg-primary-900">
          /birthday set remove
        </code>
        .
      </p>
      <h2 className="text-center text-2xl dark:text-primary-300">
        Further questions?
      </h2>
      <p className="max-w-2xl pb-3 text-justify">
        If you have any further questions, please contact us at{' '}
        <a href="mailto:privacy@bebore.com">privacy@bebore.com</a>.
      </p>
    </div>
  );
}

export default PrivacyPage;

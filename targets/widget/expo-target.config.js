/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "widget",
  name: "LoggerWidget",
  icon: "../../assets/icon.png",
  deploymentTarget: "17.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.logger.app"],
  },
};

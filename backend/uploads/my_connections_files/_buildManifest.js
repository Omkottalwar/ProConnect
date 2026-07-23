self.__BUILD_MANIFEST = {
  "/dashboard": [
    "static/chunks/pages/dashboard.js"
  ],
  "/discover": [
    "static/chunks/pages/discover.js"
  ],
  "/login": [
    "static/chunks/pages/login.js"
  ],
  "/my_connections": [
    "static/chunks/pages/my_connections.js"
  ],
  "/view_profile/[username]": [
    "static/chunks/pages/view_profile/[username].js"
  ],
  "__rewrites": {
    "afterFiles": [],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/",
    "/ForgotPassword",
    "/ResetPassword/[token]",
    "/_app",
    "/_error",
    "/api/hello",
    "/blog",
    "/dashboard",
    "/discover",
    "/login",
    "/my_connections",
    "/profile",
    "/view_profile/[username]"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()
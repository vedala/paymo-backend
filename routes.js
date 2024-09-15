import authorize from "./authorization.js";

const routes = (router, { getWelcome, getBanks, createLinkToken }) => {
  router.get("/", getWelcome);
  router.get("/banks", authorize, getBanks);
  router.get("/api/create_link_token", createLinkToken);
}

export default routes;

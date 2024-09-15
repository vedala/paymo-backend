import authorize from "./authorization.js";

const routes = (router, { getWelcome, getBanks, createLinkToken, exchangePublicToken }) => {
  router.get("/", getWelcome);
  router.get("/banks", authorize, getBanks);
  router.get("/api/create_link_token", createLinkToken);
  router.post("/api/exhange_public_token", exchangePublicToken);
}

export default routes;

import authorize from "./authorization.js";

const routes = (router, { getWelcome, getBanks, getRecipients, getUserByEmail, createLinkToken, exchangePublicToken }) => {
  router.get("/", getWelcome);
  router.get("/banks", authorize, getBanks);
  router.get("/recipients", authorize, getRecipients);
  router.get("/get_user_by_email", authorize, getUserByEmail)
  router.get("/api/create_link_token", createLinkToken);
  router.post("/api/exchange_public_token", exchangePublicToken);
}

export default routes;

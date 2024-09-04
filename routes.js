import authorize from "./authorization.js";

const routes = (router, { getWelcome, getBanks }) => {
  router.get("/", getWelcome);
  router.get("/banks", authorize, getBanks);
}

export default routes;

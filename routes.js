const routes = (router, { getWelcome }) => {
  router.get("/", getWelcome);
}

export default routes;

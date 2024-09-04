const getWelcome = async (req, res) => {
  res.send("Welcome to Paymo!");
}

const getBanks = async (req, res) => {
  res.send(JSON.stringify([{id: 100, name: "Bank 100"}, {id: 200, name: "Bank 200"}]));
}

export { getWelcome, getBanks };

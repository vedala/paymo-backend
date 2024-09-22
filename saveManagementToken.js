import getKnexObj from "./getKnexObj.js";

const knex = getKnexObj();

const MANAGEMENT_ACCESS_TOKEN_TABLE_NAME = "management_access_token";

const saveManagementToken= async (token) => {
  const queryResult = await knex(MANAGEMENT_ACCESS_TOKEN_TABLE_NAME).count('access_token as row_count').first()
    .catch((err) => { console.error(err); throw err; });

  const tokenInfo = {
    access_token: token
  };

  const rowCount = queryResult.row_count;
  if (rowCount === 0) {
    // Insert

    await knex(MANAGEMENT_ACCESS_TOKEN_TABLE_NAME).insert(tokenInfo)
      .catch((err) => { console.error(err); throw err; });
  } else {
    // Update

    await knex(MANAGEMENT_ACCESS_TOKEN_TABLE_NAME).update(tokenInfo)
      .catch((err) => { console.error(err); throw err; });
  }
}

export default saveManagementToken;
